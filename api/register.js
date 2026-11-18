// POST /api/register — player registrations from the homepage form (JSON)
// and register.html (multipart, with a payment screenshot stored privately in Vercel Blob).
import { put } from '@vercel/blob';
import { randomUUID } from 'node:crypto';
import { db } from '../lib/db.js';
import { json, fail, httpError, clean, cleanText, isEmail, isPhone, ipHash, readBody, rateLimit } from '../lib/http.js';

const IMAGE_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'image/heif': 'heif' };

export async function POST(req) {
  try {
    const { fields, form } = await readBody(req);
    if (clean(fields.website)) return json({ ok: true }); // honeypot: bots fill hidden fields

    const r = {
      first_name: clean(fields.first_name ?? fields.firstName, 80),
      last_name: clean(fields.last_name ?? fields.lastName, 80),
      phone: clean(fields.phone, 30),
      email: clean(fields.email, 160),
      area: clean(fields.area, 120),
      location: clean(fields.location, 120),
      age: Number.parseInt(fields.age, 10),
      skill: clean(fields.skill ?? fields.skill_level, 80),
      event: clean(fields.event, 160),
      source: clean(fields.source, 80),
      comments: cleanText(fields.comments, 1500),
      origin: ['home', 'register'].includes(fields.origin) ? fields.origin : 'site'
    };
    if (!r.first_name || !r.last_name) throw httpError(400, 'Please enter your first and last name.');
    if (!isPhone(r.phone)) throw httpError(400, 'Please enter a valid phone / WhatsApp number.');
    if (r.email && !isEmail(r.email)) throw httpError(400, 'Please enter a valid email address, or leave it blank.');
    if (!r.event) throw httpError(400, 'Please choose a tournament or event.');
    if (!r.skill) throw httpError(400, 'Please choose your skill level.');
    if (!Number.isFinite(r.age) || r.age < 8 || r.age > 99) r.age = null;

    const file = form ? form.get('payment_screenshot') : null;
    const hasFile = file && typeof file !== 'string' && file.size > 0;
    if (r.origin === 'register' && !hasFile) throw httpError(400, 'Please attach your payment screenshot.');
    if (hasFile) {
      if (!IMAGE_TYPES[file.type]) throw httpError(400, 'The payment screenshot must be a JPG, PNG, WEBP or HEIC image.');
      if (file.size > 4 * 1024 * 1024) throw httpError(413, 'The payment screenshot is too large (max 4 MB).');
    }

    const sql = await db();
    const ip = ipHash(req);
    await rateLimit(sql, 'register', ip, 6, 10);

    let paymentPath = null;
    if (hasFile) {
      const day = new Date().toISOString().slice(0, 10);
      const blob = await put(`private/payments/${day}/${randomUUID()}.${IMAGE_TYPES[file.type]}`, file, {
        access: 'private',
        contentType: file.type,
        addRandomSuffix: false
      });
      paymentPath = blob.pathname;
    }

    const rows = await sql`INSERT INTO registrations
      (first_name, last_name, phone, email, area, location, age, skill, event, source, comments, payment_path, origin, ip_hash)
      VALUES (${r.first_name}, ${r.last_name}, ${r.phone}, ${r.email || null}, ${r.area || null}, ${r.location || null},
              ${r.age}, ${r.skill}, ${r.event}, ${r.source || null}, ${r.comments || null}, ${paymentPath}, ${r.origin}, ${ip})
      RETURNING id`;
    return json({ ok: true, id: Number(rows[0].id) }, 201);
  } catch (e) {
    return fail(e);
  }
}
