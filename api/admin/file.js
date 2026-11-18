// GET /api/admin/file?path=private/payments/... — payment screenshots, signed-in admins only.
import { get } from '@vercel/blob';
import { db } from '../../lib/db.js';
import { json, fail } from '../../lib/http.js';
import { requireAdmin } from '../../lib/auth.js';

const SAFE = /^private\/payments\/[0-9-]{10}\/[A-Za-z0-9-]{36}\.(jpg|png|webp|heic|heif)$/;

export async function GET(req) {
  try {
    const sql = await db();
    await requireAdmin(req, sql);
    const path = new URL(req.url).searchParams.get('path') || '';
    if (!SAFE.test(path)) return json({ error: 'Not found.' }, 404);
    const result = await get(path, { access: 'private' });
    if (!result || result.statusCode !== 200) return json({ error: 'Not found.' }, 404);
    return new Response(result.stream, {
      headers: {
        'Content-Type': result.blob.contentType || 'application/octet-stream',
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; img-src 'self'"
      }
    });
  } catch (e) {
    return fail(e);
  }
}
