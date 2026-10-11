import { authUnavailable, sessionCookie, verifyPassword } from '../lib/auth.mjs';
import { jsonResponse, methodNotAllowed, originAllowed, readJson } from '../lib/http.mjs';

const attemptWindowMs = 15 * 60 * 1000;
const maxAttempts = 10;
const attemptsByAddress = new Map();

function clientAddress(request) {
  return request.headers.get('x-nf-client-connection-ip') || 'unknown';
}

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

  if (verifyPassword(process.env, '') === null) return authUnavailable();

  const now = Date.now();
  const address = clientAddress(request);
  if (tooManyAttempts(address, now)) {
    return jsonResponse({ error: 'Too many login attempts. Try again later.' }, 429);
  }

  const data = await readJson(request);
  if (!data || typeof data.password !== 'string' || data.password.length > 1024) {
    return jsonResponse({ error: 'A valid password is required.' }, 400);
  }

  const verified = verifyPassword(process.env, data.password);
  if (verified === null) return authUnavailable();
  if (!verified.valid) return jsonResponse({ error: 'Incorrect password.' }, 401);

  const setCookie = sessionCookie(request, process.env);
  if (!setCookie) return authUnavailable();

  attemptsByAddress.delete(address);
  return jsonResponse({ ok: true }, 200, { 'Set-Cookie': setCookie });
}
