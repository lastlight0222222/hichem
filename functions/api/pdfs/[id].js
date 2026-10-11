import { jsonResponse } from '../../_lib/response.js';

export async function onRequestGet({ params, env }) {
  const id = params.id;

  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return jsonResponse({ error: 'PDF not found.' }, 404);
  }

  if (!env.DB || !env.PDF_BUCKET) {
    return jsonResponse({ error: 'PDF storage is not configured.' }, 503);
  }

  try {
    const pdf = await env.DB.prepare(
      'SELECT id, title, object_key FROM pdf_resources WHERE id = ?'
    ).bind(id).first();

    if (!pdf) {
      return jsonResponse({ error: 'PDF not found.' }, 404);
    }

    const object = await env.PDF_BUCKET.get(pdf.object_key);

    if (!object) {
      console.error(`PDF object is missing for resource ${pdf.id}.`);
      return jsonResponse({ error: 'PDF file is unavailable.' }, 503);
    }

    return new Response(object.body, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': String(object.size),
        'Content-Disposition': 'inline; filename="document.pdf"',
        'Cache-Control': 'public, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': 'sandbox'
      }
    });
  } catch (error) {
    console.error('Could not load PDF file:', error.message);
    return jsonResponse({ error: 'Could not load PDF file.' }, 503);
  }
}
