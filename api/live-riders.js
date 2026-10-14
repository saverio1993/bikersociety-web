// Riders con posición de los últimos 2 minutos: { user_id: {...} }.
const { sql, ensureSchema, send } = require('./_lib');

module.exports = async (req, res) => {
  await ensureSchema();
  const since = Date.now() - 2 * 60 * 1000;
  await sql`DELETE FROM web_live WHERE ts < ${since - 60 * 60 * 1000}`;
  const rows = await sql`SELECT user_id, data FROM web_live WHERE ts >= ${since}`;
  return send(res, 200, Object.fromEntries(rows.map((r) => [r.user_id, r.data])));
};
