import { requireSession } from '../lib/auth.mjs';
import { jsonResponse, methodNotAllowed, originAllowed, readJson } from '../lib/http.mjs';
import { contentStore, getJson, listRecords } from '../lib/storage.mjs';

const statuses = new Set(['new', 'reviewing', 'planned', 'declined']);

export default async function handler(request) {
  const authError = requireSession(request, process.env);
  if (authError) return authError;

  const store = contentStore();
  if (request.method === 'GET') {
    try {
      const blobs = await listRecords(store, 'suggestions/');
      const suggestions = (await Promise.all(blobs.map(blob => getJson(store, blob.key))))
        .filter(Boolean)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 200);
      return jsonResponse({ suggestions });
    } catch (error) {
      console.error('Could not load suggestions from Netlify Blobs:', error.message);
      return jsonResponse({ error: 'Could not load suggestions.' }, 503);
    }
  }

  if (request.method === 'PATCH') {
    if (!originAllowed(request)) return jsonResponse({ error: 'Origin not allowed.' }, 403);
    const data = await readJson(request);
    if (!data || typeof data.id !== 'string' || data.id.length > 64 || !statuses.has(data.status)) {
      return jsonResponse({ error: 'A valid suggestion ID and status are required.' }, 400);
    }

    try {
      const key = `suggestions/${data.id}`;
      const suggestion = await getJson(store, key);
      if (!suggestion) return jsonResponse({ error: 'Suggestion not found.' }, 404);
      suggestion.status = data.status;
      await store.set(key, JSON.stringify(suggestion));
      return jsonResponse({ ok: true });
    } catch (error) {
      console.error('Could not update suggestion:', error.message);
      return jsonResponse({ error: 'Could not update suggestion.' }, 503);
    }
  }

  if (request.method === 'DELETE') {
    if (!originAllowed(request)) return jsonResponse({ error: 'Origin not allowed.' }, 403);
    const id = new URL(request.url).searchParams.get('id');
    if (!id || id.length > 64 || !/^[0-9a-f-]+$/i.test(id)) {
      return jsonResponse({ error: 'A valid suggestion ID is required.' }, 400);
    }

    try {
      const key = `suggestions/${id}`;
      if (!await getJson(store, key)) return jsonResponse({ error: 'Suggestion not found.' }, 404);
      await store.delete(key);
      return jsonResponse({ ok: true });
    } catch (error) {
      console.error('Could not delete suggestion:', error.message);
      return jsonResponse({ error: 'Could not delete suggestion.' }, 503);
    }
  }

  return methodNotAllowed(['GET', 'PATCH', 'DELETE']);
}
