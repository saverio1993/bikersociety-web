// ============================================================
// NOTIFICATIONS
// ============================================================
function updateNotifBadge() {
  if (!STATE.user) return;
  const unread = (STATE.notifications || []).filter(n => n.user_id === STATE.user.id && !n.read).length;
  const badge = document.getElementById('notif-badge');
  if (!badge) return;
  if (unread > 0) {
    badge.textContent = unread > 9 ? '9+' : unread;
    badge.style.display = 'block';
  } else {
    badge.style.display = 'none';
  }
}

function showNotifications() {
  if (!STATE.user) return;
  const myNotifs = (STATE.notifications || [])
    .filter(n => n.user_id === STATE.user.id)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 30);

  const typeIcon = { like: '❤️', comment: '💬', badge: '🏆', route: '🏍️', event: '📅' };

  openModal('Notificaciones', `
    <div style="max-height:65vh;overflow-y:auto;margin:-4px">
      ${myNotifs.length === 0
        ? '<div style="text-align:center;padding:32px;color:var(--text3)"><div style="font-size:36px;margin-bottom:8px">🔔</div><div style="font-size:13px">Sin notificaciones aún</div></div>'
        : myNotifs.map(n => {
            const isUnread = !n.read;
            const hasPost  = !!n.post_id;
            const icon = typeIcon[n.type] || '🔔';
            return `
              <div onclick="${hasPost ? `goToNotifPost(${n.post_id})` : ''}"
                style="display:flex;align-items:flex-start;gap:10px;padding:11px 10px;border-radius:12px;margin-bottom:4px;
                  ${isUnread ? 'background:rgba(255,68,68,0.07);border:1px solid rgba(255,68,68,0.15)' : 'border:1px solid transparent'};
                  ${hasPost ? 'cursor:pointer' : ''}">
                <div style="width:36px;height:36px;border-radius:50%;background:${isUnread ? 'rgba(255,68,68,0.15)' : 'var(--surface2)'};display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0">${icon}</div>
                <div style="flex:1;min-width:0">
                  <div style="font-size:13px;font-weight:${isUnread ? '700' : '500'};color:${isUnread ? 'var(--text)' : 'var(--text2)'}">${escHtml(n.message)}</div>
                  <div style="font-size:10px;color:var(--text3);margin-top:3px">${timeAgo(n.created_at)}</div>
                </div>
                ${hasPost ? '<div style="font-size:12px;color:var(--text3);flex-shrink:0;align-self:center">›</div>' : ''}
              </div>
            `;
          }).join('')
      }
    </div>
    <div style="display:flex;gap:8px;margin-top:8px;padding-top:8px;border-top:1px solid var(--border)">
      <button class="btn btn-ghost" style="flex:1;font-size:12px" onclick="markAllNotifsRead()">✓ Marcar leídas</button>
      <button class="btn btn-ghost" style="flex:1;font-size:12px;color:var(--danger)" onclick="clearAllNotifs()">🗑️ Borrar todas</button>
    </div>
  `);

  // Mark as read silently
  STATE.notifications = STATE.notifications.map(n =>
    n.user_id === STATE.user.id ? {...n, read: true} : n
  );
  saveState();
  updateNotifBadge();
}

function goToNotifPost(postId) {
  closeModal();
  STATE._highlightPost = postId;
  navigate('bikergram');
}

function markAllNotifsRead() {
  STATE.notifications = (STATE.notifications || []).map(n => ({...n, read: true}));
  saveState();
  updateNotifBadge();
  closeModal();
  toast('Notificaciones marcadas como leídas');
}

function clearAllNotifs() {
  if (!STATE.user) return;
  STATE.notifications = (STATE.notifications || []).filter(n => n.user_id !== STATE.user.id);
  saveState();
  updateNotifBadge();
  closeModal();
  toast('Notificaciones eliminadas');
}

// ============================================================
// MODAL
// ============================================================
function openModal(title, content) {
  document.getElementById('modal-content').innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <div style="font-size:16px;font-weight:700">${title}</div>
      <button class="modal-x" onclick="closeModal()">✕</button>
    </div>
    ${content}
  `;
  document.getElementById('modal').classList.add('open');
}

function closeModal() {
  document.getElementById('modal').classList.remove('open');
}

let LIGHTBOX_URL = '';
function openLightbox(url) {
  const lb = document.getElementById('lightbox');
  const img = document.getElementById('lightbox-img');
  LIGHTBOX_URL = url;
  img.src = url;
  lb.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  const lb = document.getElementById('lightbox');
  lb.style.display = 'none';
  document.getElementById('lightbox-img').src = '';
  LIGHTBOX_URL = '';
  document.body.style.overflow = '';
}

function downloadLightboxImage() {
  if (!LIGHTBOX_URL) return;
  const a = document.createElement('a');
  a.href = LIGHTBOX_URL;
  a.download = 'bikergram_' + Date.now() + '.jpg';
  a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ============================================================
// INIT
// ============================================================
// Safety: hide splash after 5s no matter what (catch any crash in initApp)
setTimeout(() => {
  const s = document.getElementById('splash');
  if (s && s.style.display !== 'none') {
    console.warn('[BS] Splash safety timeout — initApp may have crashed, forcing UI');
    s.style.display = 'none';
    const t = document.getElementById('topbar');
    const b = document.getElementById('bottomnav');
    if (t) t.style.display = 'none';
    if (b) b.style.display = 'none';
    if (typeof showLogin === 'function') showLogin();
  }
}, 5000);
document.addEventListener('DOMContentLoaded', () => {
  // ONE-TIME CLEANUP: clear all BikerGram posts
  if (!localStorage.getItem('_postsCleaned')) {
    localStorage.setItem('bs_posts', '[]');
    localStorage.setItem('_postsCleaned', '1');
  }
  initApp();
});

// ===== INDEXED DB LAYER =====
let DB = null;
const DB_NAME = 'BikerGramDB';
const DB_VERSION = 1;
const STORES = ['posts', 'comments', 'follows', 'sync_queue'];

function initIndexedDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => { DB = req.result; resolve(DB); };
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('posts')) {
        const ps = db.createObjectStore('posts', {keyPath: 'id'});
        ps.createIndex('user_id', 'user_id', {unique: false});
        ps.createIndex('created_at', 'created_at', {unique: false});
      }
      if (!db.objectStoreNames.contains('comments')) {
        const cm = db.createObjectStore('comments', {keyPath: 'id', autoIncrement: true});
        cm.createIndex('post_id', 'post_id', {unique: false});
      }
      if (!db.objectStoreNames.contains('follows')) {
        const fl = db.createObjectStore('follows', {keyPath: 'id'});
        fl.createIndex('follower_id', 'follower_id', {unique: false});
        fl.createIndex('following_id', 'following_id', {unique: false});
      }
      if (!db.objectStoreNames.contains('sync_queue')) {
        const sq = db.createObjectStore('sync_queue', {keyPath: 'id', autoIncrement: true});
        sq.createIndex('status', 'status', {unique: false});
      }
      if (!db.objectStoreNames.contains('routes')) {
        const rr = db.createObjectStore('routes', {keyPath: 'id'});
        rr.createIndex('created_by', 'created_by', {unique: false});
      }
    };
  });
}

function idbGet(store, key) {
  return new Promise((resolve, reject) => {
    if (!DB) { resolve(null); return; }
    const tx = DB.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbPut(store, data, key) {
  return new Promise((resolve, reject) => {
    if (!DB) { resolve(null); return; }
    const tx = DB.transaction(store, 'readwrite');
    if (key !== undefined) data.id = key;
    const req = tx.objectStore(store).put(data);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbGetAll(store) {
  return new Promise((resolve, reject) => {
    if (!DB) { resolve([]); return; }
    const tx = DB.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

function idbDelete(store, key) {
  return new Promise((resolve, reject) => {
    if (!DB) { resolve(null); return; }
    const tx = DB.transaction(store, 'readwrite');
    const req = tx.objectStore(store).delete(key);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

// ===== SYNC QUEUE =====
function syncQueuePush(action, storeName, data) {
  return idbPut('sync_queue', {
    action,
    store_name: storeName,
    data,
    created_at: new Date().toISOString(),
    status: 'pending'
  });
}

async function syncQueueProcess() {
  if (!DB || !HV.connected) return;
  const items = await idbGetAll('sync_queue');
  const pending = items.filter(i => i.status === 'pending');
  for (const item of pending) {
    try {
      const tableMap = {posts: 'posts', comments: 'comments', follows: 'follows'};
      const table = tableMap[item.store_name];
      if (!table) { await idbDelete('sync_queue', item.id); continue; }
      await saveToHV(table, STATE[item.store_name] || []);
      item.status = 'done';
      await idbPut('sync_queue', item, item.id);
    } catch(e) { /* keep pending */ }
  }
}

// ===== REACTIONS SYSTEM =====
const REACTION_EMOJIS = ['❤️', '😂', '😮', '😢', '😡'];

function getReactions(postId) {
  const p = STATE.posts.find(x => x.id === postId);
  if (!p) return {};
  const reactions = p.reactions || {};
  return reactions;
}

function renderReactions(postId) {
  const reactions = getReactions(postId);
  const total = Object.values(reactions).reduce((a, b) => a + b, 0);
  if (total === 0) return '';
  const badges = Object.entries(reactions)
    .filter(([, c]) => c > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([emoji, count]) => `<span style="background:rgba(255,255,255,0.1);padding:2px 7px;border-radius:10px;font-size:12px;margin-right:4px">${emoji} ${count}</span>`)
    .join('');
  return `<div style="padding:6px 14px;font-size:12px;color:var(--text2)">${badges}</div>`;
}

function addReaction(postId, emoji) {
  if (!STATE.user) return;
  const p = STATE.posts.find(x => x.id === postId);
  if (!p) return;
  if (!p.reactions) p.reactions = {};
  // Toggle: if same emoji, remove; else set
  const userId = String(STATE.user.id);
  if (p._reactionUser === userId && p._reactionEmoji === emoji) {
    p.reactions[emoji] = Math.max(0, (p.reactions[emoji] || 1) - 1);
    p._reactionUser = null;
    p._reactionEmoji = null;
  } else {
    // Remove old reaction count
    if (p._reactionEmoji && p.reactions[p._reactionEmoji]) {
      p.reactions[p._reactionEmoji] = Math.max(0, p.reactions[p._reactionEmoji] - 1);
    }
    p.reactions[emoji] = (p.reactions[emoji] || 0) + 1;
    p._reactionUser = userId;
    p._reactionEmoji = emoji;
  }
  saveState();
  syncQueuePush('update', 'posts', p);
  renderBikerGram();
}

function showReactionPicker(postId, btn) {
  // Remove existing picker
  const existing = document.querySelector('.reaction-picker');
  if (existing) { existing.remove(); return; }
  const picker = document.createElement('div');
  picker.className = 'reaction-picker';
  picker.style.cssText = 'position:absolute;bottom:40px;left:0;background:var(--surface);border:1px solid rgba(255,200,0,0.35);border-radius:16px;padding:8px 10px;display:flex;gap:4px;z-index:100;box-shadow:0 4px 20px rgba(0,0,0,0.5),0 0 16px rgba(255,200,0,0.12)';
  REACTION_EMOJIS.forEach(emoji => {
    const b = document.createElement('button');
    b.textContent = emoji;
    b.style.cssText = 'background:none;border:none;font-size:20px;cursor:pointer;padding:2px;transition:transform 0.1s;border-radius:50%';
    b.onmouseover = () => b.style.transform = 'scale(1.35)';
    b.onmouseout = () => b.style.transform = 'scale(1)';
    b.onclick = () => { addReaction(postId, emoji); picker.remove(); };
    picker.appendChild(b);
  });
  btn.style.position = 'relative';
  btn.parentElement.appendChild(picker);
  // Close on outside click
  setTimeout(() => {
    const close = (e) => { if (!picker.contains(e.target)) { picker.remove(); document.removeEventListener('click', close); } };
    document.addEventListener('click', close);
  }, 50);
}

// ===== COMMENTS SYSTEM =====
function renderComments(postId) {
  const comments = STATE.comments ? STATE.comments.filter(c => c.post_id === postId) : [];
  if (comments.length === 0) return '';
  const row = c => {
    const author = STATE.users.find(u => u.id === c.user_id) || {username: '?', avatar: ''};
    return `<div style="display:flex;gap:8px;padding:5px 14px">
      <div style="width:26px;height:26px;flex-shrink:0">${renderAvatar(author, 26)}</div>
      <div style="flex:1;background:rgba(255,255,255,0.05);border-radius:12px;padding:6px 10px;min-width:0">
        <div style="font-size:11px;font-weight:700;color:var(--text2)">${author.username}</div>
        <div style="font-size:13px;word-break:break-word">${c.text}</div>
      </div>
    </div>`;
  };
  // Pocos comentarios: se muestran todos. Muchos: estilo Instagram — los 2
  // últimos visibles + "Ver los N comentarios" que despliega los anteriores.
  if (comments.length <= 3) return comments.map(row).join('');
  const older = comments.slice(0, comments.length - 2);
  const latest = comments.slice(comments.length - 2);
  return `
    <button id="vermas-${postId}" onclick="showAllComments(${postId})" style="background:none;border:none;color:var(--text2);font-size:12px;font-weight:600;padding:6px 14px;cursor:pointer;display:block;text-align:left">Ver los ${comments.length} comentarios</button>
    <div id="older-comments-${postId}" style="display:none">${older.map(row).join('')}</div>
    ${latest.map(row).join('')}`;
}

function addComment(postId, text) {
  if (!STATE.user || !text.trim()) return;
  const comment = {
    id: Date.now() % 100000,
    post_id: postId,
    user_id: STATE.user.id,
    text: text.trim(),
    created_at: new Date().toISOString()
  };
  STATE.comments = STATE.comments || [];
  STATE.comments.push(comment);
  saveState();
  syncQueuePush('create', 'comments', comment);
  // Update comment count on post
  const p = STATE.posts.find(x => x.id === postId);
  if (p) { p.comments_count = (p.comments_count || 0) + 1; saveState(); }
  renderBikerGram();
}

// ===== SHARE SYSTEM =====
function sharePost(postId) {
  const url = location.origin + '?post=' + postId;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(() => toast('Enlace copiado!'));
  } else {
    prompt('Copia este enlace:', url);
  }
}

// ===== FOLLOW SYSTEM =====
function isFollowing(userId) {
  if (!STATE.user) return false;
  const f = STATE.follows || [];
  return f.some(x => x.follower_id === STATE.user.id && x.following_id === userId);
}

function toggleFollow(userId) {
  if (!STATE.user) return;
  STATE.follows = STATE.follows || [];
  const idx = STATE.follows.findIndex(x => x.follower_id === STATE.user.id && x.following_id === userId);
  if (idx >= 0) {
    STATE.follows.splice(idx, 1);
    toast('Dejaste de seguir');
  } else {
    STATE.follows.push({follower_id: STATE.user.id, following_id: userId, created_at: new Date().toISOString()});
    toast('Ahora sigues a este rider');
  }
  saveState();
  syncQueuePush('update', 'follows', STATE.follows);
  renderPage(STATE.currentPage);
}

function getFollowerCount(userId) {
  return (STATE.follows || []).filter(x => x.following_id === userId).length;
}

function getFollowingCount(userId) {
  return (STATE.follows || []).filter(x => x.follower_id === userId).length;
}

// ===== INSTANT POST CREATION =====
async function createPostInstant(content, mediaData) {
  if (!STATE.user) return;
  const post = {
    id: Date.now() % 100000,
    user_id: STATE.user.id,
    username: STATE.user.username,
    user_avatar: STATE.user.avatar || '',
    user_bike: STATE.user.bike_model || '',
    content,
    media_type: mediaData?.type || null,
    media_url: mediaData?.url || null,
    image_url: mediaData?.type === 'image' ? mediaData.url : null,
    created_at: new Date().toISOString(),
    likes: [],
    reactions: {},
    comments_count: 0,
    synced: false
  };
  // Save to IndexedDB immediately
  if (DB) await idbPut('posts', post, post.id);
  // Show in UI instantly
  STATE.posts.unshift(post);
  renderBikerGram();
  saveLocal();
  // Sube el registro del post a la nube AL INSTANTE (sin esperar la media).
  // Los posts de texto quedan completos; los de imagen/video suben su registro
  // ahora y la media se añade (URL https) cuando termina la subida.
  pushPostsToCloud();
  // Upload media in background
  if (mediaData?.blob && HV.user && HV.pass) {
    uploadMediaAsync(post.id, mediaData);
  }
}

// Estado de subida en vivo por post: {pct, failed, media} — alimenta el badge del feed
const UPLOAD_STATE = {};

// Actualiza el badge en el DOM sin re-renderizar todo el feed (la subida emite
// muchos eventos de progreso; un render completo por evento sería muy costoso)
function updateUploadBadge(postId) {
  const st = UPLOAD_STATE[postId];
  document.querySelectorAll(`[data-upload-badge="${postId}"]`).forEach(el => {
    if (!st) return;
    if (st.failed) {
      el.style.background = 'rgba(239,68,68,0.15)';
      el.style.color = '#ef4444';
      el.style.cursor = 'pointer';
      el.textContent = '❌ Fallo — toca para reintentar';
    } else {
      el.textContent = '⏳ Subiendo' + (st.pct != null ? ' ' + st.pct + '%' : '...');
    }
  });
}

async function uploadMediaAsync(postId, mediaData, attempt = 0) {
  const typeFolder = mediaData.type === 'video' ? 'videos' : mediaData.type === 'audio' ? 'audio' : 'photos';
  const ext = mediaData.fileName ? mediaData.fileName.split('.').pop() : (mediaData.type === 'image' ? 'jpg' : 'mp4');
  const filename = Date.now() + '_' + Math.random().toString(36).substring(2, 8) + '.' + ext;
  const path = '/' + HV.gramFolder + '/' + typeFolder + '/' + filename;
  const uploadUrl = HV.url + '/nc' + path;
  UPLOAD_STATE[postId] = { pct: 0, failed: false, media: mediaData };
  updateUploadBadge(postId);
  try {
    const blob = mediaData.blob;
    await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Authorization', 'Basic ' + btoa(HV.user + ':' + HV.pass));
      xhr.setRequestHeader('Content-Type', mediaData.mimeType || 'application/octet-stream');
      xhr.upload.onprogress = ev => {
        if (ev.lengthComputable && UPLOAD_STATE[postId]) {
          UPLOAD_STATE[postId].pct = Math.round(ev.loaded / ev.total * 100);
          updateUploadBadge(postId);
        }
      };
      xhr.onload = () => {
        if (xhr.status === 201 || xhr.status === 204 || xhr.status === 200) resolve();
        else reject(new Error('HTTP ' + xhr.status));
      };
      xhr.onerror = () => reject(new Error('Error'));
      xhr.ontimeout = () => reject(new Error('Timeout'));
      xhr.timeout = 300000;
      xhr.send(blob);
    });
    delete UPLOAD_STATE[postId];
    // Update post with real URL
    const p = STATE.posts.find(x => x.id === postId);
    if (p) {
      p.media_url = uploadUrl;
      p.image_url = mediaData.type === 'image' ? uploadUrl : null;
      p.synced = true;
      if (DB) await idbPut('posts', p, p.id);
      saveLocal();
      // La media ya está alojada (URL https): súbela a la nube para que el
      // post aparezca COMPLETO (con foto/video) en los demás dispositivos.
      await pushPostsToCloud();
      renderBikerGram();
    }
  } catch(e) {
    console.warn('Media upload failed (intento ' + (attempt + 1) + '):', e);
    if (attempt < 2) {
      // Reintento automático: 3s el primero, 10s el segundo
      setTimeout(() => uploadMediaAsync(postId, mediaData, attempt + 1), attempt === 0 ? 3000 : 10000);
      return;
    }
    UPLOAD_STATE[postId] = { failed: true, media: mediaData };
    updateUploadBadge(postId);
    toast('No se pudo subir el archivo — toca el badge rojo para reintentar');
  }
}

// Reintento manual desde el badge rojo del post
function retryUploadNow(postId) {
  const st = UPLOAD_STATE[postId];
  const p = STATE.posts.find(x => x.id === postId);
  let media = st?.media;
  if (!media && p && (p.media_url || '').startsWith('data:')) {
    const blob = dataURLtoBlob(p.media_url);
    if (blob) {
      const ext = (blob.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
      media = { type: p.media_type || 'image', blob, fileName: 'retry.' + ext, mimeType: blob.type };
    }
  }
  if (!media) { toast('No hay datos locales para reintentar'); return; }
  toast('Reintentando subida...');
  uploadMediaAsync(postId, media, 0);
}

// Recover posts whose large media (data:/blob: URLs) were stripped from localStorage
// to avoid quota errors, restoring them from IndexedDB so they appear again on reload.
async function recoverPendingPostMedia() {
  if (!DB) return;
  const pending = (STATE.posts || []).filter(p => p._pendingMedia);
  if (!pending.length) return;
  let restored = false;
  for (const p of pending) {
    try {
      const idbPost = await idbGet('posts', p.id);
      if (idbPost && (idbPost.media_url || idbPost.image_url)) {
        p.media_url = idbPost.media_url;
        p.image_url = idbPost.image_url;
        p.media_type = idbPost.media_type || p.media_type;
        restored = true;
      }
    } catch(e) { console.warn('Recover post media failed:', e); }
    delete p._pendingMedia;
  }
  if (restored) {
    renderBikerGram();
    retryPendingUploads();
  }
}

// Retry uploading photos/videos/audio that never made it to HeyValue
// (e.g. app was closed before the background upload finished).
async function retryPendingUploads() {
  if (!STATE.user || !HV.user || !HV.pass) return;
  const pending = (STATE.posts || []).filter(p =>
    p.user_id === STATE.user.id && !p.synced &&
    (p.media_url || '').startsWith('data:')
  );
  for (const p of pending) {
    const blob = dataURLtoBlob(p.media_url);
    if (!blob) continue;
    const ext = (blob.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
    uploadMediaAsync(p.id, {
      type: p.media_type || 'image',
      blob,
      fileName: 'retry.' + ext,
      mimeType: blob.type
    });
  }
}

// Shows whether a post's media is still uploading to HeyValue or already published
function renderUploadStatusBadge(p) {
  const url = p.media_url || p.image_url;
  const pending = url && (url.startsWith('data:') || url.startsWith('blob:')) && !p.synced;
  if (pending) {
    const st = UPLOAD_STATE[p.id];
    if (st?.failed) {
      return `<span data-upload-badge="${p.id}" onclick="retryUploadNow(${p.id})" style="font-size:9px;padding:1px 6px;background:rgba(239,68,68,0.15);color:#ef4444;border-radius:8px;font-weight:700;white-space:nowrap;cursor:pointer">❌ Fallo — toca para reintentar</span>`;
    }
    const pct = st?.pct != null ? ' ' + st.pct + '%' : '...';
    return `<span data-upload-badge="${p.id}" style="font-size:9px;padding:1px 6px;background:rgba(251,191,36,0.15);color:#fbbf24;border-radius:8px;font-weight:700;white-space:nowrap">⏳ Subiendo${pct}</span>`;
  }
  return `<span style="font-size:9px;padding:1px 6px;background:rgba(34,197,94,0.15);color:#22c55e;border-radius:8px;font-weight:700;white-space:nowrap">✅ Publicado</span>`;
}

// ===== ENHANCED POST CARD =====
function renderPostCardEnhanced(p) {
  const author = STATE.users.find(u => u.id === p.user_id) || {username: '?', bike_model: '', avatar: '', is_admin: false};
  const likes = p.likes || [];
  const reactions = p.reactions || {};
  const totalRx = Object.values(reactions).reduce((a, b) => a + b, 0);
  const comments = STATE.comments ? STATE.comments.filter(c => c.post_id === p.id) : [];
  const isLiked = STATE.user && likes.includes(String(STATE.user.id));
  const isMyPost = STATE.user && STATE.user.id === p.user_id;
  const canDelete = isMyPost || !!STATE.user?.is_admin;
  const mediaType = p.media_type || (p.image_url ? 'image' : null);
  const typeEmoji = mediaType === 'image' ? '📷' : (mediaType === 'video' ? '🎬' : (mediaType === 'audio' ? '🎵' : ''));
  const reactionBadges = Object.entries(reactions).filter(([,c]) => c > 0).sort((a,b) => b[1]-a[1]).slice(0,3).map(([e,c]) => `${e}${c}`).join(' ');

  return `
    <div class="post-card vanish" style="margin-bottom:14px" data-post-id="${p.id}">
      <div class="post-header">
        <div style="width:38px;height:38px;flex-shrink:0;cursor:pointer" onclick="closeFpanel();navigate('rider-detail',${author.id})">${renderAvatar(author, 38)}</div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:6px">
            <span class="post-name" style="cursor:pointer" onclick="closeFpanel();navigate('rider-detail',${author.id})">${author.username}</span>
            ${author.is_admin ? '<span style="font-size:9px;padding:1px 5px;background:linear-gradient(135deg,#fbbf24,#f59e0b);color:#000;border-radius:10px;font-weight:800">ADMIN</span>' : ''}
          </div>
          <div style="display:flex;align-items:center;gap:6px;font-size:10px;color:var(--text3)">
            <span>${timeAgo(p.created_at)}</span>
            ${mediaType ? `<span>· ${typeEmoji}</span>` : ''}
            ${isMyPost && mediaType ? renderUploadStatusBadge(p) : ''}
          </div>
        </div>
        ${canDelete ? `<button class="btn btn-ghost" style="padding:4px 8px;font-size:11px" onclick="deletePost(${p.id})">🗑️</button>` : ''}
      </div>

      ${p.content ? `<div class="post-content">${p.content}</div>` : ''}

      ${(p.media_url || p.image_url) ? renderPostMedia(p) : ''}

      ${(totalRx > 0 || likes.length > 0) ? `
        <div style="padding:5px 14px;display:flex;align-items:center;gap:8px;border-bottom:1px solid rgba(255,255,255,0.05);background:rgba(255,255,255,0.02)">
          ${likes.length > 0 ? `<span style="font-size:12px;color:#ff4466;font-weight:700">❤️ ${likes.length}</span>` : ''}
          ${totalRx > 0 ? `<span style="font-size:12px;color:var(--text2)">${reactionBadges}</span>` : ''}
        </div>
      ` : ''}

      <div class="post-actions">
        <button class="post-action-btn btn-like ${isLiked ? 'liked-neon' : ''}" data-like-btn="${p.id}" onclick="toggleLike(${p.id})">
          <span>${isLiked ? '❤️' : '🤍'}</span>
          <span>${likes.length > 0 ? likes.length : 'Me gusta'}</span>
        </button>
        <button class="post-action-btn btn-react" style="position:relative" onclick="showReactionPicker(${p.id}, this)">
          <span>😀</span>
          <span>${totalRx > 0 ? totalRx : 'Reaccionar'}</span>
        </button>
        <button class="post-action-btn btn-comment" onclick="toggleComments(${p.id})">
          <span>💬</span>
          <span>${comments.length > 0 ? comments.length : 'Comentar'}</span>
        </button>
        <button class="post-action-btn btn-share" onclick="sharePost(${p.id})">
          <span>📤</span>
          <span>Compartir</span>
        </button>
      </div>

      <div id="comments-section-${p.id}" style="display:block">
        ${renderComments(p.id)}
        ${STATE.user ? `
          <div style="display:flex;gap:8px;padding:8px 14px;align-items:center">
            <div style="width:28px;height:28px;flex-shrink:0">${renderAvatar(STATE.user, 28)}</div>
            <input id="comment-input-${p.id}" placeholder="Escribe un comentario..." style="flex:1;background:rgba(255,255,255,0.08);border:1px solid var(--border);border-radius:20px;padding:6px 14px;font-size:13px;color:#fff;outline:none" onkeydown="if(event.key==='Enter'){addComment(${p.id},this.value);this.value=''}">
            <button onclick="addComment(${p.id},document.getElementById('comment-input-${p.id}').value);document.getElementById('comment-input-${p.id}').value=''" style="background:linear-gradient(135deg,#ff4444,#ff8800);border:none;color:#fff;font-size:13px;font-weight:700;padding:6px 14px;border-radius:20px;cursor:pointer">Enviar</button>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

function toggleComments(postId) {
  // Los comentarios ya se ven siempre (estilo Instagram); el botón solo enfoca
  // la caja para escribir.
  const inp = document.getElementById('comment-input-' + postId);
  if (inp) { inp.focus(); inp.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
}

// Despliega los comentarios antiguos ocultos ("Ver los N comentarios").
function showAllComments(postId) {
  const e = document.getElementById('older-comments-' + postId);
  const b = document.getElementById('vermas-' + postId);
  if (e) e.style.display = 'block';
  if (b) b.style.display = 'none';
}

// Enhanced follow button for profile
function renderFollowButton(userId) {
  if (!STATE.user || STATE.user.id === userId) return '';
  const following = isFollowing(userId);
  return `<button onclick="toggleFollow(${userId})" style="padding:8px 20px;border-radius:20px;font-size:13px;font-weight:700;cursor:pointer;${following ? 'background:rgba(255,255,255,0.1);border:1px solid var(--border);color:#fff' : 'background:linear-gradient(135deg,#ff4444,#ff8800);border:none;color:#fff'}">
    ${following ? 'Siguiendo' : 'Seguir'}
  </button>`;
}

// ===== ENHANCED PROFILE PAGE =====
function renderEnhancedProfile(userId) {
  const user = STATE.users.find(u => u.id === userId);
  if (!user) return '<div style="padding:20px;text-align:center;color:var(--text2)">Usuario no encontrado</div>';
  const posts = STATE.posts.filter(p => p.user_id === userId);
  const followers = getFollowerCount(userId);
  const following = getFollowingCount(userId);

  return `
    <div style="padding:0 0 20px">
      <div style="text-align:center;padding:20px">
        <div style="width:80px;height:80px;margin:0 auto 12px">${renderAvatar(user, 80)}</div>
        <div style="font-size:20px;font-weight:900">${user.username}</div>
        ${user.bike_model ? `<div style="font-size:12px;color:var(--text2);margin-top:4px">${user.bike_model}</div>` : ''}
        ${user.bio ? `<div style="font-size:13px;color:var(--text2);margin-top:8px;max-width:300px;margin-left:auto;margin-right:auto">${user.bio}</div>` : ''}
        <div style="display:flex;justify-content:center;gap:24px;margin-top:16px;font-size:13px">
          <div><strong>${posts.length}</strong> <span style="color:var(--text2)">posts</span></div>
          <div><strong>${followers}</strong> <span style="color:var(--text2)">seguidores</span></div>
          <div><strong>${following}</strong> <span style="color:var(--text2)">siguiendo</span></div>
        </div>
        <div style="margin-top:14px">${renderFollowButton(userId)}</div>
      </div>
      ${posts.length > 0 ? `
        <div style="border-top:1px solid var(--border);padding-top:12px">
          <div style="padding:0 14px 10px;font-size:12px;font-weight:700;color:var(--text2)">PUBLICACIONES</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:2px">
            ${posts.map(p => `
              <div style="aspect-ratio:1;background:#000;overflow:hidden;cursor:pointer" onclick="openLightbox('${p.media_url || p.image_url || ''}')">
                ${(p.media_url || p.image_url) ? `<img src="${p.media_url || p.image_url}" style="width:100%;height:100%;object-fit:cover">` : `<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:24px">📝</div>`}
              </div>
            `).join('')}
          </div>
        </div>
      ` : '<div style="text-align:center;color:var(--text2);padding:20px;font-size:13px">No hay publicaciones todavia</div>'}
    </div>
  `;
}
// Abre el Ludo 3D (página aparte). Deja la config de la nube y el usuario en
// localStorage para que esa página se conecte con los miembros, sin meter el
// ============================================================
// LONG-PRESS CONTEXT MENU (rutas: editar / eliminar)
// ============================================================
let _lpTimer = null;
let _lpMoved = false;

function _startLp(routeId, evt) {
  _lpMoved = false;
  _lpTimer = setTimeout(function () {
    _lpTimer = null;
    if (_lpMoved) return;
    navigator.vibrate && navigator.vibrate(40);
    _showRouteCtx(routeId, evt);
  }, 600);
}

function _cancelLp() {
  if (_lpTimer) { clearTimeout(_lpTimer); _lpTimer = null; }
}

function _moveLp() {
  _lpMoved = true;
  _cancelLp();
}

function _showRouteCtx(routeId, evt) {
  const old = document.getElementById('_rctx');
  if (old) old.remove();
  const x = (evt.touches ? evt.touches[0].clientX : evt.clientX) || window.innerWidth / 2;
  const y = (evt.touches ? evt.touches[0].clientY : evt.clientY) || window.innerHeight / 2;
  const menu = document.createElement('div');
  menu.id = '_rctx';
  menu.style.cssText = 'position:fixed;z-index:9999;background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:6px;box-shadow:0 8px 32px rgba(0,0,0,0.5);min-width:180px;animation:fadeIn .15s ease';
  menu.style.left = Math.min(x, window.innerWidth - 200) + 'px';
  menu.style.top = Math.min(y - 10, window.innerHeight - 110) + 'px';
  menu.innerHTML = `
    <button onclick="editRoute(${routeId});document.getElementById('_rctx')&&document.getElementById('_rctx').remove()" style="display:flex;align-items:center;gap:10px;width:100%;padding:10px 14px;background:none;border:none;color:var(--text);text-align:left;cursor:pointer;border-radius:10px;font-size:13px;font-weight:700" onmouseenter="this.style.background='var(--surface2)'" onmouseleave="this.style.background='none'">✏️ Editar ruta</button>
    <button onclick="deleteRoute(${routeId});document.getElementById('_rctx')&&document.getElementById('_rctx').remove()" style="display:flex;align-items:center;gap:10px;width:100%;padding:10px 14px;background:none;border:none;color:#ef4444;text-align:left;cursor:pointer;border-radius:10px;font-size:13px;font-weight:700" onmouseenter="this.style.background='rgba(239,68,68,0.1)'" onmouseleave="this.style.background='none'">🗑️ Eliminar ruta</button>
  `;
  document.body.appendChild(menu);
  setTimeout(function () {
    document.addEventListener('click', function _cls() {
      const m = document.getElementById('_rctx');
      if (m) m.remove();
      document.removeEventListener('click', _cls);
    });
  }, 100);
}

// Verifica si el APK existe antes de intentar descargarlo
function checkApkExists(evt) {
  fetch('bikersociety.apk', { method: 'HEAD' })
    .then(r => {
      if (!r.ok) {
        evt.preventDefault();
        openModal('📥 APK no disponible aún', `
          <div style="text-align:center;padding:8px 0">
            <img src="icons/logo.png" style="width:72px;height:72px;border-radius:18px;margin-bottom:14px;box-shadow:0 0 20px rgba(255,68,68,0.4)">
            <div style="font-size:15px;font-weight:800;margin-bottom:8px">Biker Society para Android</div>
            <div style="font-size:13px;color:var(--text2);margin-bottom:18px;line-height:1.5">
              El APK estará disponible para descarga próximamente.<br>
              Por ahora puedes instalar la versión PWA desde tu navegador.
            </div>
            <button class="btn btn-primary" style="width:100%;margin-bottom:8px" onclick="closeModal()">Cerrar</button>
            <button class="btn btn-ghost" style="width:100%;font-size:12px" onclick="closeModal()">Cerrar</button>
          </div>
        `);
      }
      // Si existe, el enlace <a download> procede normalmente
    })
    .catch(() => {
      evt.preventDefault();
      toast('APK no disponible aún. Usa la versión PWA por ahora.');
    });
}

// peso del 3D en la web principal.
function openLudo3D() {
  if (!STATE.user) { toast('Inicia sesión primero'); return; }
  try { localStorage.setItem('bs_hv', JSON.stringify({ url: HV.url, user: HV.user, pass: HV.pass, syncKey: HV.syncKey })); } catch (e) {}
  try { localStorage.setItem('bs_ludo_session', JSON.stringify({ id: STATE.user.id, username: STATE.user.username })); } catch (e) {}
  window.location.href = 'ludo3d/';
}
