import { jsonResponse, methodNotAllowed } from '../lib/http.mjs';
import { listPublicPdfs } from '../lib/pdf-catalog.mjs';
import { contentStore } from '../lib/storage.mjs';

export default async function handler(request) {
  if (request.method !== 'GET') return methodNotAllowed(['GET']);
  try {
    const pdfs = await listPublicPdfs(contentStore());
    return jsonResponse({ pdfs });
  } catch (error) {
    console.error('Could not load published PDFs:', error.message);
    return jsonResponse({ error: 'Could not load published PDFs.' }, 503);
  }
}
