// Login con usuario/email + contraseña, verificado en el servidor.
const { sql, ensureSchema, kvGet, readJson, send, checkPassword, publicUsers } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'POST' });
  await ensureSchema();
  const { user, pass } = await readJson(req);
  const q = String(user || '').trim().toLowerCase();
  if (!q || !pass) return send(res, 400, { error: 'Faltan datos' });

  const db = (await kvGet('db')) || {};
  const rows = await sql`SELECT content FROM web_files WHERE path LIKE '%/users.json'`;
  let all = Array.isArray(db.users) ? db.users : [];
  for (const r of rows) { try { all = all.concat(JSON.parse(r.content) || []); } catch (e) {} }

  const cands = all.filter((x) => x && (String(x.username || '').toLowerCase() === q || String(x.email || '').toLowerCase() === q));
  for (const c of cands) {
    const h = await sql`SELECT hash FROM web_passwords WHERE user_id = ${String(c.id)}`;
    if (h.length && checkPassword(pass, h[0].hash)) return send(res, 200, { user: publicUsers([c])[0] });
  }
  return send(res, 401, { error: 'Usuario o contraseña incorrectos' });
};
