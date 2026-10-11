import { requireSession } from '../lib/auth.mjs';
import { jsonResponse, methodNotAllowed } from '../lib/http.mjs';

export default async function handler(request) {
  if (request.method !== 'GET') return methodNotAllowed(['GET']);
  const error = requireSession(request, process.env);
  return error || jsonResponse({ authenticated: true });
}
