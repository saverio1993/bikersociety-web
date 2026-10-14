// Proxy de /nc/* (WebDAV de Nextcloud "HeyValue") hacia el EC2.
// Las rewrites de Vercel no sirven aquí: no dejan pasar PROPFIND/MKCOL/MOVE y
// mandan cabeceras que Nextcloud rechaza como "untrusted domain".
const https = require('https');

const ORIGIN_HOST = 'bikersociety.duckdns.org';
const PASS_REQ = ['authorization', 'content-type', 'content-length', 'depth', 'range',
  'destination', 'overwrite', 'if-match', 'if-none-match', 'accept'];
const DROP_RES = ['connection', 'transfer-encoding', 'keep-alive', 'strict-transport-security',
  'content-security-policy', 'set-cookie'];

module.exports = (req, res) => {
  const u = new URL(req.url, 'http://x');
  const p = u.searchParams.get('p') || '';
  u.searchParams.delete('p');
  const qs = u.searchParams.toString();
  const path = '/nc/' + p.split('/').map(encodeURIComponent).join('/') + (qs ? '?' + qs : '');

  const headers = { host: ORIGIN_HOST };
  for (const h of PASS_REQ) if (req.headers[h]) headers[h] = req.headers[h];
  // MOVE/COPY llevan la URL completa de destino: apuntarla al origen
  if (headers.destination) {
    try {
      const d = new URL(headers.destination);
      headers.destination = 'https://' + ORIGIN_HOST + d.pathname + d.search;
    } catch (e) {}
  }

  const up = https.request({
    host: ORIGIN_HOST, path, method: req.method, headers,
    // TEMPORAL: el certificado de Let's Encrypt del EC2 caducó el 2026-09-02.
    // Quitar en cuanto se renueve (certbot renew).
    rejectUnauthorized: false,
  }, (r) => {
    const out = {};
    for (const [k, v] of Object.entries(r.headers)) if (!DROP_RES.includes(k)) out[k] = v;
    res.writeHead(r.statusCode, out);
    r.pipe(res);
  });
  up.on('error', (e) => { res.statusCode = 502; res.end('proxy error: ' + e.message); });
  req.pipe(up);
};
