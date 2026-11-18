// Submissions inbox for the admin panel.
// GET   /api/admin/records?type=registrations|messages|venues[&format=csv]
// PATCH /api/admin/records  { type, id, status }
import { db } from '../../lib/db.js';
import { json, fail, httpError, readBody } from '../../lib/http.js';
import { requireAdmin } from '../../lib/auth.js';

const STATUSES = ['new', 'contacted', 'confirmed', 'paid', 'rejected', 'archived'];

async function list(sql, type) {
  if (type === 'registrations') return sql`SELECT id, created_at, first_name, last_name, phone, email, area, location, age,
    skill, event, source, comments, payment_path, origin, status FROM registrations ORDER BY created_at DESC LIMIT 1000`;
  if (type === 'messages') return sql`SELECT id, created_at, name, phone, email, contact, subject, message, origin, status
    FROM messages ORDER BY created_at DESC LIMIT 1000`;
  if (type === 'venues') return sql`SELECT id, created_at, name, venue, address, tables, phone, notes, status
    FROM venue_applications ORDER BY created_at DESC LIMIT 1000`;
  throw httpError(400, 'Unknown record type.');
}

function toCsv(rows) {
  if (!rows.length) return '';
  const cols = Object.keys(rows[0]);
  const cell = v => {
    let s = v === null || v === undefined ? '' : (v instanceof Date ? v.toISOString() : String(v));
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // stop spreadsheet formula injection
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return [cols.join(','), ...rows.map(r => cols.map(c => cell(r[c])).join(','))].join('\r\n');
}

export async function GET(req) {
  try {
    const sql = await db();
    await requireAdmin(req, sql);
    const q = new URL(req.url).searchParams;
    const type = q.get('type');
    const rows = await list(sql, type);
    if (q.get('format') === 'csv') {
      return new Response('﻿' + toCsv(rows), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="cuepointe-${type}-${new Date().toISOString().slice(0, 10)}.csv"`,
          'Cache-Control': 'no-store'
        }
      });
    }
    return json({ rows });
  } catch (e) {
    return fail(e);
  }
}

export async function PATCH(req) {
  try {
    const sql = await db();
    await requireAdmin(req, sql, { mutating: true });
    const { fields } = await readBody(req, 8 * 1024);
    const id = Number.parseInt(fields.id, 10);
    const status = String(fields.status || '');
    if (!Number.isInteger(id) || !STATUSES.includes(status)) throw httpError(400, 'Invalid status update.');
    let rows;
    if (fields.type === 'registrations') rows = await sql`UPDATE registrations SET status = ${status} WHERE id = ${id} RETURNING id`;
    else if (fields.type === 'messages') rows = await sql`UPDATE messages SET status = ${status} WHERE id = ${id} RETURNING id`;
    else if (fields.type === 'venues') rows = await sql`UPDATE venue_applications SET status = ${status} WHERE id = ${id} RETURNING id`;
    else throw httpError(400, 'Unknown record type.');
    if (!rows.length) throw httpError(404, 'Record not found.');
    return json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
