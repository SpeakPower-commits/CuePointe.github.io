// First-admin setup. Works only while no admin exists AND the ADMIN_SETUP_CODE environment
// variable (set by Tom in Vercel) matches. After the first admin is created it refuses.
import { db } from '../../lib/db.js';
import { json, fail, httpError, clean, isEmail, ipHash, readBody, rateLimit } from '../../lib/http.js';
import { hashPassword, createSession, safeEqual, checkOrigin } from '../../lib/auth.js';

const setupCode = () => process.env.ADMIN_SETUP_CODE || '';

export async function GET() {
  try {
    const sql = await db();
    const rows = await sql`SELECT count(*)::int AS n FROM admins`;
    return json({ needed: rows[0].n === 0, enabled: setupCode().length >= 8 });
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
    const code = String(fields.code || '');

    const sql = await db();
    await rateLimit(sql, 'setup', ipHash(req), 5, 15);
    if (setupCode().length < 8) throw httpError(403, 'Setup is switched off. Add ADMIN_SETUP_CODE in Vercel first.');
    if (!safeEqual(code, setupCode())) throw httpError(403, 'That setup code is not correct.');
    if (!isEmail(email)) throw httpError(400, 'Please enter a valid email address.');
    if (password.length < 10) throw httpError(400, 'Use a password of at least 10 characters.');

    const hash = await hashPassword(password);
    const rows = await sql`INSERT INTO admins (email, pass_hash)
                           SELECT ${email}, ${hash} WHERE NOT EXISTS (SELECT 1 FROM admins)
                           RETURNING email`;
    if (!rows.length) throw httpError(409, 'An admin account already exists. Please sign in instead.');
    const cookie = await createSession(sql, email, false);
    return json({ ok: true, email }, 201, { 'Set-Cookie': cookie });
  } catch (e) {
    return fail(e);
  }
}
