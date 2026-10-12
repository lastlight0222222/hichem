import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { jsonResponse } from './http.mjs';

const cookieNames = {
  admin: 'bac_admin_session',
  teacher: 'bac_teacher_session'
};
const sessionDurationSeconds = 8 * 60 * 60;

function authConfiguration(env, role) {
  const passwordName = role === 'admin' ? 'ADMIN_PASSWORD' : 'TEACHER_PASSWORD';
  if (
    typeof env[passwordName] !== 'string' ||
    env[passwordName].length === 0 ||
    typeof env.ADMIN_SESSION_SECRET !== 'string' ||
    Buffer.byteLength(env.ADMIN_SESSION_SECRET, 'utf8') < 32
  ) {
    return null;
  }

  return {
    password: env[passwordName],
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

function cookieValue(request, role) {
  const cookies = request.headers.get('Cookie') || '';
  const cookieName = cookieNames[role];
  const item = cookies.split(';').map(value => value.trim()).find(value => value.startsWith(`${cookieName}=`));
  return item ? item.slice(cookieName.length + 1) : '';
}

function secureCookie(request, role, value, maxAge) {
  const hostname = new URL(request.url).hostname;
  const secure = hostname === 'localhost' || hostname === '127.0.0.1' ? '' : '; Secure';
  return `${cookieNames[role]}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
}

function createSession(request, secret, role) {
  const payload = Buffer.from(JSON.stringify({
    role,
    expiresAt: Date.now() + sessionDurationSeconds * 1000
  })).toString('base64url');

  return secureCookie(request, role, `${payload}.${sign(payload, secret)}`, sessionDurationSeconds);
}

export function authUnavailable() {
  return jsonResponse({ error: 'Admin authentication is not configured.' }, 503);
}

export function verifyPassword(env, password) {
  return verifyRolePassword(env, password, 'admin');
}

export function verifyTeacherPassword(env, password) {
  return verifyRolePassword(env, password, 'teacher');
}

function verifyRolePassword(env, password, role) {
  const config = authConfiguration(env, role);
  if (!config) return null;
  return { valid: typeof password === 'string' && equalStrings(password, config.password) };
}

export function verifySession(request, env) {
  return verifyRoleSession(request, env, 'admin');
}

export function verifyTeacherSession(request, env) {
  return verifyRoleSession(request, env, 'teacher');
}

function verifyRoleSession(request, env, role) {
  const config = authConfiguration(env, role);
  if (!config) return null;

  const [payload, signature, extra] = cookieValue(request, role).split('.');
  if (!payload || !signature || extra !== undefined) return false;
  if (!/^[A-Za-z0-9_-]+$/.test(payload) || !/^[A-Za-z0-9_-]+$/.test(signature)) return false;

  const expectedSignature = sign(payload, config.secret);
  if (!equalStrings(signature, expectedSignature)) return false;

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    const legacyAdminSession = role === 'admin' && data.role === undefined;
    return (data.role === role || legacyAdminSession) &&
      Number.isSafeInteger(data.expiresAt) && data.expiresAt > Date.now();
  } catch {
    return false;
  }
}

export function sessionCookie(request, env) {
  return roleSessionCookie(request, env, 'admin');
}

export function teacherSessionCookie(request, env) {
  return roleSessionCookie(request, env, 'teacher');
}

function roleSessionCookie(request, env, role) {
  const config = authConfiguration(env, role);
  return config ? createSession(request, config.secret, role) : null;
}

export function clearSessionCookie(request, role = 'admin') {
  return secureCookie(request, role, '', 0);
}

export function requireSession(request, env) {
  const authenticated = verifySession(request, env);
  if (authenticated === null) return authUnavailable();
  return authenticated ? null : jsonResponse({ error: 'Admin session required.' }, 401);
}

export function requireTeacherSession(request, env) {
  const authenticated = verifyTeacherSession(request, env);
  if (authenticated === null) {
    return jsonResponse({ error: 'Teacher authentication is not configured.' }, 503);
  }
  return authenticated ? null : jsonResponse({ error: 'Teacher session required.' }, 401);
}

export function requireUploadSession(request, env) {
  const adminError = requireSession(request, env);
  if (!adminError) return null;

  const teacherError = requireTeacherSession(request, env);
  if (!teacherError) return null;
  if (adminError.status === 503) return adminError;
  return teacherError;
}
