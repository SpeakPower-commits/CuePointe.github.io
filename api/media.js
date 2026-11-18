// GET /api/media?path=public/... — serves photos uploaded from the admin panel.
// vercel.json rewrites /media/<folder>/<file> here. Only the public/ prefix is readable;
// payment screenshots live under private/ and are only served to signed-in admins.
import { get } from '@vercel/blob';
import { json, fail } from '../lib/http.js';

const SAFE = /^public\/[A-Za-z0-9/_.-]{1,200}$/;
const IMAGE = /^image\/(jpeg|png|webp|gif)$/;

export async function GET(req) {
  try {
    const path = new URL(req.url).searchParams.get('path') || '';
    if (!SAFE.test(path) || path.includes('..')) return json({ error: 'Not found.' }, 404);
    const result = await get(path, { access: 'private' });
    if (!result || result.statusCode !== 200 || !IMAGE.test(result.blob.contentType || '')) {
      return json({ error: 'Not found.' }, 404);
    }
    return new Response(result.stream, {
      headers: {
        'Content-Type': result.blob.contentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        'X-Content-Type-Options': 'nosniff'
      }
    });
  } catch (e) {
    return fail(e);
  }
}
