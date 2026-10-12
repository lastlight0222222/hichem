import { requireTeacherSession } from '../lib/auth.mjs';
import { jsonResponse, methodNotAllowed } from '../lib/http.mjs';

export default async function handler(request) {
  if (request.method !== 'GET') return methodNotAllowed(['GET']);
  const error = requireTeacherSession(request, process.env);
  return error || jsonResponse({ authenticated: true });
}
