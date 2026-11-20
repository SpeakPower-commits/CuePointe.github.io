// Content documents (players, matches, schedule, news, fund) for the admin panel.
// GET  /api/admin/doc?keys=players,matches   -> { docs: { players: { data, version }, ... } }
// PUT  /api/admin/doc  { docs: [ { key, data, version }, ... ] }
//   Saves all listed documents in ONE statement, only if every version still matches
//   (same idea as the GitHub SHA check). Otherwise 409 and nothing is written.
import { db, DOC_KEYS } from '../../lib/db.js';
import { json, fail, httpError, readBody } from '../../lib/http.js';
import { requireAdmin } from '../../lib/auth.js';

const SHAPE = {
  players: d => Array.isArray(d),
  matches: d => d && Array.isArray(d.matches),
  schedule: d => d && Array.isArray(d.events),
  news: d => d && Array.isArray(d.posts),
  fund: d => d && d.stats && typeof d.stats === 'object' && Array.isArray(d.entries),
  about: d => d && Array.isArray(d.photos) && Array.isArray(d.partners) && validAbout(d)
};

// About-page images must be our own uploads; partner links must be ordinary web addresses.
const OWN_IMAGE = /^(media|images)\/[A-Za-z0-9/_.-]{1,200}$/;
const WEB = /^https?:\/\/[^\s"'<>]{3,300}$/i;
function validAbout(d) {
  if (d.photos.length > 60 || d.partners.length > 60) return false;
  for (const p of d.photos) {
    if (!p || !OWN_IMAGE.test(String(p.src || '')) || String(p.caption || '').length > 200) return false;
  }
  for (const p of d.partners) {
    if (!p || !String(p.name || '').trim() || String(p.name).length > 120) return false;
    if (p.logo && !OWN_IMAGE.test(String(p.logo))) return false;
    if (p.url && !WEB.test(String(p.url))) return false;
    if (String(p.blurb || '').length > 400) return false;
  }
  return true;
}

export async function GET(req) {
  try {
    const sql = await db();
    await requireAdmin(req, sql);
    const keys = (new URL(req.url).searchParams.get('keys') || DOC_KEYS.join(','))
      .split(',').map(s => s.trim()).filter(k => DOC_KEYS.includes(k));
    const rows = await sql`SELECT key, data, version FROM documents WHERE key = ANY(${keys})`;
    const docs = {};
    for (const r of rows) docs[r.key] = { data: r.data, version: r.version };
    return json({ docs });
  } catch (e) {
    return fail(e);
  }
}

export async function PUT(req) {
  try {
    const sql = await db();
    const email = await requireAdmin(req, sql, { mutating: true });
    const { fields } = await readBody(req, 3 * 1024 * 1024);
    const docs = Array.isArray(fields.docs) ? fields.docs : [];
    if (!docs.length || docs.length > DOC_KEYS.length) throw httpError(400, 'Nothing to save.');
    const seen = new Set();
    for (const d of docs) {
      if (!DOC_KEYS.includes(d.key) || seen.has(d.key)) throw httpError(400, 'Unknown or repeated document.');
      if (!Number.isInteger(d.version)) throw httpError(400, 'Missing version.');
      if (!SHAPE[d.key](d.data)) throw httpError(400, `The ${d.key} data is not in the expected format.`);
      seen.add(d.key);
    }
    const payload = JSON.stringify(docs.map(d => ({ key: d.key, data: d.data, version: d.version })));
    const rows = await sql`
      WITH input AS (
        SELECT * FROM jsonb_to_recordset(${payload}::jsonb) AS x(key text, data jsonb, version integer)
      ), check_all AS (
        SELECT count(*) = (SELECT count(*) FROM input) AS ok
        FROM input i JOIN documents d ON d.key = i.key AND d.version = i.version
      )
      UPDATE documents d
         SET data = i.data, version = d.version + 1, updated_at = now(), updated_by = ${email}
        FROM input i, check_all c
       WHERE d.key = i.key AND d.version = i.version AND c.ok
      RETURNING d.key, d.version`;
    if (rows.length !== docs.length) {
      throw httpError(409, 'Someone else saved a change since you loaded this page. The latest data has been reloaded. Please redo your change and save again.');
    }
    const versions = {};
    for (const r of rows) versions[r.key] = r.version;
    return json({ ok: true, versions });
  } catch (e) {
    return fail(e);
  }
}
