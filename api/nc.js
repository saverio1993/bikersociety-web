// Sustituto de la WebDAV de Nextcloud ("/nc/..."). La web solo usa GET, HEAD,
// PUT y MKCOL. Los JSON van a Neon (web_files.content); fotos, vídeos y audio
// a Vercel Blob (web_files.blob_url).
const { put } = require('@vercel/blob');
const { sql, ensureSchema, readBody, absorbPasswords, publicUsers } = require('./_lib');

const MEDIA = /\.(jpe?g|png|webp|gif|heic|mp4|mov|webm|m4v|3gp|m4a|mp3|ogg|oga|wav|aac|opus)$/i;
const isUsersFile = (p) => /(^|\/)users\.json$/.test(p);

module.exports = async (req, res) => {
  const u = new URL(req.url, 'http://x');
  const path = '/' + (u.searchParams.get('p') || '').replace(/^\/+/, '');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS' || req.method === 'MKCOL') { res.statusCode = req.method === 'MKCOL' ? 201 : 204; return res.end(); }
  if (path === '/' || path.includes('..')) { res.statusCode = 404; return res.end(); }

  await ensureSchema();

  if (req.method === 'PUT') {
    const ctype = req.headers['content-type'] || 'application/octet-stream';
    if (MEDIA.test(path)) {
      const blob = await put('nc' + path, req, { access: 'public', contentType: ctype, addRandomSuffix: false, allowOverwrite: true });
      await sql`INSERT INTO web_files (path, blob_url, ctype, content, updated_at) VALUES (${path}, ${blob.url}, ${ctype}, NULL, now())
                ON CONFLICT (path) DO UPDATE SET blob_url = EXCLUDED.blob_url, ctype = EXCLUDED.ctype, content = NULL, updated_at = now()`;
    } else {
      let text = (await readBody(req)).toString('utf8');
      if (isUsersFile(path)) {
        try { text = JSON.stringify(await absorbPasswords(JSON.parse(text))); } catch (e) {}
      }
      await sql`INSERT INTO web_files (path, content, ctype, blob_url, updated_at) VALUES (${path}, ${text}, ${ctype}, NULL, now())
                ON CONFLICT (path) DO UPDATE SET content = EXCLUDED.content, ctype = EXCLUDED.ctype, blob_url = NULL, updated_at = now()`;
    }
    res.statusCode = 201;
    return res.end();
  }

  if (req.method === 'DELETE') {
    await sql`DELETE FROM web_files WHERE path = ${path}`;
    res.statusCode = 204;
    return res.end();
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') { res.statusCode = 405; return res.end(); }

  const rows = await sql`SELECT content, blob_url, ctype FROM web_files WHERE path = ${path}`;
  if (!rows.length) { res.statusCode = 404; return res.end(); }
  const f = rows[0];

  if (f.blob_url) {
    // <img>/<video> van directo al CDN de Blob. Un fetch() con Authorization
    // (avatares) recibe los bytes aquí mismo para no hacer un redirect CORS.
    if (!req.headers.authorization) { res.statusCode = 302; res.setHeader('Location', f.blob_url); return res.end(); }
    if (req.method === 'HEAD') { res.statusCode = 200; res.setHeader('Content-Type', f.ctype || 'application/octet-stream'); return res.end(); }
    const r = await fetch(f.blob_url);
    res.statusCode = r.status;
    res.setHeader('Content-Type', f.ctype || r.headers.get('content-type') || 'application/octet-stream');
    return res.end(Buffer.from(await r.arrayBuffer()));
  }

  let body = f.content || '';
  if (isUsersFile(path)) {
    try { body = JSON.stringify(publicUsers(JSON.parse(body))); } catch (e) {}
  }
  res.statusCode = 200;
  res.setHeader('Content-Type', f.ctype && f.ctype.includes('json') ? f.ctype : 'application/json; charset=utf-8');
  return req.method === 'HEAD' ? res.end() : res.end(body);
};
