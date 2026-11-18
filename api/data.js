// GET /api/data?doc=players|matches|schedule|news|fund
// Public pages still fetch /players.json etc.; vercel.json rewrites those URLs here,
// so the JSON shape is exactly what the pages already expect.
import { db, DOC_KEYS } from '../lib/db.js';
import { json, fail } from '../lib/http.js';

export async function GET(req) {
  try {
    const key = new URL(req.url).searchParams.get('doc');
    if (!DOC_KEYS.includes(key)) return json({ error: 'Unknown document.' }, 404);
    const sql = await db();
    const rows = await sql`SELECT data FROM documents WHERE key = ${key}`;
    if (!rows.length) return json({ error: 'Not found.' }, 404);
    return new Response(JSON.stringify(rows[0].data), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=0, must-revalidate',
        'CDN-Cache-Control': 'public, s-maxage=10, stale-while-revalidate=60'
      }
    });
  } catch (e) {
    return fail(e);
  }
}
