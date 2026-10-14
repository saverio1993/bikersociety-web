// Utilidades compartidas del backend de la web en Vercel (Neon + Blob).
// Sustituye al EC2 (API en :8089) y a Nextcloud "HeyValue".
const crypto = require('crypto');
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

let _schema = null;
function ensureSchema() {
  if (!_schema) {
    _schema = (async () => {
      await sql`CREATE TABLE IF NOT EXISTS web_kv (key TEXT PRIMARY KEY, value JSONB NOT NULL, updated_at TIMESTAMPTZ DEFAULT now())`;
      await sql`CREATE TABLE IF NOT EXISTS web_files (path TEXT PRIMARY KEY, content TEXT, blob_url TEXT, ctype TEXT, updated_at TIMESTAMPTZ DEFAULT now())`;
      await sql`CREATE TABLE IF NOT EXISTS web_passwords (user_id TEXT PRIMARY KEY, hash TEXT NOT NULL)`;
      await sql`CREATE TABLE IF NOT EXISTS web_dm (id SERIAL PRIMARY KEY, user_id TEXT NOT NULL, user_name TEXT, text TEXT NOT NULL, from_admin BOOLEAN NOT NULL, read BOOLEAN NOT NULL DEFAULT false, ts BIGINT NOT NULL)`;
      await sql`CREATE TABLE IF NOT EXISTS web_live (user_id TEXT PRIMARY KEY, data JSONB NOT NULL, ts BIGINT NOT NULL)`;
      await sql`CREATE TABLE IF NOT EXISTS web_push (endpoint TEXT PRIMARY KEY, p256dh TEXT, auth TEXT, user_id TEXT)`;
    })().catch((e) => { _schema = null; throw e; });
  }
  return _schema;
}

async function kvGet(key) {
  const rows = await sql`SELECT value FROM web_kv WHERE key = ${key}`;
  return rows.length ? rows[0].value : null;
}
async function kvSet(key, value) {
  await sql`INSERT INTO web_kv (key, value, updated_at) VALUES (${key}, ${JSON.stringify(value)}::jsonb, now())
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
async function readJson(req) {
  const b = await readBody(req);
  if (!b.length) return {};
  try { return JSON.parse(b.toString('utf8')); } catch (e) { return {}; }
}

function send(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}

// ── Contraseñas ────────────────────────────────────────────────────────────
// La web guardaba las contraseñas en claro dentro de la lista de usuarios y
// /api/db la devolvía a cualquiera. Aquí se sacan a web_passwords (hash scrypt)
// y nunca vuelven al cliente.
function hashPassword(p) {
  const salt = crypto.randomBytes(16).toString('hex');
  return 'scrypt$' + salt + '$' + crypto.scryptSync(String(p), salt, 32).toString('hex');
}
function checkPassword(p, stored) {
  const [, salt, hex] = String(stored).split('$');
  if (!salt || !hex) return false;
  const a = crypto.scryptSync(String(p), salt, 32);
  const b = Buffer.from(hex, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').toLowerCase().split(',').map((s) => s.trim()).filter(Boolean);

// Guarda las contraseñas que traiga la lista y devuelve la lista sin ellas.
async function absorbPasswords(users) {
  if (!Array.isArray(users)) return users;
  const out = [];
  for (const u of users) {
    if (!u || typeof u !== 'object') { out.push(u); continue; }
    const { password, ...rest } = u;
    if (password && rest.id != null) {
      const id = String(rest.id);
      const rows = await sql`SELECT hash FROM web_passwords WHERE user_id = ${id}`;
      if (!rows.length || !checkPassword(password, rows[0].hash)) {
        const h = hashPassword(password);
        await sql`INSERT INTO web_passwords (user_id, hash) VALUES (${id}, ${h})
                  ON CONFLICT (user_id) DO UPDATE SET hash = EXCLUDED.hash`;
      }
    }
    out.push(rest);
  }
  return out;
}

// Limpia la lista antes de mandarla al cliente.
function publicUsers(users) {
  if (!Array.isArray(users)) return users;
  return users.map((u) => {
    if (!u || typeof u !== 'object') return u;
    const { password, ...rest } = u;
    if (rest.email && ADMIN_EMAILS.includes(String(rest.email).toLowerCase())) rest.is_admin = 1;
    return rest;
  });
}

module.exports = { sql, ensureSchema, kvGet, kvSet, readBody, readJson, send, checkPassword, absorbPasswords, publicUsers };
