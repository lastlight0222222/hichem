import { requireSession } from '../lib/auth.mjs';
import { jsonResponse, methodNotAllowed, originAllowed } from '../lib/http.mjs';
import { contentStore, getJson, listRecords } from '../lib/storage.mjs';

const maxPdfBytes = 4 * 1024 * 1024;
const validPdfId = id => /^[0-9a-f-]{36}$/i.test(id);

export default async function handler(request) {
  const authError = requireSession(request, process.env);
  if (authError) return authError;

  const store = contentStore();
  if (request.method === 'GET') {
    try {
      const blobs = await listRecords(store, 'pdfs/');
      const pdfs = (await Promise.all(
        blobs.filter(blob => blob.key.endsWith('/metadata')).map(blob => getJson(store, blob.key))
      ))
        .filter(Boolean)
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
      return jsonResponse({ pdfs });
    } catch (error) {
      console.error('Could not load admin PDF list:', error.message);
      return jsonResponse({ error: 'Could not load published PDFs.' }, 503);
    }
  }

  if (request.method === 'POST') {
    if (!originAllowed(request)) return jsonResponse({ error: 'Origin not allowed.' }, 403);
    if (request.headers.get('Content-Type')?.split(';')[0] !== 'multipart/form-data') {
      return jsonResponse({ error: 'Upload must use multipart form data.' }, 415);
    }

    const contentLength = Number(request.headers.get('Content-Length') || 0);
    if (contentLength > maxPdfBytes + 64 * 1024) {
      return jsonResponse({ error: 'PDF exceeds the 4 MB upload limit.' }, 413);
    }

    let form;
    try {
      form = await request.formData();
    } catch {
      return jsonResponse({ error: 'Could not read the uploaded form.' }, 400);
    }

    const title = typeof form.get('title') === 'string' ? form.get('title').trim() : '';
    const subject = typeof form.get('subject') === 'string' ? form.get('subject').trim() : '';
    const description = typeof form.get('description') === 'string' ? form.get('description').trim() : '';
    const file = form.get('file');
    if (
      !title || title.length > 100 || !subject || subject.length > 80 ||
      description.length > 240 || !(file instanceof File) || file.size === 0 ||
      file.size > maxPdfBytes
    ) {
      return jsonResponse({ error: 'Enter a title and subject, and choose a PDF no larger than 4 MB.' }, 400);
    }
    if (file.type !== 'application/pdf' || !file.name.toLowerCase().endsWith('.pdf')) {
      return jsonResponse({ error: 'Only PDF files are accepted.' }, 415);
    }

    let contents;
    try {
      contents = await file.arrayBuffer();
    } catch (error) {
      console.error('Could not read uploaded PDF:', error.message);
      return jsonResponse({ error: 'Could not read the PDF file.' }, 400);
    }
    if (new TextDecoder().decode(contents.slice(0, 5)) !== '%PDF-') {
      return jsonResponse({ error: 'The selected file does not contain a valid PDF header.' }, 415);
    }

    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const pdf = { id, title, subject, description, created_at: createdAt };
    const fileKey = `pdfs/${id}/file`;
    const metadataKey = `pdfs/${id}/metadata`;

    try {
      await store.set(fileKey, contents, { metadata: { contentType: 'application/pdf' } });
      await store.set(metadataKey, JSON.stringify(pdf));
    } catch (error) {
      console.error('Could not save PDF to Netlify Blobs:', error.message);
      try {
        await store.delete(fileKey);
        await store.delete(metadataKey);
      } catch (cleanupError) {
        console.error('Could not clean up incomplete PDF upload:', cleanupError.message);
      }
      return jsonResponse({ error: 'Could not publish the PDF.' }, 503);
    }

    return jsonResponse({ ok: true, pdf }, 201);
  }

  if (request.method === 'DELETE') {
    if (!originAllowed(request)) return jsonResponse({ error: 'Origin not allowed.' }, 403);
    const id = new URL(request.url).searchParams.get('id');
    if (!id || !validPdfId(id)) return jsonResponse({ error: 'A valid PDF ID is required.' }, 400);

    const metadataKey = `pdfs/${id}/metadata`;
    const fileKey = `pdfs/${id}/file`;
    try {
      if (!await getJson(store, metadataKey)) return jsonResponse({ error: 'PDF not found.' }, 404);
      await store.delete(metadataKey);
      try {
        await store.delete(fileKey);
      } catch (error) {
        console.error(`PDF resource ${id} was unpublished but its blob could not be deleted:`, error.message);
        return jsonResponse({ ok: true, storageCleanupPending: true });
      }
      return jsonResponse({ ok: true });
    } catch (error) {
      console.error('Could not delete PDF resource:', error.message);
      return jsonResponse({ error: 'Could not delete PDF resource.' }, 503);
    }
  }

  return methodNotAllowed(['GET', 'POST', 'DELETE']);
}
