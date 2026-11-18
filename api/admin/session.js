// Admin sign-in, one endpoint (the Hobby plan allows 12 functions per deployment).
// GET    /api/admin/session                 -> { email | null, setupNeeded, setupEnabled }
// POST   /api/admin/session {action:'login', email, password, remember}
// POST   /api/admin/session {action:'setup', code, email, password}   (first admin only)
// DELETE /api/admin/session                 -> signs out
// First-admin setup works only while no admin exists AND ADMIN_SETUP_CODE (set by Tom in Vercel) matches.
import { db } from '../../lib/db.js';
import { json, fail, httpError, clean, isEmail, ipHash, readBody, rateLimit } from '../../lib/http.js';
import {
  hashPassword, verifyPassword, createSession, destroySession, requireAdmin, safeEqual, checkOrigin
} from '../../lib/auth.js';

const setupCode = () => process.env.ADMIN_SETUP_CODE || '';
// Compared against when the email is unknown, so response time does not reveal which accounts exist.
const DUMMY = 'scrypt$00000000000000000000000000000000$' + '0'.repeat(128);

export async function GET(req) {
  try {
    const sql = await db();
    let email = null;
    try { email = await requireAdmin(req, sql); } catch { email = null; }
    const rows = await sql`SELECT count(*)::int AS n FROM admins`;
    return json({ email, setupNeeded: rows[0].n === 0, setupEnabled: setupCode().length >= 8 });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req) {
  try {
    checkOrigin(req);
    const { fields } = await readBody(req, 16 * 1024);
    const email = clean(fields.email, 160).toLowerCase();
    const password = String(fields.password || '');
    const sql = await db();

    if (fields.action === 'setup') {
      await rateLimit(sql, 'setup', ipHash(req), 5, 15);
      if (setupCode().length < 8) throw httpError(403, 'Setup is switched off. Add ADMIN_SETUP_CODE in Vercel first.');
      if (!safeEqual(String(fields.code || ''), setupCode())) throw httpError(403, 'That setup code is not correct.');
      if (!isEmail(email)) throw httpError(400, 'Please enter a valid email address.');
      if (password.length < 10) throw httpError(400, 'Use a password of at least 10 characters.');
      const hash = await hashPassword(password);
      const rows = await sql`INSERT INTO admins (email, pass_hash)
                             SELECT ${email}, ${hash} WHERE NOT EXISTS (SELECT 1 FROM admins)
                             RETURNING email`;
      if (!rows.length) throw httpError(409, 'An admin account already exists. Please sign in instead.');
      const cookie = await createSession(sql, email, false);
      return json({ ok: true, email }, 201, { 'Set-Cookie': cookie });
    }

    if (fields.action === 'login') {
      if (!email || !password) throw httpError(400, 'Enter your email and password.');
      await rateLimit(sql, 'login-ip', ipHash(req), 10, 15);
      await rateLimit(sql, 'login-email', email, 6, 15);
      const rows = await sql`SELECT pass_hash FROM admins WHERE email = ${email}`;
      const ok = await verifyPassword(password, rows.length ? rows[0].pass_hash : DUMMY);
      if (!rows.length || !ok) throw httpError(401, 'Email or password is not correct.');
      const cookie = await createSession(sql, email, fields.remember === true || fields.remember === 'true');
      return json({ ok: true, email }, 200, { 'Set-Cookie': cookie });
    }

    throw httpError(400, 'Unknown action.');
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(req) {
  try {
    checkOrigin(req);
    const sql = await db();
    const cookie = await destroySession(req, sql);
    return json({ ok: true }, 200, { 'Set-Cookie': cookie });
  } catch (e) {
    return fail(e);
  }
}
