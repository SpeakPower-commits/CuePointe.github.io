// POST /api/admin/logout — ends the session on the server and clears the cookie.
import { db } from '../../lib/db.js';
import { json, fail } from '../../lib/http.js';
import { destroySession, checkOrigin } from '../../lib/auth.js';

export async function POST(req) {
  try {
    checkOrigin(req);
    const sql = await db();
    const cookie = await destroySession(req, sql);
    return json({ ok: true }, 200, { 'Set-Cookie': cookie });
  } catch (e) {
    return fail(e);
  }
}
