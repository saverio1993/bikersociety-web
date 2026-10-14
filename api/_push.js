// Envío de notificaciones push (Web Push con claves VAPID de las env vars).
const webpush = require('web-push');
const { sql } = require('./_lib');

const PUB = process.env.VAPID_PUBLIC_KEY;
const PRIV = process.env.VAPID_PRIVATE_KEY;
if (PUB && PRIV) webpush.setVapidDetails('mailto:' + (process.env.ADMIN_EMAILS || 'admin@example.com').split(',')[0], PUB, PRIV);

async function pushAll(payload) {
  if (!PUB || !PRIV) return;
  const subs = await sql`SELECT endpoint, p256dh, auth FROM web_push`;
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload));
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) await sql`DELETE FROM web_push WHERE endpoint = ${s.endpoint}`;
    }
  }));
}

module.exports = { pushAll };
