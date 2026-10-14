// Posición en vivo de un rider (cada pocos segundos mientras está "en ruta").
const { sql, ensureSchema, readJson, send } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'POST' });
  await ensureSchema();
  const b = await readJson(req);
  if (b.user_id == null) return send(res, 400, { error: 'user_id' });
  const id = String(b.user_id);
  if (b.active === false) {
    await sql`DELETE FROM web_live WHERE user_id = ${id}`;
  } else {
    const data = { user_id: b.user_id, lat: +b.lat, lng: +b.lng, speed: Math.round(+b.speed || 0), heading: +b.heading || 0,
      username: b.username || '', bike: b.bike || '', ts: Date.now() };
    await sql`INSERT INTO web_live (user_id, data, ts) VALUES (${id}, ${JSON.stringify(data)}::jsonb, ${Date.now()})
              ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data, ts = EXCLUDED.ts`;
  }
  return send(res, 200, { ok: true });
};
