// Rutas, usuarios y lista de pagos. Antes en el EC2 (/api/db).
const { ensureSchema, kvGet, kvSet, readJson, send, absorbPasswords, publicUsers } = require('./_lib');

module.exports = async (req, res) => {
  await ensureSchema();
  if (req.method === 'POST') {
    const b = await readJson(req);
    const cur = (await kvGet('db')) || { routes: [], users: [], payList: {} };
    const next = {
      routes: Array.isArray(b.routes) ? b.routes : cur.routes,
      users: Array.isArray(b.users) ? await absorbPasswords(b.users) : cur.users,
      payList: b.payList && typeof b.payList === 'object' ? b.payList : cur.payList,
    };
    await kvSet('db', next);
    return send(res, 200, { ok: true });
  }
  const db = (await kvGet('db')) || { routes: [], users: [], payList: {} };
  return send(res, 200, { ...db, users: publicUsers(db.users || []) });
};
