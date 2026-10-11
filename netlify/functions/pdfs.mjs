import { jsonResponse, methodNotAllowed } from '../lib/http.mjs';
import { contentStore, getJson, listRecords } from '../lib/storage.mjs';

export default async function handler(request) {
  if (request.method !== 'GET') return methodNotAllowed(['GET']);
  try {
    const store = contentStore();
    const blobs = await listRecords(store, 'pdfs/');
    const pdfs = (await Promise.all(
      blobs.filter(blob => blob.key.endsWith('/metadata')).map(blob => getJson(store, blob.key))
    ))
      .filter(Boolean)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map(pdf => ({
        ...pdf,
        url: `/api/pdfs/${encodeURIComponent(pdf.id)}`
      }));
    return jsonResponse({ pdfs });
  } catch (error) {
    console.error('Could not load published PDFs:', error.message);
    return jsonResponse({ error: 'Could not load published PDFs.' }, 503);
  }
}
