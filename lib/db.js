// Database access for every API function.
// The connection string comes from the Neon integration (DATABASE_URL), never from code.
// On the first request after a deploy, the schema is created if missing and the five
// content documents are seeded from data/seed/*.json (only when they do not exist yet).
import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const sql = url ? neon(url) : null;

export const DOC_KEYS = ['players', 'matches', 'schedule', 'news', 'fund'];

let ready = null;

export function db() {
  if (!sql) {
    const e = new Error('The database is not connected yet. Add the Neon database to this Vercel project.');
    e.status = 503; e.expose = true;
    return Promise.reject(e);
  }
  if (!ready) ready = migrate().then(() => sql).catch(err => { ready = null; throw err; });
  return ready;
}

const TABLES = ['documents', 'registrations', 'messages', 'venue_applications', 'admins', 'sessions', 'rate_events'];

async function migrate() {
  const present = await sql`SELECT count(*)::int AS n FROM pg_tables
                            WHERE schemaname = 'public' AND tablename = ANY(${TABLES})`;
  if (present[0].n < TABLES.length) await createSchema();
  await seedDocuments();
}

async function createSchema() {
  await sql`CREATE TABLE IF NOT EXISTS documents (
    key text PRIMARY KEY,
    data jsonb NOT NULL,
    version integer NOT NULL DEFAULT 1,
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by text
  )`;
  await sql`CREATE TABLE IF NOT EXISTS registrations (
    id bigserial PRIMARY KEY,
    created_at timestamptz NOT NULL DEFAULT now(),
    first_name text NOT NULL,
    last_name text NOT NULL,
    phone text NOT NULL,
    email text,
    area text,
    location text,
    age integer,
    skill text,
    event text,
    source text,
    comments text,
    payment_path text,
    origin text NOT NULL DEFAULT 'site',
    status text NOT NULL DEFAULT 'new',
    ip_hash text
  )`;
  await sql`CREATE TABLE IF NOT EXISTS messages (
    id bigserial PRIMARY KEY,
    created_at timestamptz NOT NULL DEFAULT now(),
    name text NOT NULL,
    phone text,
    email text,
    contact text,
    subject text,
    message text NOT NULL,
    origin text NOT NULL DEFAULT 'site',
    status text NOT NULL DEFAULT 'new',
    ip_hash text
  )`;
  await sql`CREATE TABLE IF NOT EXISTS venue_applications (
    id bigserial PRIMARY KEY,
    created_at timestamptz NOT NULL DEFAULT now(),
    name text NOT NULL,
    venue text NOT NULL,
    address text,
    tables text,
    phone text NOT NULL,
    notes text,
    status text NOT NULL DEFAULT 'new',
    ip_hash text
  )`;
  await sql`CREATE TABLE IF NOT EXISTS admins (
    email text PRIMARY KEY,
    pass_hash text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS sessions (
    token_hash text PRIMARY KEY,
    email text NOT NULL REFERENCES admins(email) ON DELETE CASCADE,
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS rate_events (
    id bigserial PRIMARY KEY,
    kind text NOT NULL,
    key text NOT NULL,
    at timestamptz NOT NULL DEFAULT now()
  )`;
  await sql`CREATE INDEX IF NOT EXISTS rate_events_lookup ON rate_events (kind, key, at)`;
  await sql`CREATE INDEX IF NOT EXISTS registrations_created ON registrations (created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS messages_created ON messages (created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS venue_applications_created ON venue_applications (created_at DESC)`;
}

async function seedDocuments() {
  const have = new Set((await sql`SELECT key FROM documents`).map(r => r.key));
  for (const key of DOC_KEYS) {
    if (have.has(key)) continue;
    const seed = readFileSync(join(process.cwd(), 'data', 'seed', `${key}.json`), 'utf8');
    JSON.parse(seed); // fail loudly on a broken seed file
    await sql`INSERT INTO documents (key, data, version, updated_by)
              VALUES (${key}, ${seed}::jsonb, 1, 'seed')
              ON CONFLICT (key) DO NOTHING`;
  }
}
