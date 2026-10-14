// ============================================================
// BIKERGRAM PAGE
// ============================================================
function renderBikerGram() {
  const photos = STATE.posts.filter(p => p.media_type === 'image' || p.image_url).length;
  const videos = STATE.posts.filter(p => p.media_type === 'video').length;
  const audios = STATE.posts.filter(p => p.media_type === 'audio').length;
  const totalPosts = STATE.posts.length;

  // Posts sorted by newest first (always)
  let posts = [...STATE.posts].sort((a,b) => new Date(b.created_at) - new Date(a.created_at));

  document.getElementById('page-bikergram').innerHTML = `
    <!-- Header — clean -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <div style="font-size:20px;font-weight:900;letter-spacing:-0.5px">
        <span style="background:linear-gradient(135deg,#ff4444,#ff8800);-webkit-background-clip:text;-webkit-text-fill-color:transparent">Biker</span><span style="color:#fff">Gram</span>
      </div>
      <button onclick="createPost()" style="width:40px;height:40px;border-radius:50%;border:none;background:linear-gradient(135deg,#ff4444,#ff8800);cursor:pointer;font-size:20px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(255,68,68,0.4);flex-shrink:0">+</button>
    </div>

    <!-- Feed -->
    <div id="bikergram-feed">
      ${totalPosts === 0 ? `
        <div class="empty-state">
          <div style="font-size:48px;margin-bottom:12px">🏍️</div>
          <div style="font-size:15px;font-weight:700">No hay publicaciones todavia</div>
          <div style="font-size:12px;color:var(--text2);margin-top:6px">El primer rider en publicar marca el camino</div>
          <button class="btn btn-primary" style="margin-top:14px;padding:10px 24px" onclick="createPost()">Crear publicacion</button>
        </div>
      ` : posts.map(p => renderPostCardEnhanced(p)).join('')}
    </div>
  `;
  // Resolve HeyValue video/audio URLs after DOM renders
  resolveHvMedia();
  // El feed quedó al día: guarda la base para el contador del globo y quítalo
  STATE._feedRenderedCount = totalPosts;
  removeNewPostsPill();

  // Scroll to highlighted post from notification
  if (STATE._highlightPost) {
    const postId = STATE._highlightPost;
    STATE._highlightPost = null;
    setTimeout(() => {
      const el = document.getElementById('post-card-' + postId);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.style.transition = 'box-shadow 0.3s, border-color 0.3s';
      el.style.boxShadow = '0 0 0 2px #ff4444, 0 0 24px rgba(255,68,68,0.5)';
      el.style.borderColor = '#ff4444';
      setTimeout(() => {
        el.style.boxShadow = '';
        el.style.borderColor = '';
      }, 2500);
    }, 200);
  }
}

function resolveHvMedia() {
  if (!HV.user || !HV.pass) return;
  document.querySelectorAll('video[src], audio[src]').forEach(el => {
    const src = el.src;
    // Skip data URLs, blob URLs, and already-resolved URLs
    if (!src || src.startsWith('data:') || src.startsWith('blob:')) return;
    // Only handle HeyValue WebDAV URLs
    if (!src.includes('/dav/files/')) return;
    // Already resolved?
    if (el.dataset.hvResolved === '1') return;
    el.dataset.hvResolved = '1';
    resolveMediaUrl(src).then(blobUrl => {
      if (blobUrl !== src) {
        el.src = blobUrl;
        el.load();
      }
    }).catch(() => {});
  });
}

// Render media block for a post (image / video / audio / none)
function renderPostMedia(p) {
  const url = p.media_url || p.image_url;
  if (!url) return '';
  const mt = p.media_type || (p.image_url ? 'image' : null);
  if (mt === 'video' || (!mt && url.startsWith('data:video'))) {
    return `<div style="position:relative;background:#000;overflow:hidden">
      <video src="${resolveMediaUrlSync(url, 'video')}" controls muted loop preload="metadata" style="display:block;width:100%;max-height:540px;background:#000" playsinline data-autoplay></video>
      <div style="position:absolute;top:8px;right:8px;background:rgba(0,0,0,0.7);color:#fff;padding:3px 9px;border-radius:12px;font-size:10px;font-weight:700;backdrop-filter:blur(8px)">🎬 VIDEO</div>
    </div>`;
  }
  if (mt === 'audio' || (!mt && url.startsWith('data:audio'))) {
    return `<div style="background:linear-gradient(135deg,rgba(255,68,68,0.12),rgba(255,136,0,0.12));border-top:1px solid var(--border);border-bottom:1px solid var(--border);padding:12px 14px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#ff4444,#ff8800);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">🎵</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:12px;font-weight:700">Audio compartido</div>
          <div style="font-size:10px;color:var(--text2)">Pulsa play para escuchar</div>
        </div>
      </div>
      <audio src="${resolveMediaUrlSync(url, 'audio')}" controls preload="metadata" style="width:100%"></audio>
    </div>`;
  }
  // image (default) — hover overlay with "Abrir"
  return `<div style="position:relative;background:#000;overflow:hidden;cursor:pointer" onclick="openLightbox('${resolveMediaUrlSync(url, 'image')}')">
    <img src="${resolveMediaUrlSync(url, 'image')}" loading="lazy" decoding="async" data-lightbox="1" style="display:block;width:100%;max-height:75vh;object-fit:contain;background:#000"
         onload="(function(img){var r=img.naturalHeight/img.naturalWidth;if(r>1.3){img.style.maxHeight='80vh';img.style.width='auto';img.style.maxWidth='100%';img.style.margin='0 auto';}else if(r<0.6){img.style.maxHeight='55vh';}})(this)">
    <div style="position:absolute;inset:0;background:rgba(0,0,0,0);display:flex;align-items:center;justify-content:center;transition:background 0.2s;pointer-events:none"
         onmouseover="this.style.background='rgba(0,0,0,0.35)'"
         onmouseout="this.style.background='rgba(0,0,0,0)'">
      <span style="color:#fff;font-size:15px;font-weight:800;opacity:0;transition:opacity 0.2s;text-shadow:0 2px 8px rgba(0,0,0,0.8);pointer-events:none"
            onmouseover="this.style.opacity='1'"
            onmouseout="this.style.opacity='0'">🔍 Abrir</span>
    </div>
    <div style="position:absolute;top:8px;right:8px;background:rgba(0,0,0,0.7);color:#fff;padding:3px 9px;border-radius:12px;font-size:10px;font-weight:700;backdrop-filter:blur(8px)">📷 FOTO</div>
  </div>`;
}

function renderPost(p) {
  const author = STATE.users.find(u => u.id === p.user_id) || {username:'?', bike_model:'', id:0};
  const likes = p.likes || [];
  const comments = p.comments || [];
  const isLiked = STATE.user && likes.includes(String(STATE.user.id));
  const isMyPost = STATE.user && STATE.user.id === p.user_id;
  const canDelete = isMyPost || !!STATE.user?.is_admin;
  const mediaType = p.media_type || (p.image_url ? 'image' : null);
  const typeEmoji = mediaType === 'image' ? '📷' : (mediaType === 'video' ? '🎬' : (mediaType === 'audio' ? '🎵' : ''));
  const likeLabel = likes.length === 1 ? '1 like' : likes.length === 0 ? '' : `${likes.length} likes`;
  const cmtLabel = comments.length === 1 ? '1 comentario' : comments.length === 0 ? '' : `${comments.length} comentarios`;

  return `
    <div class="post-card vanish" id="post-card-${p.id}" style="margin-bottom:14px">
      <div class="post-header">
        <div style="width:38px;height:38px;flex-shrink:0;cursor:pointer" onclick="closeFpanel();navigate('rider-detail',${author.id})">${renderAvatar(author, 38)}</div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:6px">
            <span class="post-name" style="cursor:pointer" onclick="closeFpanel();navigate('rider-detail',${author.id})">${author.username}</span>
            ${author.is_admin ? '<span style="font-size:9px;padding:1px 5px;background:linear-gradient(135deg,#fbbf24,#f59e0b);color:#000;border-radius:10px;font-weight:800">ADMIN</span>' : ''}
          </div>
          <div style="display:flex;align-items:center;gap:6px;font-size:10px;color:var(--text3)">
            <span>${timeAgo(p.created_at)}</span>
            ${mediaType ? `<span style="display:flex;align-items:center;gap:3px">· ${typeEmoji} ${mediaType}</span>` : ''}
          </div>
        </div>
        ${canDelete ? `
          <button class="btn btn-ghost" style="padding:4px 8px;font-size:11px;flex-shrink:0" onclick="deletePost(${p.id})">🗑️</button>
        ` : `<div style="width:32px;flex-shrink:0"></div>`}
      </div>
      ${p.content ? `<div class="post-content" style="margin-top:8px">${p.content}</div>` : ''}
      ${renderPostMedia(p)}
      ${(likes.length > 0 || comments.length > 0) ? `
      <div style="padding:8px 16px 0;font-size:11px;color:var(--text3);border-top:1px solid rgba(255,255,255,0.05);margin-top:4px">
        ${likes.length > 0 ? `<span style="color:var(--accent)">${likeLabel}</span>` : ''}${likes.length > 0 && comments.length > 0 ? ' · ' : ''}${comments.length > 0 ? `<span>${cmtLabel}</span>` : ''}
      </div>
      ` : ''}
      <div class="post-actions">
        <button class="like-btn ${isLiked ? 'liked' : ''}" data-like-btn="${p.id}" onclick="toggleLike(${p.id})">
          ${isLiked ? '❤️' : '🤍'} Me gusta
          ${likes.length > 0 ? `<span style="opacity:0.7;font-weight:400">${likes.length}</span>` : ''}
        </button>
        <button class="like-btn" onclick="showComments(${p.id})">
          💬 Comentar
          ${comments.length > 0 ? `<span style="opacity:0.7;font-weight:400">${comments.length}</span>` : ''}
        </button>
        <button class="like-btn" onclick="sharePost(${p.id})">
          📤 Compartir
        </button>
      </div>
      <div id="comments-${p.id}" style="padding:0 16px 12px;display:none;margin-top:4px">
        ${comments.length > 0 ? comments.map(c => {
          const cu = STATE.users.find(u => u.id === c.user_id) || {username:'?', id:0};
          return `<div style="margin-top:8px;font-size:12px"><b style="color:var(--accent)">${cu.username}</b> <span style="color:var(--text2)">${c.content}</span></div>`;
        }).join('') : ''}
        <div style="display:flex;gap:6px;margin-top:10px;border-top:1px solid rgba(255,255,255,0.05);padding-top:10px">
          ${STATE.user ? renderAvatar(STATE.user, 26) : '<div style="width:26px;height:26px;border-radius:50%;background:var(--surface2)"></div>'}
          <input class="input" style="margin:0;flex:1;font-size:12px;padding:6px 10px" id="cmt-${p.id}" placeholder="Escribe un comentario..." onkeydown="if(event.key==='Enter')addComment(${p.id})">
          <button class="btn btn-primary" style="padding:6px 12px;font-size:12px;flex-shrink:0" onclick="addComment(${p.id})">→</button>
        </div>
      </div>
    </div>
  `;
}

// ============================================================
// RACING POST — large card design for Gram feed
// ============================================================
// Resolve media URL: blob/data URLs pass through, HeyValue WebDAV URLs get fetched with auth
const _mediaCache = {};
async function resolveMediaUrl(url, type) {
  if (!url) return url;
  if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('http') && !url.includes('dav/files')) return url;
  if (_mediaCache[url]) return _mediaCache[url];
  if (!url.includes('/dav/files/')) return url;
  try {
    const res = await fetch(url, { headers: { Authorization: 'Basic ' + btoa(HV.user + ':' + HV.pass) } });
    if (!res.ok) return url;
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    _mediaCache[url] = blobUrl;
    return blobUrl;
  } catch { return url; }
}
function resolveMediaUrlSync(url) {
  if (!url) return url;
  // For HeyValue WebDAV URLs, inject Basic auth so browser can load media directly
  // (used by image lightbox which doesn't go through EC2 proxy)
  if (url.includes('/dav/') && HV.user && HV.pass && !url.includes('@')) {
    return url.replace('https://', `https://${encodeURIComponent(HV.user)}:${encodeURIComponent(HV.pass)}@`);
  }
  return url;
}

function renderRacingPost(p) {
  const author = STATE.users.find(u => u.id === p.user_id) || {username:'?', bike_model:'', id:0};
  const likes = p.likes || [];
  const comments = p.comments || [];
  const isLiked = STATE.user && likes.includes(String(STATE.user.id));
  const isMyPost = STATE.user && STATE.user.id === p.user_id;
  const canDelete = isMyPost || !!STATE.user?.is_admin;
  const mediaType = p.media_type || (p.image_url ? 'image' : null);
  const url = p.media_url || p.image_url;
  const hasMedia = !!url;
  const time = timeAgo(p.created_at);

  // Type badge
  const typeConfig = {
    image: { emoji: '📷', label: 'FOTO', color: '#ff4444' },
    video: { emoji: '🎬', label: 'VIDEO', color: '#ff2020' },
    audio: { emoji: '🎵', label: 'AUDIO', color: '#22c55e' },
  };
  const tc = typeConfig[mediaType] || null;

  return `
    <div class="racing-card vanish" data-post-id="${p.id}" style="margin-bottom:16px;border-radius:20px;overflow:hidden;background:var(--surface);border:1px solid rgba(255,255,255,0.06);box-shadow:0 4px 24px rgba(0,0,0,0.3)">

      <!-- Media: full-width hero image / video -->
      ${hasMedia ? `
      <div style="position:relative;background:#000;overflow:hidden;max-height:420px">
        ${mediaType === 'video' ? `
          <video src="${resolveMediaUrlSync(url)}" controls muted loop preload="metadata" style="display:block;width:100%;max-height:420px;background:#000" playsinline data-autoplay></video>
        ` : mediaType === 'audio' ? `
          <div style="padding:24px;background:linear-gradient(135deg,rgba(255,68,68,0.2),rgba(255,136,0,0.15));border-bottom:1px solid rgba(255,255,255,0.06)">
            <div style="display:flex;align-items:center;gap:14px">
              <div style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#ff4444,#ff8800);display:flex;align-items:center;justify-content:center;font-size:26px;flex-shrink:0;animation:audioPulse 2s ease-in-out infinite;box-shadow:0 0 20px rgba(255,68,68,0.3)">🎵</div>
              <div style="flex:1;min-width:0">
                <div style="font-size:13px;font-weight:700">Audio compartido</div>
                <div style="font-size:11px;color:var(--text2)">${author.username} · ${time}</div>
              </div>
            </div>
            <audio src="${resolveMediaUrlSync(url)}" controls preload="metadata" style="width:100%;margin-top:14px;height:36px"></audio>
          </div>
        ` : `
          <img src="${resolveMediaUrlSync(url)}" loading="lazy" decoding="async" style="display:block;width:100%;max-height:420px;object-fit:cover;background:#000" onerror="this.parentElement.innerHTML='<div style=\'padding:40px;text-align:center;color:#888;font-size:13px\'>Imagen no disponible</div>'">
        `}

        <!-- Gradient overlay at bottom of image -->
        <div style="position:absolute;bottom:0;left:0;right:0;height:80px;background:linear-gradient(to top,rgba(0,0,0,0.8),transparent);pointer-events:none"></div>

        <!-- Type badge top-left -->
        ${tc ? `<div style="position:absolute;top:10px;left:10px;background:${tc.color}cc;color:#fff;padding:3px 10px;border-radius:20px;font-size:10px;font-weight:800;backdrop-filter:blur(8px);letter-spacing:0.5px">${tc.emoji} ${tc.label}</div>` : ''}

        <!-- Delete button top-right (own post or admin) -->
        ${canDelete ? `<button onclick="event.stopPropagation();deletePost(${p.id})" style="position:absolute;top:10px;right:10px;width:30px;height:30px;border-radius:50%;background:rgba(0,0,0,0.6);border:none;color:#fff;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px)">🗑️</button>` : ''}
      </div>
      ` : ''}

      <!-- Author info bar (for text-only posts) -->
      ${!hasMedia ? `
      <div style="padding:14px 16px 10px;display:flex;align-items:center;gap:10px;border-bottom:1px solid rgba(255,255,255,0.05)">
        <div style="cursor:pointer" onclick="closeFpanel();navigate('rider-detail',${author.id})">${renderAvatar(author, 42)}</div>
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:6px">
            <span style="font-size:14px;font-weight:700;cursor:pointer" onclick="closeFpanel();navigate('rider-detail',${author.id})">${author.username}</span>
            ${author.is_admin ? '<span style="font-size:9px;padding:1px 6px;background:linear-gradient(135deg,#fbbf24,#f59e0b);color:#000;border-radius:10px;font-weight:800">ADMIN</span>' : ''}
          </div>
          <div style="font-size:11px;color:var(--text3)">${time}</div>
        </div>
      </div>` : ''}

      <!-- Content text (if any) -->
      ${p.content ? `
      <div style="padding:${hasMedia ? '12px 16px 8px' : '0 16px 12px'}">
        <div style="font-size:14px;line-height:1.5;color:var(--text)">${p.content}</div>
      </div>` : (hasMedia ? `<div style="padding:0 16px 4px;margin-top:4px">
        <div style="display:flex;align-items:center;gap:10px;padding:8px 0">
          <div style="cursor:pointer" onclick="closeFpanel();navigate('rider-detail',${author.id})">${renderAvatar(author, 32)}</div>
          <div>
            <span style="font-size:13px;font-weight:700;cursor:pointer" onclick="closeFpanel();navigate('rider-detail',${author.id})">${author.username}</span>
            ${author.is_admin ? '<span style="font-size:9px;padding:1px 5px;background:linear-gradient(135deg,#fbbf24,#f59e0b);color:#000;border-radius:8px;font-weight:800;margin-left:4px">ADMIN</span>' : ''}
          </div>
          <span style="font-size:11px;color:var(--text3);margin-left:auto">${time}</span>
        </div>
      </div>` : '')}

      <!-- Engagement bar -->
      <div style="padding:8px 16px 14px;display:flex;align-items:center;gap:4px">
        <button onclick="toggleLike(${p.id})" data-like-btn="${p.id}" class="like-btn-anim" style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:10px;border:none;border-radius:12px;cursor:pointer;font-size:13px;font-weight:600;transition:all 0.2s;background:${isLiked?'linear-gradient(135deg,rgba(255,68,68,0.25),rgba(255,136,0,0.2))':'rgba(255,255,255,0.04)'};color:${isLiked?'#ff4444':'var(--text2)'}">
          <span class="like-icon" style="display:inline-block;transition:transform 0.2s">${isLiked ? '❤️' : '🤍'}</span> <span class="like-count" data-count="${p.id}">${likes.length > 0 ? likes.length + ' likes' : 'Me gusta'}</span>
        </button>
        <button onclick="showComments(${p.id})" style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:10px;border:none;border-radius:12px;cursor:pointer;font-size:13px;font-weight:600;background:rgba(255,255,255,0.04);color:var(--text2);transition:all 0.2s">
          💬 <span>${comments.length > 0 ? comments.length + ' com.' : 'Comentar'}</span>
        </button>
        <button onclick="sharePost(${p.id})" style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:10px;border:none;border-radius:12px;cursor:pointer;font-size:13px;font-weight:600;background:rgba(255,255,255,0.04);color:var(--text2);transition:all 0.2s">
          📤 <span>Compartir</span>
        </button>
      </div>

      <!-- Comments (always visible) -->
      <div id="comments-${p.id}" style="padding:0 16px 14px">
        ${comments.length > 0 ? `
          <div style="border-top:1px solid rgba(255,255,255,0.05);padding-top:10px;margin-bottom:8px">
            ${comments.map(c => {
              const cu = STATE.users.find(u => u.id === c.user_id) || {username:'?', id:0};
              return `<div style="font-size:13px;margin-bottom:8px;display:flex;gap:8px;align-items:flex-start">
                ${renderAvatar(cu, 24)}
                <div style="flex:1;background:rgba(255,255,255,0.04);padding:7px 11px;border-radius:14px;line-height:1.4">
                  <b style="color:var(--accent);font-size:12px">${cu.username}</b> <span style="color:var(--text)">${c.content}</span>
                </div>
              </div>`;
            }).join('')}
          </div>
        ` : ''}
        <div style="display:flex;gap:6px;align-items:center;${comments.length>0?'border-top:1px solid rgba(255,255,255,0.05);padding-top:10px':''}">
          ${STATE.user ? renderAvatar(STATE.user, 28) : '<div style="width:28px;height:28px;border-radius:50%;background:var(--surface2);flex-shrink:0"></div>'}
          <input class="input" style="margin:0;flex:1;font-size:13px;padding:8px 12px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:18px" id="cmt-${p.id}" placeholder="Escribe un comentario..." onkeydown="if(event.key==='Enter')addComment(${p.id})">
          <button style="padding:8px 14px;background:linear-gradient(135deg,#ff4444,#ff8800);border:none;border-radius:18px;color:#fff;font-size:13px;cursor:pointer;font-weight:700;flex-shrink:0" onclick="addComment(${p.id})">Enviar</button>
        </div>
      </div>
    </div>
  `;
}

function sharePost(postId) {
  const p = STATE.posts.find(x => x.id === postId);
  if (!p) return;
  const text = p.content ? `${p.content.substring(0,100)}...\n\nVia Biker Society` : 'Mira esta publicacion en Biker Society 🏍️';
  if (navigator.share) {
    navigator.share({title: 'BikerGram', text}).catch(() => {});
  } else {
    navigator.clipboard.writeText(text).then(() => toast('Enlace copiado!')).catch(() => toast('No se pudo copiar'));
  }
}

function toggleLike(postId) {
  if (!STATE.user) { toast('Inicia sesion para dar like'); return; }
  const p = STATE.posts.find(x => x.id === postId);
  if (!p) return;
  p.likes = p.likes || [];
  const uid = String(STATE.user.id);
  const wasLiked = p.likes.includes(uid);
  if (wasLiked) {
    p.likes = p.likes.filter(l => l !== uid);
  } else {
    p.likes.push(uid);
    if (p.user_id !== STATE.user.id) {
      STATE.notifications.push({id:Date.now(), user_id:p.user_id, actor_id:STATE.user.id, post_id:p.id, type:'like', message:'❤️ ' + STATE.user.username + ' le dio me gusta a tu publicacion', read:false, created_at:new Date().toISOString()});
      updateNotifBadge();
    }
    // Animate like button on add
    const btn = document.querySelector(`[data-like-btn="${postId}"]`);
    if (btn) {
      const icon = btn.querySelector('.like-icon');
      if (icon) {
        icon.style.transform = 'scale(1.5)';
        setTimeout(() => { icon.style.transform = 'scale(1)'; }, 250);
      }
      btn.classList.add('like-burst');
      setTimeout(() => btn.classList.remove('like-burst'), 600);
    }
  }
  saveState();
  // Update like count without re-rendering the whole feed (preserves scroll & media state)
  const countEl = document.querySelector(`[data-count="${postId}"]`);
  // Update button visual state (neon glow)
  const btn = document.querySelector(`[data-like-btn="${postId}"]`);
  if (btn) {
    const isLiked = !wasLiked;
    if (isLiked) {
      btn.classList.add('liked');
      btn.classList.add('liked-neon');
    } else {
      btn.classList.remove('liked');
      btn.classList.remove('liked-neon');
    }
    // Update the heart icon
    const spans = btn.querySelectorAll('span');
    if (spans[0]) spans[0].textContent = isLiked ? '❤️' : '🤍';
  }
}

function showComments(postId) {
  const el = document.getElementById('comments-' + postId);
  if (!el) return;
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

function addComment(postId) {
  if (!STATE.user) { toast('Inicia sesion para comentar'); return; }
  const input = document.getElementById('cmt-' + postId);
  if (!input || !input.value.trim()) return;
  const p = STATE.posts.find(x => x.id === postId);
  if (!p) return;
  p.comments = p.comments || [];
  p.comments.push({user_id:STATE.user.id, content:input.value.trim(), created_at:new Date().toISOString()});
  if (p.user_id !== STATE.user.id) {
    STATE.notifications.push({id:Date.now(), user_id:p.user_id, actor_id:STATE.user.id, post_id:p.id, type:'comment', message:'💬 ' + STATE.user.username + ' comento en tu publicacion', read:false, created_at:new Date().toISOString()});
    updateNotifBadge();
  }
  saveState();
  renderBikerGram();
}

// Draft media while composing a post — not saved until publish
let POST_DRAFT = null;

function createPost() {
  if (!STATE.user) { toast('Inicia sesion primero'); return; }
  POST_DRAFT = { type: null, dataUrl: null, fileName: '', fileSize: 0, mimeType: null };
  openModal('Nueva Publicacion', `
    <!-- User row -->
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid rgba(255,255,255,0.06)">
      ${renderAvatar(STATE.user, 42)}
      <div>
        <div style="font-size:15px;font-weight:700">${STATE.user.username}</div>
        <div style="font-size:11px;color:var(--text2)">${STATE.user.bike_model || 'Biker'}</div>
      </div>
    </div>

    <!-- Content -->
    <textarea class="input" id="post-content" rows="3" placeholder="Que estas pensando, ${STATE.user.username}? 🏍️" style="resize:none;border-radius:14px;padding:14px;font-size:14px"></textarea>

    <!-- Media upload button — compact -->
    <div style="margin-top:12px">
      <button onclick="document.getElementById('post-file-any').click()" style="width:100%;padding:10px 14px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;cursor:pointer;display:flex;align-items:center;gap:8px;transition:all 0.2s;font-size:13px;color:var(--text2)" onmouseover="this.style.borderColor='rgba(255,68,68,0.5)';this.style.background='rgba(255,68,68,0.08)';this.style.color='#fff'" onmouseout="this.style.borderColor='rgba(255,255,255,0.08)';this.style.background='rgba(255,255,255,0.04)';this.style.color='var(--text2)'">
        <span style="font-size:18px">📷</span>
        <span style="font-weight:500">Adjuntar foto, video o audio</span>
      </button>
    </div>

    <!-- Hidden file input (accepts all media) -->
    <input type="file" id="post-file-any" accept="image/*,video/*,audio/*" style="display:none" onchange="handlePostFileAny(event)">

    <!-- Preview area -->
    <div id="post-media-preview" style="margin-top:12px;display:none"></div>
    <div id="post-media-type" style="display:none;margin-top:8px;font-size:11px;color:var(--text2);text-align:center"></div>

    <button class="btn btn-primary" style="width:100%;margin-top:14px;font-weight:700" onclick="doCreatePost()">🏍️ Publicar</button>
  `);
}

function openMediaPicker(type) {
  const el = document.getElementById('post-file-' + type);
  if (el) el.click();
}

function handlePostFileAny(e) {
  const file = e.target.files[0];
  if (file) processPostFile(file);
  e.target.value = '';
}

function handlePostFileType(e, type) {
  const file = e.target.files[0];
  if (file) processPostFile(file);
}

function handlePostDrop(e) {
  e.preventDefault();
  e.currentTarget.style.borderColor = 'var(--border)';
  e.currentTarget.style.background = 'var(--card)';
  const file = e.dataTransfer.files[0];
  if (file) processPostFile(file);
}

function handlePostFile(e) {
  const file = e.target.files[0];
  if (file) processPostFile(file);
}

async function processPostFile(file) {
  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');
  const isAudio = file.type.startsWith('audio/');
  if (!isImage && !isVideo && !isAudio) { toast('Tipo de archivo no soportado'); return; }

  // Images: max 50MB. Video/audio: no limit.
  if (isImage && file.size > 50 * 1024 * 1024) { toast('Imagen muy grande (máx 50MB)'); return; }

  const type = isImage ? 'image' : (isVideo ? 'video' : 'audio');
  let dataUrl;
  let fileToUpload = file;

  if (isImage) {
    // Feedback inmediato: leer + decodificar una foto de cámara (10-50MB) tarda 1-3s
    const preview = document.getElementById('post-media-preview');
    if (preview) {
      preview.style.display = 'block';
      preview.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;gap:10px;padding:28px;color:var(--text2);font-size:13px;background:rgba(255,255,255,0.03);border-radius:12px">
        <div style="width:18px;height:18px;border:2px solid rgba(255,255,255,0.15);border-top-color:#ff4444;border-radius:50%;animation:avatarRing 0.8s linear infinite"></div>
        Procesando foto...</div>`;
    }
    // Optimizado para el feed: 1280px en WebP => nítido en el teléfono pero
    // mucho más ligero, así carga rápido. Si aún pesa, baja escalonado hasta
    // ~350 KB (480K chars de data URL ≈ 350 KB reales).
    dataUrl = await compressImage(file, 1280, 0.72);
    if (dataUrl && dataUrl.length > 480 * 1024) dataUrl = await compressImage(file, 1080, 0.66) || dataUrl;
    if (dataUrl && dataUrl.length > 480 * 1024) dataUrl = await compressImage(file, 900, 0.6) || dataUrl;
    if (!dataUrl) { toast('No se pudo procesar la imagen'); renderPostPreview(); return; }
  } else if (isVideo) {
    // Compress video with FFmpeg (720p, small file)
    const preview = document.getElementById('post-media-preview');
    if (preview) preview.innerHTML = '<div style="text-align:center;color:var(--text2);padding:20px">Comprimiendo video... esto puede tardar un momento</div>';
    const compressed = await compressVideo(file, null);
    if (compressed) {
      dataUrl = URL.createObjectURL(compressed);
      fileToUpload = compressed;
      toast('Video comprimido!');
    } else {
      dataUrl = URL.createObjectURL(file);
    }
  } else {
    // Audio: use blob URL
    dataUrl = URL.createObjectURL(file);
  }

  // Para imágenes, el dataUrl ya es la versión comprimida (WebP/JPEG): se sube
  // con su content-type y extensión reales, y se muestra su tamaño reducido.
  let outMime = file.type, outName = file.name, outSize = fileToUpload.size;
  if (isImage && dataUrl && dataUrl.startsWith('data:')) {
    outMime = dataUrl.substring(5, dataUrl.indexOf(';'));
    const ext = outMime === 'image/webp' ? 'webp' : (outMime === 'image/png' ? 'png' : 'jpg');
    outName = (file.name || 'foto').replace(/\.[^.]+$/, '') + '.' + ext;
    outSize = Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 3 / 4);
  }

  POST_DRAFT = {
    type,
    dataUrl,
    file: fileToUpload,
    fileName: outName,
    fileSize: outSize,
    mimeType: outMime,
    originalSize: file.size,
  };

  renderPostPreview();
}

// ============================================================
// VIDEO COMPRESSION via FFmpeg.wasm
// ============================================================
let ffmpegInstance = null;
let ffmpegLoading = false;

async function loadFFmpeg(onProgress) {
  if (ffmpegInstance) return ffmpegInstance;
  if (ffmpegLoading) {
    // Wait for existing load
    while (ffmpegLoading) await new Promise(r => setTimeout(r, 500));
    return ffmpegInstance;
  }
  ffmpegLoading = true;
  try {
    const { FFmpeg } = await import('https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/+esm');
    const { fetchFile } = await import('https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12.1/+esm');
    const ff = new FFmpeg();
    ff.on('progress', ({ progress }) => {
      if (onProgress) onProgress(progress * 100);
    });
    await ff.load({
      coreURL: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js',
      wasmURL: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm',
    });
    ffmpegInstance = { ff, fetchFile };
    return ffmpegInstance;
  } catch(e) {
    ffmpegLoading = false;
    throw e;
  } finally {
    ffmpegLoading = false;
  }
}

async function compressVideo(file, onProgress) {
  try {
    const { ff, fetchFile } = await loadFFmpeg(onProgress);
    const inputName = 'input_' + Date.now() + '.mp4';
    const outputName = 'output_' + Date.now() + '.mp4';

    // Write input file
    const inputData = await fetchFile(file);
    await ff.writeFile(inputName, inputData);

    // Compress: 720p, CRF 23 (high quality), fast preset — targets ~1MB/min
    await ff.exec([
      '-i', inputName,
      '-vf', 'scale=-2:720',
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '23',
      '-c:a', 'aac',
      '-b:a', '64k',
      '-movflags', '+faststart',
      outputName
    ]);

    // Read compressed output
    const data = await ff.readFile(outputName);
    const blob = new Blob([data.buffer], { type: 'video/mp4' });

    // Cleanup
    await ff.deleteFile(inputName);
    await ff.deleteFile(outputName);

    return blob;
  } catch(e) {
    console.warn('Video compression failed:', e);
    return null;
  }
}

function renderPostPreview() {
  const preview = document.getElementById('post-media-preview');
  const zone = document.getElementById('post-media-zone');
  const typeIndicator = document.getElementById('post-media-type');
  if (!POST_DRAFT || !POST_DRAFT.dataUrl) {
    preview.style.display = 'none';
    preview.innerHTML = '';
    if (zone) zone.style.display = 'block';
    if (typeIndicator) typeIndicator.style.display = 'none';
    return;
  }
  if (zone) zone.style.display = 'none';
  preview.style.display = 'block';
  const sizeKB = Math.round(POST_DRAFT.fileSize / 1024);
  const typeEmoji = POST_DRAFT.type === 'image' ? '📷' : (POST_DRAFT.type === 'video' ? '🎬' : '🎵');
  const typeLabel = POST_DRAFT.type === 'image' ? 'Imagen' : (POST_DRAFT.type === 'video' ? 'Video' : 'Audio');

  if (POST_DRAFT.type === 'image') {
    preview.innerHTML = `
      <div style="position:relative;border-radius:12px;overflow:hidden;background:#000">
        <img src="${POST_DRAFT.dataUrl}" style="display:block;width:100%;max-height:70vh;object-fit:contain;background:#000" onload="(function(img){var r=img.naturalHeight/img.naturalWidth;if(r>1.3){img.style.maxHeight='75vh';img.style.width='auto';img.style.maxWidth='100%';img.style.margin='0 auto'}})(this)">
        <button type="button" onclick="clearPostMedia()" style="position:absolute;top:8px;right:8px;background:rgba(0,0,0,0.7);color:#fff;border:none;border-radius:50%;width:32px;height:32px;font-size:16px;cursor:pointer;backdrop-filter:blur(8px)">✕</button>
        <div style="position:absolute;bottom:8px;left:8px;background:rgba(0,0,0,0.7);color:#fff;padding:4px 10px;border-radius:20px;font-size:11px;backdrop-filter:blur(8px)">${typeEmoji} ${typeLabel} · ${sizeKB}KB</div>
      </div>
    `;
  } else if (POST_DRAFT.type === 'video') {
    const sizeMB = (POST_DRAFT.fileSize / 1024 / 1024).toFixed(1);
    const origMB = POST_DRAFT.originalSize ? (POST_DRAFT.originalSize / 1024 / 1024).toFixed(1) : null;
    const compressionNote = (origMB && origMB !== sizeMB)
      ? `<span style="color:#22c55e"> · Comprimido ${origMB}MB → ${sizeMB}MB</span>`
      : `<span> · ${sizeMB}MB</span>`;
    preview.innerHTML = `
      <div style="position:relative;border-radius:12px;overflow:hidden;background:#000">
        <video src="${POST_DRAFT.dataUrl}" controls style="display:block;width:100%;max-height:480px;background:#000"></video>
        <button type="button" onclick="clearPostMedia()" style="position:absolute;top:8px;right:8px;background:rgba(0,0,0,0.7);color:#fff;border:none;border-radius:50%;width:32px;height:32px;font-size:16px;cursor:pointer;backdrop-filter:blur(8px);z-index:5">✕</button>
        <div style="position:absolute;top:8px;left:8px;background:rgba(0,0,0,0.7);color:#fff;padding:4px 10px;border-radius:20px;font-size:11px;backdrop-filter:blur(8px);display:flex;align-items:center;gap:4px">${typeEmoji} VIDEO${compressionNote}</div>
      </div>
    `;
  } else {
    // audio
    preview.innerHTML = `
      <div style="position:relative;border-radius:12px;background:linear-gradient(135deg,rgba(255,68,68,0.15),rgba(255,136,0,0.15));border:1px solid var(--border);padding:14px">
        <button type="button" onclick="clearPostMedia()" style="position:absolute;top:8px;right:8px;background:var(--card);color:var(--text);border:1px solid var(--border);border-radius:50%;width:28px;height:28px;font-size:14px;cursor:pointer">✕</button>
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
          <div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#ff4444,#ff8800);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;animation:audioPulse 2s ease-in-out infinite">🎵</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${POST_DRAFT.fileName}</div>
            <div style="font-size:11px;color:var(--text2)">${typeEmoji} ${typeLabel} · ${sizeKB}KB</div>
          </div>
        </div>
        <audio src="${POST_DRAFT.dataUrl}" controls style="width:100%"></audio>
      </div>
    `;
  }
  if (typeIndicator) {
    typeIndicator.style.display = 'block';
    const origMB = POST_DRAFT.originalSize ? (POST_DRAFT.originalSize / 1024 / 1024).toFixed(1) : null;
    const compressionNote = (POST_DRAFT.type === 'video' && origMB && origMB !== (POST_DRAFT.fileSize / 1024 / 1024).toFixed(1))
      ? ` · Comprimido de ${origMB}MB`
      : '';
    typeIndicator.textContent = `${typeEmoji} ${typeLabel} detectado — listo para publicar${compressionNote}`;
  }
}

function clearPostMedia() {
  POST_DRAFT = { type: null, dataUrl: null, file: null, fileName: '', fileSize: 0, mimeType: null };
  ['image','video','audio'].forEach(t => {
    const inp = document.getElementById('post-file-' + t);
    if (inp) inp.value = '';
  });
  renderPostPreview();
}

 async function doCreatePost() {
  const content = document.getElementById('post-content').value.trim();
  if (!content && (!POST_DRAFT || !POST_DRAFT.dataUrl)) { toast('Escribe algo o sube una foto/video/audio'); return; }
  if (!STATE.user) { toast('Inicia sesion primero'); return; }

  // Close modal immediately
  closeModal();

  // Prepare media data for instant display
  let mediaData = null;
  if (POST_DRAFT?.dataUrl) {
    mediaData = {
      type: POST_DRAFT.type,
      url: POST_DRAFT.dataUrl,
      blob: null,
      fileName: POST_DRAFT.fileName,
      mimeType: POST_DRAFT.mimeType
    };
    // Get blob for background upload
    if (POST_DRAFT.dataUrl.startsWith('data:')) {
      mediaData.blob = dataURLtoBlob(POST_DRAFT.dataUrl);
    } else {
      mediaData.blob = await fetch(POST_DRAFT.dataUrl).then(r => r.blob()).catch(() => null);
    }
  }

  // Create post INSTANTLY - shows immediately
  createPostInstant(content, mediaData);

  // Upload media in background (already handled by createPostInstant)
  toast('Publicado!');
  bsNotifyAll('📸 Nuevo post en BikerGram',
    (STATE.user?.username ? STATE.user.username + ': ' : '') + (content || 'Nueva publicación'),
    'post');
}

async function deletePost(id) {
  if (!confirm('Eliminar esta publicacion?')) return;
  // Mark as deleted to block background sync from restoring it
  STATE._deletedIds = STATE._deletedIds || [];
  STATE._deletedIds.push(id);
  ls('_deletedPosts', STATE._deletedIds); // persist so reload doesn't forget
  // Delete from IndexedDB immediately
  if (DB) await idbDelete('posts', id);
  // Remove from STATE
  STATE.posts = STATE.posts.filter(p => p.id !== id);
  renderBikerGram();
  // Save local first
  saveLocal();
  // Push to cloud immediately so it doesn't come back
  if (HV.connected) {
    await saveToHV('posts', STATE.posts);
    // After cloud synced, remove from deleted list
    STATE._deletedIds = (STATE._deletedIds || []).filter(i => i !== id);
    ls('_deletedPosts', STATE._deletedIds);
  }
  toast('Eliminado');
}

