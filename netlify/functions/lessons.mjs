import { jsonResponse, methodNotAllowed } from '../lib/http.mjs';
import { getLessons, listPublicPdfs } from '../lib/pdf-catalog.mjs';
import { contentStore } from '../lib/storage.mjs';

export default async function handler(request) {
  if (request.method !== 'GET') return methodNotAllowed(['GET']);

  try {
    const store = contentStore();
    const [lessons, pdfs] = await Promise.all([getLessons(store), listPublicPdfs(store)]);
    const pdfById = new Map(pdfs.map(pdf => [pdf.id, pdf]));
    return jsonResponse({
      lessons: lessons.map(lesson => ({
        ...lesson,
        pdfUrl: pdfById.get(lesson.pdfId)?.url || ''
      }))
    });
  } catch (error) {
    console.error('Could not load lessons:', error.message);
    return jsonResponse({ error: 'Could not load lessons.' }, 503);
  }
}
