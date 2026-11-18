// POST /api/venue — "host a tournament" applications from venues.html.
import { db } from '../lib/db.js';
import { json, fail, httpError, clean, cleanText, isPhone, ipHash, readBody, rateLimit } from '../lib/http.js';

export async function POST(req) {
  try {
    const { fields } = await readBody(req, 64 * 1024);
    if (clean(fields.website)) return json({ ok: true });

    const v = {
      name: clean(fields.name, 120),
      venue: clean(fields.venue, 160),
      address: clean(fields.address, 200),
      tables: clean(fields.tables, 40),
      phone: clean(fields.phone, 30),
      notes: cleanText(fields.notes, 2000)
    };
    if (!v.name || !v.venue) throw httpError(400, 'Please enter your name and the venue name.');
    if (!isPhone(v.phone)) throw httpError(400, 'Please enter a valid phone number.');

    const sql = await db();
    const ip = ipHash(req);
    await rateLimit(sql, 'venue', ip, 5, 10);
    const rows = await sql`INSERT INTO venue_applications (name, venue, address, tables, phone, notes, ip_hash)
      VALUES (${v.name}, ${v.venue}, ${v.address || null}, ${v.tables || null}, ${v.phone}, ${v.notes || null}, ${ip})
      RETURNING id`;
    return json({ ok: true, id: Number(rows[0].id) }, 201);
  } catch (e) {
    return fail(e);
  }
}
