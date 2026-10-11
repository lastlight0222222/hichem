import { jsonResponse, methodNotAllowed } from '../lib/http.mjs';
import { contentStore, getJson } from '../lib/storage.mjs';

export default async function handler(request) {
  if (request.method !== 'GET') return methodNotAllowed(['GET']);
  const id = new URL(request.url).searchParams.get('id') || '';
  if (!/^[0-9a-f-]{36}$/i.test(id)) return jsonResponse({ error: 'PDF not found.' }, 404);

  try {
    const store = contentStore();
    const pdf = await getJson(store, `pdfs/${id}/metadata`);
    if (!pdf) return jsonResponse({ error: 'PDF not found.' }, 404);
    const contents = await store.get(`pdfs/${id}/file`, { type: 'arrayBuffer' });
    if (!contents) {
      console.error(`PDF object is missing for resource ${id}.`);
      return jsonResponse({ error: 'PDF file is unavailable.' }, 503);
    }

    return new Response(contents, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': String(contents.byteLength),
        'Content-Disposition': 'inline; filename="document.pdf"',
        'Cache-Control': 'public, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': 'sandbox'
      }
    });
  } catch (error) {
    console.error('Could not load PDF file from Netlify Blobs:', error.message);
    return jsonResponse({ error: 'Could not load PDF file.' }, 503);
  }
}
