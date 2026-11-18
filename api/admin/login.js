// POST /api/admin/login — email + password, sets an HttpOnly session cookie.
import { db } from '../../lib/db.js';
import { json, fail, httpError, clean, ipHash, readBody, rateLimit } from '../../lib/http.js';
import { verifyPassword, createSession, checkOrigin } from '../../lib/auth.js';

// A fixed hash to compare against when the email is unknown, so timing does not reveal accounts.
const DUMMY = 'scrypt$00000000000000000000000000000000$' + '0'.repeat(128);

export async function POST(req) {
  try {
    checkOrigin(req);
    const { fields } = await readBody(req, 16 * 1024);
    const email = clean(fields.email, 160).toLowerCase();
    const password = String(fields.password || '');
    if (!email || !password) throw httpError(400, 'Enter your email and password.');

    const sql = await db();
    await rateLimit(sql, 'login-ip', ipHash(req), 10, 15);
    await rateLimit(sql, 'login-email', email, 6, 15);

    const rows = await sql`SELECT pass_hash FROM admins WHERE email = ${email}`;
    const ok = await verifyPassword(password, rows.length ? rows[0].pass_hash : DUMMY);
    if (!rows.length || !ok) throw httpError(401, 'Email or password is not correct.');

    const cookie = await createSession(sql, email, fields.remember === true || fields.remember === 'true');
    return json({ ok: true, email }, 200, { 'Set-Cookie': cookie });
  } catch (e) {
    return fail(e);
  }
}
