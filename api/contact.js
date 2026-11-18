// POST /api/contact — messages from contact.html and the homepage contact form.
import { db } from '../lib/db.js';
import { json, fail, httpError, clean, cleanText, isEmail, ipHash, readBody, rateLimit } from '../lib/http.js';

export async function POST(req) {
  try {
    const { fields } = await readBody(req, 64 * 1024);
    if (clean(fields.website)) return json({ ok: true });

    const m = {
      name: clean(fields.name, 120),
      phone: clean(fields.phone, 30),
      email: clean(fields.email, 160),
      contact: clean(fields.contact, 160),
      subject: clean(fields.subject, 80),
      message: cleanText(fields.message, 3000),
      origin: ['home', 'contact'].includes(fields.origin) ? fields.origin : 'site'
    };
    if (!m.name || !m.message) throw httpError(400, 'Please enter your name and a message.');
    if (!m.phone && !m.email && !m.contact) throw httpError(400, 'Please tell us how to reach you (phone or email).');
    if (m.email && !isEmail(m.email)) throw httpError(400, 'Please enter a valid email address, or leave it blank.');

    const sql = await db();
    const ip = ipHash(req);
    await rateLimit(sql, 'contact', ip, 6, 10);
    const rows = await sql`INSERT INTO messages (name, phone, email, contact, subject, message, origin, ip_hash)
      VALUES (${m.name}, ${m.phone || null}, ${m.email || null}, ${m.contact || null}, ${m.subject || null},
              ${m.message}, ${m.origin}, ${ip})
      RETURNING id`;
    return json({ ok: true, id: Number(rows[0].id) }, 201);
  } catch (e) {
    return fail(e);
  }
}
