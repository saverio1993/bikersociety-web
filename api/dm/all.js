// Bandeja del admin: una conversación por rider.
const { sql, ensureSchema, send } = require('../_lib');

module.exports = async (req, res) => {
  await ensureSchema();
  const conversations = await sql`
    SELECT DISTINCT ON (user_id) user_id, user_name, text AS last_text, ts::float8 AS last_ts,
      (SELECT count(*)::int FROM web_dm d2 WHERE d2.user_id = d.user_id AND NOT d2.from_admin AND NOT d2.read) AS unread
    FROM web_dm d ORDER BY user_id, ts DESC`;
  conversations.sort((a, b) => b.last_ts - a.last_ts);
  return send(res, 200, { conversations });
};
