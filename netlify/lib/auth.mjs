import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { jsonResponse } from './http.mjs';

const cookieName = 'bac_admin_session';
const sessionDurationSeconds = 8 * 60 * 60;

function authConfiguration(env) {
  if (
    typeof env.ADMIN_PASSWORD !== 'string' ||
    env.ADMIN_PASSWORD.length === 0 ||
    typeof env.ADMIN_SESSION_SECRET !== 'string' ||
    Buffer.byteLength(env.ADMIN_SESSION_SECRET, 'utf8') < 32
  ) {
    return null;
  }

  return {
    password: env.ADMIN_PASSWORD,
    secret: env.ADMIN_SESSION_SECRET
  };
}

function equalStrings(left, right) {
  const leftDigest = createHash('sha256').update(left).digest();
  const rightDigest = createHash('sha256').update(right).digest();
  return timingSafeEqual(leftDigest, rightDigest) && left.length === right.length;
}

function sign(value, secret) {
  return createHmac('sha256', secret).update(value).digest('base64url');
}

function cookieValue(request) {
  const cookies = request.headers.get('Cookie') || '';
  const item = cookies.split(';').map(value => value.trim()).find(value => value.startsWith(`${cookieName}=`));
  return item ? item.slice(cookieName.length + 1) : '';
}

function secureCookie(request, value, maxAge) {
  const hostname = new URL(request.url).hostname;
  const secure = hostname === 'localhost' || hostname === '127.0.0.1' ? '' : '; Secure';
  return `${cookieName}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
}

function createSession(request, secret) {
  const payload = Buffer.from(JSON.stringify({
    expiresAt: Date.now() + sessionDurationSeconds * 1000
  })).toString('base64url');

  return secureCookie(request, `${payload}.${sign(payload, secret)}`, sessionDurationSeconds);
}

export function authUnavailable() {
  return jsonResponse({ error: 'Admin authentication is not configured.' }, 503);
}

export function verifyPassword(env, password) {
  const config = authConfiguration(env);
  if (!config) return null;
  return { valid: typeof password === 'string' && equalStrings(password, config.password) };
}

export function verifySession(request, env) {
  const config = authConfiguration(env);
  if (!config) return null;

  const [payload, signature, extra] = cookieValue(request).split('.');
  if (!payload || !signature || extra !== undefined) return false;
  if (!/^[A-Za-z0-9_-]+$/.test(payload) || !/^[A-Za-z0-9_-]+$/.test(signature)) return false;

  const expectedSignature = sign(payload, config.secret);
  if (!equalStrings(signature, expectedSignature)) return false;

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return Number.isSafeInteger(data.expiresAt) && data.expiresAt > Date.now();
  } catch {
    return false;
  }
}

export function sessionCookie(request, env) {
  const config = authConfiguration(env);
  return config ? createSession(request, config.secret) : null;
}

export function clearSessionCookie(request) {
  return secureCookie(request, '', 0);
}

export function requireSession(request, env) {
  const authenticated = verifySession(request, env);
  if (authenticated === null) return authUnavailable();
  return authenticated ? null : jsonResponse({ error: 'Admin session required.' }, 401);
}
