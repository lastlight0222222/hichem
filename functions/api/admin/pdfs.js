import { requireAccess } from '../../_lib/access.js';
import { jsonResponse } from '../../_lib/response.js';

const maxPdfBytes = 25 * 1024 * 1024;
const maxRequestBytes = maxPdfBytes + 128 * 1024;

function validPdfId(id) {
  return /^[0-9a-f-]{36}$/i.test(id);
}

async function readBoundedBody(request) {
  if (!request.body) {
    return null;
  }

  const reader = request.body.getReader();
  const chunks = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    totalBytes += value.byteLength;

    if (totalBytes > maxRequestBytes) {
      await reader.cancel();
      return null;
    }

    chunks.push(value);
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;

  chunks.forEach((chunk) => {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  });

  return body;
}

export async function onRequestGet({ request, env }) {
  if (!await requireAccess(request, env)) {
    return jsonResponse({ error: 'Cloudflare Access authentication required.' }, 401);
  }

  if (!env.DB) {
    return jsonResponse({ error: 'PDF storage is not configured.' }, 503);
  }

  try {
    const result = await env.DB.prepare(
      'SELECT id, title, subject, description, created_at FROM pdf_resources ORDER BY created_at DESC'
    ).all();

    return jsonResponse({ pdfs: result.results });
  } catch (error) {
    console.error('Could not load admin PDF list:', error.message);
    return jsonResponse({ error: 'Could not load published PDFs.' }, 503);
  }
}

export async function onRequestPost({ request, env }) {
  if (!await requireAccess(request, env)) {
    return jsonResponse({ error: 'Cloudflare Access authentication required.' }, 401);
  }

  if (request.headers.get('Origin') !== new URL(request.url).origin) {
    return jsonResponse({ error: 'Origin not allowed.' }, 403);
  }

  if (request.headers.get('Content-Type')?.split(';')[0] !== 'multipart/form-data') {
    return jsonResponse({ error: 'Upload must use multipart form data.' }, 415);
  }

  const contentLength = Number(request.headers.get('Content-Length') || 0);

  if (contentLength > maxRequestBytes) {
    return jsonResponse({ error: 'PDF exceeds the 25 MB upload limit.' }, 413);
  }

  let body;

  try {
    body = await readBoundedBody(request);
  } catch (error) {
    console.error('Could not read PDF upload request:', error.message);
    return jsonResponse({ error: 'Could not read the uploaded form.' }, 400);
  }

  if (!body) {
    return jsonResponse({ error: 'PDF exceeds the 25 MB upload limit or the request body is empty.' }, 413);
  }

  if (!env.DB || !env.PDF_BUCKET) {
    return jsonResponse({ error: 'PDF storage is not configured.' }, 503);
  }

  let form;

  try {
    form = await new Request(request.url, {
      method: 'POST',
      headers: request.headers,
      body
    }).formData();
  } catch {
    return jsonResponse({ error: 'Could not read the uploaded form.' }, 400);
  }

  const title = typeof form.get('title') === 'string' ? form.get('title').trim() : '';
  const subject = typeof form.get('subject') === 'string' ? form.get('subject').trim() : '';
  const description = typeof form.get('description') === 'string' ? form.get('description').trim() : '';
  const file = form.get('file');

  if (
    !title ||
    title.length > 100 ||
    !subject ||
    subject.length > 80 ||
    description.length > 240 ||
    !(file instanceof File) ||
    file.size === 0 ||
    file.size > maxPdfBytes
  ) {
    return jsonResponse({ error: 'Enter a title and subject, and choose a PDF no larger than 25 MB.' }, 400);
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

  const header = new TextDecoder().decode(contents.slice(0, 5));

  if (header !== '%PDF-') {
    return jsonResponse({ error: 'The selected file does not contain a valid PDF header.' }, 415);
  }

  const id = crypto.randomUUID();
  const objectKey = `private-pdfs/${id}.pdf`;
  const createdAt = new Date().toISOString();

  try {
    await env.PDF_BUCKET.put(objectKey, contents, {
      httpMetadata: { contentType: 'application/pdf' }
    });
  } catch (error) {
    console.error('Could not save PDF to R2:', error.message);
    return jsonResponse({ error: 'Could not save the PDF file.' }, 503);
  }

  try {
    await env.DB.prepare(
      `INSERT INTO pdf_resources (id, title, subject, description, object_key, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(id, title, subject, description, objectKey, createdAt).run();
  } catch (error) {
    console.error('Could not save PDF metadata:', error.message);

    try {
      await env.PDF_BUCKET.delete(objectKey);
    } catch (cleanupError) {
      console.error('Could not clean up unlisted PDF object:', cleanupError.message);
    }

    return jsonResponse({ error: 'Could not publish the PDF.' }, 503);
  }

  return jsonResponse({
    ok: true,
    pdf: { id, title, subject, description, created_at: createdAt }
  }, 201);
}

export async function onRequestDelete({ request, env }) {
  if (!await requireAccess(request, env)) {
    return jsonResponse({ error: 'Cloudflare Access authentication required.' }, 401);
  }

  if (request.headers.get('Origin') !== new URL(request.url).origin) {
    return jsonResponse({ error: 'Origin not allowed.' }, 403);
  }

  if (!env.DB || !env.PDF_BUCKET) {
    return jsonResponse({ error: 'PDF storage is not configured.' }, 503);
  }

  const id = new URL(request.url).searchParams.get('id');

  if (!id || !validPdfId(id)) {
    return jsonResponse({ error: 'A valid PDF ID is required.' }, 400);
  }

  try {
    const pdf = await env.DB.prepare(
      'SELECT object_key FROM pdf_resources WHERE id = ?'
    ).bind(id).first();

    if (!pdf) {
      return jsonResponse({ error: 'PDF not found.' }, 404);
    }

    await env.DB.prepare('DELETE FROM pdf_resources WHERE id = ?').bind(id).run();

    try {
      await env.PDF_BUCKET.delete(pdf.object_key);
    } catch (error) {
      console.error(`PDF resource ${id} was unlisted but its R2 object could not be deleted:`, error.message);
      return jsonResponse({ ok: true, storageCleanupPending: true });
    }

    return jsonResponse({ ok: true });
  } catch (error) {
    console.error('Could not delete PDF resource:', error.message);
    return jsonResponse({ error: 'Could not delete PDF resource.' }, 503);
  }
}
