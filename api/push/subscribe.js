const { sql, ensureSchema, readJson, send } = require('../_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'POST' });
  await ensureSchema();
  const b = await readJson(req);
  if (!b.endpoint) return send(res, 400, { error: 'endpoint' });
  await sql`INSERT INTO web_push (endpoint, p256dh, auth, user_id) VALUES (${b.endpoint}, ${b.p256dh || ''}, ${b.auth || ''}, ${String(b.user_id || '')})
            ON CONFLICT (endpoint) DO UPDATE SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth, user_id = EXCLUDED.user_id`;
  return send(res, 200, { ok: true });
};
