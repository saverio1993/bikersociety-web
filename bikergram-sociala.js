(() => {
  'use strict';

  const css = `
    #page-bikergram{background:#07090d!important;padding:70px 12px 96px!important}
    .bs-gram-shell{max-width:640px;margin:0 auto}
    .bs-gram-head{display:flex;align-items:center;justify-content:space-between;margin:2px 4px 16px}
    .bs-gram-brand{font-size:23px;font-weight:900;letter-spacing:-1.1px;color:#fff}.bs-gram-brand b{color:#ff5a3d}
    .bs-gram-new{width:42px;height:42px;border:0;border-radius:14px;background:linear-gradient(135deg,#ff684a,#ff2e65);color:#fff;font-size:25px;line-height:1;box-shadow:0 9px 24px rgba(255,67,78,.38)}
    .bs-gram-compose{display:flex;align-items:center;gap:10px;padding:11px;margin-bottom:13px;background:#11151d;border:1px solid #222b38;border-radius:18px}
    .bs-gram-compose button{flex:1;border:0;background:#1b2230;color:#99a6b9;text-align:left;border-radius:13px;padding:12px 14px;font-size:13px}.bs-gram-compose .bs-gram-add{flex:0;width:38px;height:38px;padding:0;text-align:center;background:rgba(255,90,61,.14);color:#ff725a;font-size:19px}
    .bs-gram-tabs{display:flex;gap:8px;overflow-x:auto;padding:1px 2px 14px;scrollbar-width:none}.bs-gram-tabs::-webkit-scrollbar{display:none}
    .bs-gram-tab{white-space:nowrap;border:1px solid #242d3b;background:#11151d;color:#91a0b4;border-radius:999px;padding:8px 13px;font-size:12px;font-weight:750}.bs-gram-tab.active{border-color:#ff5a3d;background:#ff5a3d;color:#fff;box-shadow:0 7px 18px rgba(255,90,61,.25)}
    .bs-gram-card{overflow:hidden;margin:0 0 14px;background:#10141b;border:1px solid #202938;border-radius:20px;box-shadow:0 8px 24px rgba(0,0,0,.2)}
    .bs-gram-author{display:flex;align-items:center;gap:10px;padding:13px 14px}.bs-gram-avatar{flex:0 0 40px;width:40px;height:40px;cursor:pointer}.bs-gram-meta{flex:1;min-width:0}.bs-gram-name{display:block;color:#f6f7fa;font-size:13px;font-weight:800;cursor:pointer}.bs-gram-time{display:block;margin-top:2px;color:#8190a3;font-size:11px}.bs-gram-more{border:0;background:transparent;color:#8390a1;font-size:18px;padding:6px}
    .bs-gram-text{padding:0 14px 13px;color:#eef1f6;font-size:14px;line-height:1.48;white-space:pre-wrap}.bs-gram-media{background:#050607}.bs-gram-media img{display:block;width:100%;max-height:520px;object-fit:cover}.bs-gram-media video{display:block;width:100%;max-height:72vh;object-fit:contain;background:#000}.bs-gram-media audio{width:calc(100% - 28px);margin:14px}
    .bs-gram-stats{display:flex;gap:12px;padding:10px 14px 0;color:#9ca9ba;font-size:11px}.bs-gram-actions{display:flex;gap:4px;padding:9px 9px 10px}.bs-gram-action{flex:1;border:0;border-radius:12px;padding:10px 4px;background:transparent;color:#9ca9ba;font-size:12px;font-weight:700}.bs-gram-action:active{background:#202938}.bs-gram-action.liked{color:#ff6170;background:rgba(255,78,104,.11)}
    .bs-gram-comments{display:none;padding:0 14px 14px;border-top:1px solid #202938}.bs-gram-comment{margin-top:10px;color:#c2cad7;font-size:12px;line-height:1.4}.bs-gram-comment b{color:#ff816b}.bs-gram-comment-form{display:flex;gap:7px;margin-top:11px}.bs-gram-comment-form input{min-width:0;flex:1;border:1px solid #263142;border-radius:12px;background:#171d27;color:#fff;padding:9px 11px;font-size:12px}.bs-gram-comment-form button{border:0;border-radius:11px;background:#ff5a3d;color:#fff;padding:0 13px;font-weight:800}
    .bs-gram-empty{text-align:center;padding:52px 22px;background:#10141b;border:1px dashed #293548;border-radius:20px;color:#91a0b4}.bs-gram-empty strong{display:block;margin:10px 0 5px;color:#f2f4f7;font-size:15px}
  `;

  function injectStyles() {
    if (document.getElementById('bs-gram-sociala-style')) return;
    const style = document.createElement('style');
    style.id = 'bs-gram-sociala-style';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function authorFor(post) {
    return STATE.users.find(user => user.id === post.user_id) || { id: 0, username: 'Biker' };
  }

  function commentsFor(post) {
    return (post.comments || []).map(comment => {
      const user = STATE.users.find(item => item.id === comment.user_id) || { username: 'Biker' };
      return `<div class="bs-gram-comment"><b>${user.username}</b> ${comment.content}</div>`;
    }).join('');
  }

  function mediaFor(post) {
    const url = post.media_url || post.image_url;
    if (!url) return '';
    const type = post.media_type || (post.image_url ? 'image' : '');
    if (type === 'video') return `<div class="bs-gram-media"><video src="${resolveMediaUrlSync(url)}" controls playsinline preload="metadata"></video></div>`;
    if (type === 'audio') return `<div class="bs-gram-media"><audio src="${resolveMediaUrlSync(url)}" controls preload="metadata"></audio></div>`;
    return `<div class="bs-gram-media" onclick="openLightbox('${resolveMediaUrlSync(url)}')"><img src="${resolveMediaUrlSync(url)}" loading="lazy" decoding="async" alt="Publicación de Bikergram"></div>`;
  }

  function postCard(post) {
    const author = authorFor(post);
    const likes = post.likes || [];
    const comments = post.comments || [];
    const liked = Boolean(STATE.user && likes.includes(String(STATE.user.id)));
    const canDelete = STATE.user && (STATE.user.id === post.user_id || STATE.user.is_admin);
    return `<article class="bs-gram-card" id="post-card-${post.id}">
      <header class="bs-gram-author">
        <div class="bs-gram-avatar" onclick="closeFpanel();navigate('rider-detail',${author.id})">${renderAvatar(author, 40)}</div>
        <div class="bs-gram-meta"><span class="bs-gram-name" onclick="closeFpanel();navigate('rider-detail',${author.id})">${author.username}</span><span class="bs-gram-time">${timeAgo(post.created_at)}</span></div>
        ${canDelete ? `<button class="bs-gram-more" onclick="deletePost(${post.id})" aria-label="Eliminar publicación">⋯</button>` : ''}
      </header>
      ${post.content ? `<div class="bs-gram-text">${post.content}</div>` : ''}
      ${mediaFor(post)}
      ${(likes.length || comments.length) ? `<div class="bs-gram-stats">${likes.length ? `<span>❤️ ${likes.length}</span>` : ''}${comments.length ? `<span>${comments.length} comentario${comments.length === 1 ? '' : 's'}</span>` : ''}</div>` : ''}
      <div class="bs-gram-actions">
        <button data-like-btn="${post.id}" class="bs-gram-action ${liked ? 'liked' : ''}" onclick="toggleLike(${post.id});setTimeout(renderBikerGram,0)">${liked ? '❤️ Me gusta' : '🤍 Me gusta'}</button>
        <button class="bs-gram-action" onclick="bsGramToggleComments(${post.id})">💬 Comentar</button>
        <button class="bs-gram-action" onclick="sharePost(${post.id})">↗ Compartir</button>
      </div>
      <section class="bs-gram-comments" id="comments-${post.id}">${commentsFor(post)}
        <div class="bs-gram-comment-form"><input id="cmt-${post.id}" placeholder="Escribe un comentario..." onkeydown="if(event.key==='Enter')addComment(${post.id})"><button onclick="addComment(${post.id})">Enviar</button></div>
      </section>
    </article>`;
  }

  window.bsGramToggleComments = (id) => {
    const element = document.getElementById(`comments-${id}`);
    if (element) element.style.display = element.style.display === 'block' ? 'none' : 'block';
  };

  window.renderBikerGram = () => {
    injectStyles();
    const container = document.getElementById('page-bikergram');
    if (!container || typeof STATE === 'undefined') return;
    const posts = [...STATE.posts].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    container.innerHTML = `<main class="bs-gram-shell">
      <header class="bs-gram-head"><div class="bs-gram-brand"><b>Biker</b>Gram</div><button class="bs-gram-new" onclick="createPost()" aria-label="Crear publicación">+</button></header>
      <div class="bs-gram-compose"><div class="bs-gram-avatar">${STATE.user ? renderAvatar(STATE.user, 40) : '🏍️'}</div><button onclick="createPost()">Comparte una ruta, una foto o una idea…</button><button class="bs-gram-add" onclick="createPost()" aria-label="Añadir publicación">＋</button></div>
      <nav class="bs-gram-tabs" aria-label="Filtro de publicaciones"><button class="bs-gram-tab active">Para ti</button><button class="bs-gram-tab" onclick="this.parentElement.querySelector('.active').classList.remove('active');this.classList.add('active');renderBikerGram()">Más recientes</button><button class="bs-gram-tab" onclick="toast('Próximamente: publicaciones de los bikers que sigues')">Siguiendo</button></nav>
      <section>${posts.length ? posts.map(postCard).join('') : '<div class="bs-gram-empty">🏍️<strong>Aún no hay publicaciones</strong>Comparte la primera aventura de la comunidad.<br><button class="btn btn-primary" style="margin-top:16px" onclick="createPost()">Crear publicación</button></div>'}</section>
    </main>`;
    if (typeof resolveHvMedia === 'function') resolveHvMedia();
    STATE._feedRenderedCount = posts.length;
    if (typeof removeNewPostsPill === 'function') removeNewPostsPill();
  };

  const waitForApp = setInterval(() => {
    if (typeof STATE === 'undefined' || !document.getElementById('page-bikergram')) return;
    clearInterval(waitForApp);
    injectStyles();
    if (document.getElementById('page-bikergram').classList.contains('active')) window.renderBikerGram();
  }, 80);
})();
