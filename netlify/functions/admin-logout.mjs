import { clearSessionCookie, requireSession } from '../lib/auth.mjs';
import { jsonResponse, methodNotAllowed, originAllowed } from '../lib/http.mjs';

export default async function handler(request) {
  if (request.method !== 'POST') return methodNotAllowed(['POST']);
  if (!originAllowed(request)) return jsonResponse({ error: 'Origin not allowed.' }, 403);

  const error = requireSession(request, process.env);
  if (error) return error;

  return jsonResponse({ ok: true }, 200, { 'Set-Cookie': clearSessionCookie(request) });
}
