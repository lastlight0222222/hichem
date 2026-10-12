import { authUnavailable, teacherSessionCookie, verifyTeacherPassword } from '../lib/auth.mjs';
import { jsonResponse, methodNotAllowed, originAllowed, readJson } from '../lib/http.mjs';

const attemptWindowMs = 15 * 60 * 1000;
const maxAttempts = 10;
const attemptsByAddress = new Map();

function tooManyAttempts(address, now) {
  const entry = attemptsByAddress.get(address);
  if (!entry || now - entry.startedAt >= attemptWindowMs) {
    attemptsByAddress.set(address, { startedAt: now, count: 0 });
  }

  const current = attemptsByAddress.get(address);
  if (current.count >= maxAttempts) return true;
  current.count += 1;
  if (attemptsByAddress.size > 5000) {
    for (const [key, value] of attemptsByAddress) {
      if (now - value.startedAt >= attemptWindowMs) attemptsByAddress.delete(key);
    }
  }
  return false;
}

export default async function handler(request) {
  if (request.method !== 'POST') return methodNotAllowed(['POST']);
  if (!originAllowed(request)) return jsonResponse({ error: 'Origin not allowed.' }, 403);
  if (request.headers.get('Content-Type')?.split(';')[0] !== 'application/json') {
    return jsonResponse({ error: 'Content-Type must be application/json.' }, 415);
  }
  if (verifyTeacherPassword(process.env, '') === null) {
    return jsonResponse({ error: 'Teacher authentication is not configured.' }, 503);
  }

  const now = Date.now();
  const address = request.headers.get('x-nf-client-connection-ip') || 'unknown';
  if (tooManyAttempts(address, now)) {
    return jsonResponse({ error: 'Too many login attempts. Try again later.' }, 429);
  }

  const data = await readJson(request);
  if (!data || typeof data.password !== 'string' || data.password.length > 1024) {
    return jsonResponse({ error: 'A valid password is required.' }, 400);
  }

  const verified = verifyTeacherPassword(process.env, data.password);
  if (verified === null) {
    return jsonResponse({ error: 'Teacher authentication is not configured.' }, 503);
  }
  if (!verified.valid) return jsonResponse({ error: 'Incorrect password.' }, 401);

  const setCookie = teacherSessionCookie(request, process.env);
  if (!setCookie) return jsonResponse({ error: 'Teacher authentication is not configured.' }, 503);
  attemptsByAddress.delete(address);
  return jsonResponse({ ok: true }, 200, { 'Set-Cookie': setCookie });
}
