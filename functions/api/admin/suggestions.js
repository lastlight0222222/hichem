import { requireAccess } from '../../_lib/access.js';
import { jsonResponse } from '../../_lib/response.js';

const suggestionStatuses = new Set(['new', 'reviewing', 'planned', 'declined']);

export async function onRequestGet({ request, env }) {
  if (!await requireAccess(request, env)) {
    return jsonResponse({ error: 'Cloudflare Access authentication required.' }, 401);
  }

  if (!env.DB) {
    return jsonResponse({ error: 'Suggestion storage is not configured.' }, 503);
  }

  try {
    const result = await env.DB.prepare(
      `SELECT id, subject, topic, details, status, notification_status, created_at
       FROM suggestions ORDER BY created_at DESC LIMIT 200`
    ).all();

    return jsonResponse({ suggestions: result.results });
  } catch (error) {
    console.error('Could not load suggestions:', error.message);
    return jsonResponse({ error: 'Could not load suggestions.' }, 503);
  }
}

export async function onRequestPatch({ request, env }) {
  if (!await requireAccess(request, env)) {
    return jsonResponse({ error: 'Cloudflare Access authentication required.' }, 401);
  }

  if (request.headers.get('Origin') !== new URL(request.url).origin) {
    return jsonResponse({ error: 'Origin not allowed.' }, 403);
  }

  let data;

  try {
    data = await request.json();
  } catch {
    return jsonResponse({ error: 'Request body must be valid JSON.' }, 400);
  }

  if (
    !data ||
    typeof data.id !== 'string' ||
    data.id.length > 64 ||
    !suggestionStatuses.has(data.status)
  ) {
    return jsonResponse({ error: 'A valid suggestion ID and status are required.' }, 400);
  }

  try {
    const result = await env.DB.prepare(
      'UPDATE suggestions SET status = ? WHERE id = ?'
    ).bind(data.status, data.id).run();

    if (result.meta.changes === 0) {
      return jsonResponse({ error: 'Suggestion not found.' }, 404);
    }

    return jsonResponse({ ok: true });
  } catch (error) {
    console.error('Could not update suggestion:', error.message);
    return jsonResponse({ error: 'Could not update suggestion.' }, 503);
  }
}

export async function onRequestDelete({ request, env }) {
  if (!await requireAccess(request, env)) {
    return jsonResponse({ error: 'Cloudflare Access authentication required.' }, 401);
  }

  if (request.headers.get('Origin') !== new URL(request.url).origin) {
    return jsonResponse({ error: 'Origin not allowed.' }, 403);
  }

  const id = new URL(request.url).searchParams.get('id');

  if (!id || id.length > 64) {
    return jsonResponse({ error: 'A valid suggestion ID is required.' }, 400);
  }

  try {
    const result = await env.DB.prepare('DELETE FROM suggestions WHERE id = ?').bind(id).run();

    if (result.meta.changes === 0) {
      return jsonResponse({ error: 'Suggestion not found.' }, 404);
    }

    return jsonResponse({ ok: true });
  } catch (error) {
    console.error('Could not delete suggestion:', error.message);
    return jsonResponse({ error: 'Could not delete suggestion.' }, 503);
  }
}
