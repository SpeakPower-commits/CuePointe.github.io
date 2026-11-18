// GET /api/admin/me — who is signed in (401 if nobody).
import { db } from '../../lib/db.js';
import { json, fail } from '../../lib/http.js';
import { requireAdmin } from '../../lib/auth.js';

export async function GET(req) {
  try {
    const sql = await db();
    const email = await requireAdmin(req, sql);
    return json({ email });
  } catch (e) {
    return fail(e);
  }
}
