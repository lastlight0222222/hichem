import { jsonResponse } from '../_lib/response.js';

export async function onRequestGet({ env }) {
  if (!env.DB) {
    return jsonResponse({ error: 'PDF resources are not configured.' }, 503);
  }

  try {
    const result = await env.DB.prepare(
      'SELECT id, title, subject, description, created_at FROM pdf_resources ORDER BY created_at DESC'
    ).all();

    return jsonResponse({
      pdfs: result.results.map(pdf => ({
        id: pdf.id,
        title: pdf.title,
        subject: pdf.subject,
        description: pdf.description,
        created_at: pdf.created_at,
        url: `/api/pdfs/${encodeURIComponent(pdf.id)}`
      }))
    });
  } catch (error) {
    console.error('Could not load published PDFs:', error.message);
    return jsonResponse({ error: 'Could not load published PDFs.' }, 503);
  }
}
