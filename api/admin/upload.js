// POST /api/admin/upload (multipart: file, folder, name)
// Stores site photos in Vercel Blob instead of committing images into git history.
// Returns the path to use on the site, e.g. media/images/players/0002.jpg
import { put } from '@vercel/blob';
import { db } from '../../lib/db.js';
import { json, fail, httpError, readBody } from '../../lib/http.js';
import { requireAdmin } from '../../lib/auth.js';

const FOLDERS = ['images/players', 'images/team', 'images/partners', 'images/about', 'images/news', 'images'];
const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };

export async function POST(req) {
  try {
    const sql = await db();
    await requireAdmin(req, sql, { mutating: true });
    const { fields, form } = await readBody(req);
    const file = form ? form.get('file') : null;
    if (!file || typeof file === 'string' || !file.size) throw httpError(400, 'Choose an image first.');
    if (!TYPES[file.type]) throw httpError(400, 'Use a JPG, PNG, WEBP or GIF image.');
    if (file.size > 4 * 1024 * 1024) throw httpError(413, 'Image is over 4 MB. Please compress it first.');
    const folder = FOLDERS.includes(fields.folder) ? fields.folder : null;
    if (!folder) throw httpError(400, 'Unknown folder.');
    let name = String(fields.name || file.name || '').replace(/[^A-Za-z0-9._-]/g, '-').replace(/^[.-]+/, '').slice(0, 80);
    if (!name) name = `photo-${Date.now()}`;
    if (!/\.[A-Za-z0-9]{2,5}$/.test(name)) name += '.' + TYPES[file.type];

    const blob = await put(`public/${folder}/${name}`, file, {
      access: 'private',
      contentType: file.type,
      addRandomSuffix: false,
      allowOverwrite: true
    });
    return json({ ok: true, path: 'media/' + blob.pathname.replace(/^public\//, '') }, 201);
  } catch (e) {
    return fail(e);
  }
}
