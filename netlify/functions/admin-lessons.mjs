import { requireSession } from '../lib/auth.mjs';
import { jsonResponse, methodNotAllowed, originAllowed, readJson } from '../lib/http.mjs';
import { getLessons, listPublicPdfs } from '../lib/pdf-catalog.mjs';
import { contentStore } from '../lib/storage.mjs';

const validLessonId = id => /^[a-z0-9-]{1,40}$/.test(id);

function validateLessons(lessons, pdfIds) {
  if (!Array.isArray(lessons) || lessons.length > 100) return false;

  const ids = new Set();
  return lessons.every(lesson => {
    if (
      !lesson || typeof lesson !== 'object' ||
      typeof lesson.id !== 'string' || !validLessonId(lesson.id) || ids.has(lesson.id) ||
      typeof lesson.title !== 'string' || !lesson.title.trim() || lesson.title.trim().length > 100 ||
      !Array.isArray(lesson.topics) || lesson.topics.length > 20 ||
      !lesson.topics.every(topic => typeof topic === 'string' && topic.trim() && topic.trim().length <= 120) ||
      typeof lesson.pdfId !== 'string' || !pdfIds.has(lesson.pdfId)
    ) return false;

    ids.add(lesson.id);
    return true;
  });
}

export default async function handler(request) {
  const authError = requireSession(request, process.env);
  if (authError) return authError;

  const store = contentStore();
  if (request.method === 'GET') {
    try {
      const [lessons, pdfs] = await Promise.all([getLessons(store), listPublicPdfs(store)]);
      return jsonResponse({ lessons, pdfs });
    } catch (error) {
      console.error('Could not load admin lessons:', error.message);
      return jsonResponse({ error: 'Could not load lessons.' }, 503);
    }
  }

  if (request.method === 'PUT') {
    if (!originAllowed(request)) return jsonResponse({ error: 'Origin not allowed.' }, 403);
    const data = await readJson(request, 256 * 1024);
    if (!data) return jsonResponse({ error: 'A valid lesson list is required.' }, 400);

    try {
      const pdfs = await listPublicPdfs(store);
      if (!validateLessons(data.lessons, new Set(pdfs.map(pdf => pdf.id)))) {
        return jsonResponse({ error: 'The lesson list contains invalid titles, topics, IDs, or PDF selections.' }, 400);
      }

      const lessons = data.lessons.map(lesson => ({
        id: lesson.id,
        title: lesson.title.trim(),
        topics: lesson.topics.map(topic => topic.trim()),
        pdfId: lesson.pdfId
      }));

      await store.set('site/lessons', JSON.stringify(lessons));
      return jsonResponse({ ok: true, lessons });
    } catch (error) {
      console.error('Could not save lessons:', error.message);
      return jsonResponse({ error: 'Could not save lessons.' }, 503);
    }
  }

  return methodNotAllowed(['GET', 'PUT']);
}
