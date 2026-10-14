// ============================================================
// HEYVALUE SYNC
// ============================================================
async function hvRequest(method, path, body, _attempt) {
  if (!HV.user || !HV.pass) return null;
  const opts = {
    method,
    // 'no-store': el navegador cacheaba posts.json/users.json y servía datos
    // viejos, por eso en otro navegador no aparecían los posts nuevos. Así
    // cada lectura va siempre fresca al servidor.
    cache: 'no-store',
    headers: { Authorization: 'Basic ' + btoa(HV.user + ':' + HV.pass) }
  };
  if (body && typeof body === 'string') {
    opts.headers['Content-Type'] = 'application/octet-stream';
  } else if (body) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  try {
    const r = await fetch(HV.url + '/nc' + path, opts);
    // HeyValue rate-limita (429) cuando llegan muchas peticiones a la vez.
    // Reintenta con backoff antes de darla por perdida.
    if (r.status === 429 && (_attempt || 0) < 3) {
      await new Promise(res => setTimeout(res, 400 * Math.pow(2, _attempt || 0)));
      return hvRequest(method, path, body, (_attempt || 0) + 1);
    }
    if (r.status === 207) return {ok:true, data: await r.json()};
    if (r.status === 200) {
      const t = await r.text();
      try { return {ok:true, data: JSON.parse(t)}; }
      catch(_) { return {ok:true, data: t}; }
    }
    if (r.status === 204 || r.status === 201) return {ok:true};
    const t = await r.text();
    return {ok:false, error: t.substring(0,200), status: r.status};
  } catch(e) { return {ok:false, error: e.message}; }
}

// El directorio base solo hace falta crearlo una vez por sesión — repetir el
// MKCOL en cada guardado duplicaba peticiones y ayudaba a disparar el 429.
const _hvDirsEnsured = new Set();
async function ensureHVDir(path) {
  if (_hvDirsEnsured.has(path)) return;
  await hvRequest('MKCOL', path);
  _hvDirsEnsured.add(path);
}

async function saveToHV(key, data) {
  const path = '/' + HV.syncKey + '/' + key + '.json';
  await ensureHVDir('/' + HV.syncKey);
  return hvRequest('PUT', path, data);
}

async function loadFromHV(key) {
  const r = await hvRequest('GET', '/' + HV.syncKey + '/' + key + '.json');
  if (r && r.ok && r.data) return r.data;
  return null;
}

// Versión de los posts segura para la nube: a los que aún tienen la imagen/
// video como dato local (data:/blob:) se les quita la media para NO subir
// archivos pesados ni URLs locales inválidas para otros. La media real se
// completa con su URL https cuando termina la subida en segundo plano.
function cloudSafePosts() {
  return (STATE.posts || []).map(p => {
    const url = p.media_url || p.image_url || '';
    if (url.startsWith('data:') || url.startsWith('blob:')) {
      const { media_url, image_url, ...rest } = p;
      return { ...rest, _pendingMedia: true };
    }
    return p;
  });
}

// Sube SOLO los posts a la nube — rápido y fiable, para publicar al instante.
async function pushPostsToCloud() {
  if (!HV.connected || !HV.user || STATE._cloudSynced === false) return;
  try { await saveToHV('posts', cloudSafePosts()); }
  catch (e) { console.warn('pushPostsToCloud falló:', e && e.message); }
}

async function syncToCloud() {
  if (!HV.user) return;
  STATE.syncStatus = 'syncing';
  // 'routes' NO va aquí: EC2 (/api/db) es la fuente autoritativa de rutas —
  // subirlas también a HeyValue era trabajo redundante que hacía más lento
  // cada guardado y podía pisar datos frescos de EC2 con una copia vieja.
  const tables = ['users','events','posts','badges','challenges','userChallenges','userBadges','chatChannels','chatMessages','notifications','attendance','comments','follows'];
  // Subir las 14 tablas a la vez saturaba a HeyValue y disparaba 429s.
  // Subir en tandas pequeñas reduce la concurrencia sin hacer el sync mucho más lento.
  const BATCH_SIZE = 4;
  for (let i = 0; i < tables.length; i += BATCH_SIZE) {
    const batch = tables.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(t => saveToHV(t, t === 'posts' ? cloudSafePosts() : (STATE[t] || []))));
  }
  await saveToHV('meta', {lastSync: new Date().toISOString(), version: 1});
  STATE.syncStatus = 'synced';
}

async function syncFromCloud(silent) {
  if (!HV.user) return;
  // 'routes' NO va aquí: EC2 (/api/db) es la fuente autoritativa de rutas (ver _ec2Sync).
  const tables = ['users','events','posts','badges','challenges','userChallenges','userBadges','chatChannels','chatMessages','notifications','attendance','comments','follows'];
  const results = await Promise.all(tables.map(t => loadFromHV(t)));
  let loaded = false;
  tables.forEach((t, i) => {
    const data = results[i];
    if (data && Array.isArray(data)) {
      // Block deleted IDs from being restored (routes + posts + users)
      const deletedRouteIds = STATE._deletedRouteIds || [];
      const deletedPostIds = STATE._deletedIds || [];
      const deletedUserIds = ls('_deletedUsers') || [];
      const blockedIds = new Set([...deletedRouteIds, ...deletedPostIds, ...deletedUserIds]);
      const filtered = data.filter(item => !blockedIds.has(item.id));

      // For users table: block local users not in cloud (deleted from cloud = authoritative)
      if (t === 'users') {
        const cloudIds = new Set(filtered.map(u => u.id));
        const localUsers = (STATE.users || []).filter(u => {
          // Keep: in cloud OR in SEED_USERS (always allow seed users)
          if (cloudIds.has(u.id)) return false; // in cloud, don't add separately
          const inSeed = SEED_USERS.some(s => s.id === u.id);
          return !inSeed; // keep only if not in seed (seed will be added below)
        });
        STATE[t] = [...localUsers, ...filtered];
      } else {
        // Merge by ID: cloud wins for same IDs, keep local-only items
        const cloudMap = new Map(filtered.map(item => [item.id, item]));
        const localOnly = (STATE[t] || []).filter(item => !cloudMap.has(item.id));
        STATE[t] = [...localOnly, ...filtered];
      }
      loaded = true;
    }
  });
  if (loaded) {
    // Clean related data for deleted users
    const deletedUserIds = ls('_deletedUsers') || [];
    if (deletedUserIds.length > 0) {
      const dSet = new Set(deletedUserIds);
      const cleanRelated = (arr, uidField) => arr.filter(item => !dSet.has(item[uidField]));
      STATE.userChallenges = cleanRelated(STATE.userChallenges || [], 'user_id');
      STATE.userBadges = cleanRelated(STATE.userBadges || [], 'user_id');
      STATE.notifications = cleanRelated(STATE.notifications || [], 'user_id').filter(n => !dSet.has(n.actor_id));
      STATE.attendance = cleanRelated(STATE.attendance || [], 'user_id');
      STATE.comments = cleanRelated(STATE.comments || [], 'user_id');
      STATE.follows = STATE.follows || [];
    }
    STATE.users = STATE.users.length ? STATE.users : [...SEED_USERS];
    STATE.badges = STATE.badges.length ? STATE.badges : [...SEED_BADGES];
    STATE.challenges = STATE.challenges.length ? STATE.challenges : [...SEED_CHALLENGES];
    STATE.events = STATE.events.length ? STATE.events : [...SEED_EVENTS];
    // EC2 is authoritative for routes — don't fall back to seeds here
    STATE.posts = STATE.posts.length ? STATE.posts : [...SEED_POSTS];
    STATE.chatChannels = STATE.chatChannels.length ? STATE.chatChannels : [...SEED_CHANNELS];
    STATE.chatMessages = STATE.chatMessages.length ? STATE.chatMessages : [...SEED_MESSAGES];
    STATE.userChallenges = STATE.userChallenges || [];
    STATE.userBadges = STATE.userBadges || [];
    STATE.notifications = STATE.notifications || [];
    STATE.attendance = STATE.attendance || [];
    STATE.comments = STATE.comments || [];
    STATE.follows = STATE.follows || [];
    saveLocal();
    if (!silent && STATE.currentPage) renderPage(STATE.currentPage);
  }
}

// ============================================================
// ONLINE PRESENCE — miembros en linea via HeyValue
// ============================================================
let _presenceInterval = null;
const PRESENCE_TIMEOUT_MS = 180000; // 3 min para considerarse "en linea"

async function updatePresence() {
  if (!STATE.user || !HV.user) return;
  try {
    const r = await hvRequest('GET', '/' + HV.syncKey + '/presence.json');
    let list = (r && r.ok && Array.isArray(r.data)) ? r.data : [];
    // Limpiar ids de usuarios que ya no existen
    const validIds = new Set(STATE.users.map(u => u.id));
    list = list.filter(p => validIds.has(p.id));
    // Actualizar o agregar este usuario
    list = list.filter(p => p.id !== STATE.user.id);
    list.push({ id: STATE.user.id, username: STATE.user.username, lastSeen: Date.now() });
    await hvRequest('PUT', '/' + HV.syncKey + '/presence.json', list);
  } catch(e) {}
}

async function loadOnlineCount() {
  const btn = document.getElementById('online-count-btn');
  if (!btn || !STATE.user) { if (btn) btn.innerHTML = ''; return; }
  try {
    const r = await hvRequest('GET', '/' + HV.syncKey + '/presence.json');
    const list = (r && r.ok && Array.isArray(r.data)) ? r.data : [];
    const cutoff = Date.now() - PRESENCE_TIMEOUT_MS;
    const online = list.filter(p => p.lastSeen > cutoff);
    if (online.length > 0) {
      btn.innerHTML = '<span class="online-dot"></span><span>' + online.length + ' en línea</span>';
      btn.title = online.map(p => p.username).join(', ');
    } else {
      btn.innerHTML = '';
    }
  } catch(e) {
    const btn = document.getElementById('online-count-btn');
    if (btn) btn.innerHTML = '';
  }
}

function startPresence() {
  if (_presenceInterval) clearInterval(_presenceInterval);
  updatePresence();
  loadOnlineCount();
  _presenceInterval = setInterval(() => { updatePresence(); loadOnlineCount(); }, 30000);
}

function showOnlineMembers() {
  const list = document.querySelector('#online-members-list');
  if (!list) return;
  // Ya se cargo arriba, solo abre el modal
  openModal('🟢 Miembros en línea', `
    <div id="online-members-list"></div>
  `);
  // Recargar para modal
  (async () => {
    try {
      const r = await hvRequest('GET', '/' + HV.syncKey + '/presence.json');
      const all = (r && r.ok && Array.isArray(r.data)) ? r.data : [];
      const cutoff = Date.now() - PRESENCE_TIMEOUT_MS;
      const online = all.filter(p => p.lastSeen > cutoff).map(p => {
        const u = STATE.users.find(x => x.id === p.id);
        return { ...p, avatar: u ? renderAvatar(u, 28) : '' };
      });
      const el = document.getElementById('online-members-list');
      if (!el) return;
      if (!online.length) {
        el.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text3)">No hay nadie en línea</div>';
        return;
      }
      el.innerHTML = online.map(p => `
        <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
          ${p.avatar}
          <span style="font-size:14px;font-weight:600">${escHtml(p.username)}</span>
          <span style="margin-left:auto;width:8px;height:8px;border-radius:50%;background:#22c55e;flex-shrink:0"></span>
        </div>
      `).join('');
    } catch(e) {
      const el = document.getElementById('online-members-list');
      if (el) el.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text3)">No se pudo cargar</div>';
    }
  })();
}

