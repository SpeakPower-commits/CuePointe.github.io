// Admin sign-in: scrypt password hashes, random session tokens stored only as SHA-256 hashes,
// and an HttpOnly cookie scoped to /api/admin. No secret keys live in the browser.
import { scrypt, randomBytes, timingSafeEqual, createHash } from 'node:crypto';
import { httpError } from './http.js';

export const COOKIE = 'cp_admin';
const sha = t => createHash('sha256').update(t).digest('hex');

function scryptAsync(password, salt) {
  return new Promise((resolve, reject) =>
    scrypt(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (err, key) => err ? reject(err) : resolve(key)));
}

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt);
  return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`;
}

export async function verifyPassword(password, stored) {
  const [alg, saltHex, keyHex] = String(stored || '').split('$');
  if (alg !== 'scrypt' || !saltHex || !keyHex) return false;
  const key = await scryptAsync(password, Buffer.from(saltHex, 'hex'));
  const expected = Buffer.from(keyHex, 'hex');
  return expected.length === key.length && timingSafeEqual(expected, key);
}

export function safeEqual(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
}

export function readCookie(req, name) {
  const header = req.headers.get('cookie') || '';
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > -1 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return null;
}

export async function createSession(sql, email, remember) {
  const token = randomBytes(32).toString('base64url');
  const days = remember ? 30 : 1;
  await sql`INSERT INTO sessions (token_hash, email, expires_at)
            VALUES (${sha(token)}, ${email}, now() + make_interval(days => ${days}))`;
  if (Math.random() < 0.05) await sql`DELETE FROM sessions WHERE expires_at < now()`;
  const maxAge = remember ? `; Max-Age=${days * 86400}` : '';
  return `${COOKIE}=${token}; Path=/api/admin; HttpOnly; Secure; SameSite=Strict${maxAge}`;
}

export async function destroySession(req, sql) {
  const token = readCookie(req, COOKIE);
  if (token) await sql`DELETE FROM sessions WHERE token_hash = ${sha(token)}`;
  return `${COOKIE}=; Path=/api/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

// Blocks cross-site requests on anything that changes data.
export function checkOrigin(req) {
  const origin = req.headers.get('origin');
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  let ok = false;
  try { ok = !!origin && new URL(origin).host === host; } catch { ok = false; }
  if (!ok || req.headers.get('x-cp-admin') !== '1') throw httpError(403, 'Request blocked.');
}

// Returns the signed-in admin's email or throws 401.
export async function requireAdmin(req, sql, { mutating = false } = {}) {
  if (mutating) checkOrigin(req);
  const token = readCookie(req, COOKIE);
  if (!token) throw httpError(401, 'Please sign in.');
  const rows = await sql`SELECT email FROM sessions WHERE token_hash = ${sha(token)} AND expires_at > now()`;
  if (!rows.length) throw httpError(401, 'Your session has ended. Please sign in again.');
  return rows[0].email;
}
