import { jsonResponse } from '../_lib/response.js';

const maxBodyBytes = 8192;

async function readSuggestion(request) {
  const contentLength = Number(request.headers.get('Content-Length') || 0);

  if (contentLength > maxBodyBytes) {
    return null;
  }

  if (!request.body) {
    return null;
  }

  const reader = request.body.getReader();
  const chunks = [];
  let bodyBytes = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    bodyBytes += value.byteLength;

    if (bodyBytes > maxBodyBytes) {
      await reader.cancel();
      return null;
    }

    chunks.push(value);
  }

  const body = new Uint8Array(bodyBytes);
  let offset = 0;

  chunks.forEach((chunk) => {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  });

  return JSON.parse(new TextDecoder().decode(body));
}

export async function onRequestPost({ request, env }) {
  if (request.headers.get('Origin') !== new URL(request.url).origin) {
    return jsonResponse({ error: 'Origin not allowed.' }, 403);
  }

  if (request.headers.get('Content-Type')?.split(';')[0] !== 'application/json') {
    return jsonResponse({ error: 'Content-Type must be application/json.' }, 415);
  }

  let data;

  try {
    data = await readSuggestion(request);
  } catch {
    return jsonResponse({ error: 'Request body must be valid JSON.' }, 400);
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return jsonResponse({ error: 'Request body must contain a suggestion object.' }, 400);
  }

  const subject = typeof data.subject === 'string' ? data.subject.trim() : '';
  const topic = typeof data.topic === 'string' ? data.topic.trim() : '';
  const details = typeof data.details === 'string' ? data.details.trim() : '';

  if (!subject || subject.length > 80 || !topic || topic.length > 120 || details.length > 500) {
    return jsonResponse({ error: 'Please provide a valid subject and topic.' }, 400);
  }

  if (!env.DB || !env.DISCORD_WEBHOOK_URL) {
    console.error('Suggestion handling is missing its D1 or Discord webhook binding.');
    return jsonResponse({ error: 'The suggestion service is not configured.' }, 503);
  }

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  try {
    await env.DB.prepare(
      `INSERT INTO suggestions (id, subject, topic, details, status, notification_status, created_at)
       VALUES (?, ?, ?, ?, 'new', 'pending', ?)`
    ).bind(id, subject, topic, details, createdAt).run();
  } catch (error) {
    console.error('Could not save suggestion:', error.message);
    return jsonResponse({ error: 'Could not save your suggestion. Please try again.' }, 503);
  }

  let notificationSent = false;

  try {
    const webhookUrl = new URL(env.DISCORD_WEBHOOK_URL);
    const validHost = webhookUrl.hostname === 'discord.com' || webhookUrl.hostname === 'discordapp.com';

    if (webhookUrl.protocol !== 'https:' || !validHost || !webhookUrl.pathname.startsWith('/api/webhooks/')) {
      throw new Error('Configured Discord webhook URL is invalid.');
    }

    const message = [
      '**Nouvelle suggestion pour le site**',
      `**Matière :** ${subject}`,
      `**Sujet :** ${topic}`,
      `**Détail :** ${details || 'Aucun détail fourni.'}`
    ].join('\n');

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: message,
        allowed_mentions: { parse: [] }
      }),
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      throw new Error(`Discord webhook returned HTTP ${response.status}.`);
    }

    notificationSent = true;
  } catch (error) {
    console.error('Discord suggestion notification failed:', error.message);
  }

  try {
    await env.DB.prepare(
      'UPDATE suggestions SET notification_status = ? WHERE id = ?'
    ).bind(notificationSent ? 'sent' : 'failed', id).run();
  } catch (error) {
    console.error('Could not update suggestion notification status:', error.message);
  }

  return jsonResponse({ ok: true, notificationSent }, notificationSent ? 201 : 202);
}
