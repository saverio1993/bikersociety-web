// Mensaje del admin a todos (overlay). Además manda push a los suscritos.
const { ensureSchema, kvGet, kvSet, readJson, send } = require('./_lib');
const { pushAll } = require('./_push');

module.exports = async (req, res) => {
  await ensureSchema();
  if (req.method === 'POST') {
    const b = await readJson(req);
    const data = b.active ? { active: true, text: String(b.text || ''), ts: Date.now() } : { active: false, ts: Date.now() };
    await kvSet('broadcast', data);
    if (data.active && data.text) await pushAll({ title: 'Biker Society', body: data.text });
    return send(res, 200, { ok: true });
  }
  return send(res, 200, (await kvGet('broadcast')) || { active: false });
};
