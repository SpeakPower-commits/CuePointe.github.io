// Small helpers shared by every API function: responses, errors, input cleaning, rate limits.
import { createHash } from 'node:crypto';

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers }
  });
}

export function httpError(status, message) {
  const e = new Error(message);
  e.status = status; e.expose = true;
  return e;
}

export function fail(e) {
  const status = e && e.status ? e.status : 500;
  if (status >= 500) console.error(e);
  const message = e && e.expose ? e.message : 'Something went wrong on our side. Please try again in a minute.';
  return json({ error: message }, status);
}

// One line of text: strip control characters, trim, cap length.
export function clean(v, max = 200) {
  if (v === undefined || v === null) return '';
  return String(v).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

// Multi-line text: keep line breaks, drop other control characters.
export function cleanText(v, max = 2000) {
  if (v === undefined || v === null) return '';
  return String(v).replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, '').trim().slice(0, max);
}

export const isEmail = s => /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(s);
export const isPhone = s => /^[+0-9 ()-]{7,20}$/.test(s) && (s.match(/\d/g) || []).length >= 7;

export function clientIp(req) {
  return (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
}

// Store a one-way hash of the IP, never the IP itself.
export function ipHash(req) {
  return createHash('sha256').update('cuepointe:' + clientIp(req)).digest('hex').slice(0, 32);
}

// Read JSON, urlencoded or multipart bodies. Returns { fields, form }.
export async function readBody(req, maxBytes = 4.4 * 1024 * 1024) {
  const len = Number(req.headers.get('content-length') || 0);
  if (len > maxBytes) throw httpError(413, 'That upload is too large. Please use a smaller image (under 4 MB).');
  const ct = req.headers.get('content-type') || '';
  if (ct.includes('multipart/form-data') || ct.includes('application/x-www-form-urlencoded')) {
    let form;
    try { form = await req.formData(); } catch { throw httpError(400, 'Could not read the form.'); }
    const fields = {};
    for (const [k, v] of form.entries()) if (typeof v === 'string') fields[k] = v;
    return { fields, form };
  }
  try { return { fields: (await req.json()) || {}, form: null }; }
  catch { throw httpError(400, 'Invalid request.'); }
}

// Allow `limit` events of `kind` per `key` within `minutes`; otherwise 429.
export async function rateLimit(sql, kind, key, limit, minutes) {
  const rows = await sql`SELECT count(*)::int AS n FROM rate_events
                         WHERE kind = ${kind} AND key = ${key} AND at > now() - make_interval(mins => ${minutes})`;
  if (rows[0].n >= limit) throw httpError(429, 'Too many attempts. Please wait a few minutes and try again.');
  await sql`INSERT INTO rate_events (kind, key) VALUES (${kind}, ${key})`;
  if (Math.random() < 0.02) await sql`DELETE FROM rate_events WHERE at < now() - interval '2 days'`;
}
