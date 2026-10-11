import { contentStore, getJson, listRecords } from '../lib/storage.mjs';
import { jsonResponse, methodNotAllowed, originAllowed, readJson } from '../lib/http.mjs';

export default async function handler(request) {
  if (request.method !== 'POST') return methodNotAllowed(['POST']);
  if (!originAllowed(request)) return jsonResponse({ error: 'Origin not allowed.' }, 403);
  if (request.headers.get('Content-Type')?.split(';')[0] !== 'application/json') {
    return jsonResponse({ error: 'Content-Type must be application/json.' }, 415);
  }

  const data = await readJson(request);
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return jsonResponse({ error: 'Request body must contain a suggestion object.' }, 400);
  }

  const subject = typeof data.subject === 'string' ? data.subject.trim() : '';
  const topic = typeof data.topic === 'string' ? data.topic.trim() : '';
  const details = typeof data.details === 'string' ? data.details.trim() : '';
  if (!subject || subject.length > 80 || !topic || topic.length > 120 || details.length > 500) {
    return jsonResponse({ error: 'Please provide a valid subject and topic.' }, 400);
  }

  const store = contentStore();
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const suggestion = {
    id,
    subject,
    topic,
    details,
    status: 'new',
    notification_status: 'pending',
    created_at: createdAt
  };

  try {
    await store.set(`suggestions/${id}`, JSON.stringify(suggestion));
  } catch (error) {
    console.error('Could not save suggestion to Netlify Blobs:', error.message);
    return jsonResponse({ error: 'Could not save your suggestion. Please try again.' }, 503);
  }

  let notificationSent = false;
  const webhookValue = process.env.DISCORD_WEBHOOK_URL;

  if (webhookValue) {
    try {
      const webhookUrl = new URL(webhookValue);
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
        body: JSON.stringify({ content: message, allowed_mentions: { parse: [] } }),
        signal: AbortSignal.timeout(10000)
      });
      if (!response.ok) throw new Error(`Discord webhook returned HTTP ${response.status}.`);
      notificationSent = true;
    } catch (error) {
      console.error('Discord suggestion notification failed:', error.message);
    }
  } else {
    console.error('DISCORD_WEBHOOK_URL is not configured; suggestion was saved without a Discord notification.');
  }

  suggestion.notification_status = notificationSent ? 'sent' : 'failed';
  try {
    await store.set(`suggestions/${id}`, JSON.stringify(suggestion));
  } catch (error) {
    console.error('Could not update suggestion notification status:', error.message);
  }

  return jsonResponse({ ok: true, notificationSent }, notificationSent ? 201 : 202);
}
