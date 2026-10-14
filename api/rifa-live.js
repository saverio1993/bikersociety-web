// Estado en vivo de la rifa (overlay de resultado/campeón).
const { ensureSchema, kvGet, kvSet, readJson, send } = require('./_lib');

module.exports = async (req, res) => {
  await ensureSchema();
  if (req.method === 'POST') {
    const b = await readJson(req);
    await kvSet('rifa-live', { ...b, ts: b.ts || Date.now() });
    return send(res, 200, { ok: true });
  }
  return send(res, 200, (await kvGet('rifa-live')) || { active: false });
};
