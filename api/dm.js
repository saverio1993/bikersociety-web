// Mensajes directos rider <-> admin.
// POST con text = mensaje nuevo. POST sin text y con read_uid = marcar leídos
// (from_admin:true -> el admin leyó los del rider; false -> el rider leyó los del admin).
const { sql, ensureSchema, readJson, send } = require('./_lib');

module.exports = async (req, res) => {
  await ensureSchema();
  if (req.method === 'POST') {
    const b = await readJson(req);
    if (b.text && b.user_id != null) {
      await sql`INSERT INTO web_dm (user_id, user_name, text, from_admin, ts)
                VALUES (${String(b.user_id)}, ${b.user_name || ''}, ${String(b.text).slice(0, 4000)}, ${!!b.from_admin}, ${Date.now()})`;
    } else if (b.read_uid != null) {
      await sql`UPDATE web_dm SET read = true WHERE user_id = ${String(b.read_uid)} AND from_admin = ${!b.from_admin}`;
    }
    return send(res, 200, { ok: true });
  }
  const userId = new URL(req.url, 'http://x').searchParams.get('userId');
  if (!userId) return send(res, 200, { messages: [], total: 0 });
  const messages = await sql`SELECT text, from_admin, read, ts::float8 AS ts, user_id, user_name FROM web_dm WHERE user_id = ${userId} ORDER BY ts ASC LIMIT 500`;
  return send(res, 200, { messages, total: messages.length });
};
