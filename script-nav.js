// ============================================================
// BREADCRUMB NAVIGATION SYSTEM
// ============================================================
const BREADCRUMB_PAGES = ['profile', 'rider-detail', 'admin', 'admin-users', 'admin-events', 'admin-edit-user', 'admin-edit-event', 'retos', 'insignias'];

function pushNav(page, pageId, label) {
  const isMainTab = ['inicio', 'rutas', 'bikergram', 'chat'].includes(page);
  if (isMainTab) {
    STATE.navStack = [];
  } else {
    const top = STATE.navStack[STATE.navStack.length - 1];
    if (top && top.page === page && top.pageId === pageId) return;
  }
  STATE.navStack.push({ page, pageId, label });
  renderBreadcrumb();
}

function popNav() {
  if (STATE.navStack.length <= 1) return;
  STATE.navStack.pop();
  const prev = STATE.navStack[STATE.navStack.length - 1];
  if (prev) {
    _navNoPush = true;
    navigate(prev.page, prev.pageId);
    _navNoPush = false;
  }
  renderBreadcrumb();
}

function navigateToBreadcrumb(index) {
  if (index < 0 || index >= STATE.navStack.length) return;
  STATE.navStack = STATE.navStack.slice(0, index + 1);
  const target = STATE.navStack[index];
  _navNoPush = true;
  navigate(target.page, target.pageId);
  _navNoPush = false;
  renderBreadcrumb();
}

function renderBreadcrumb() {
  const bar = document.getElementById('breadcrumb-bar');
  const inner = document.getElementById('breadcrumb-inner');
  if (!bar || !inner) return;
  const stack = STATE.navStack;
  if (stack.length === 0) { bar.style.display = 'none'; return; }
  bar.style.display = 'flex';
  let html = '';
  // Botón Atrás neón parpadeante — solo cuando hay a dónde retroceder
  if (stack.length > 1) {
    html += `<button class="neon-back-btn" onclick="popNav()" aria-label="Atrás"><span class="bk-arrow">←</span> Atrás</button>`;
  }
  stack.forEach((item, i) => {
    const isLast = i === stack.length - 1;
    if (i > 0) html += '<span class="breadcrumb-sep">›</span>';
    if (isLast) {
      html += `<span class="breadcrumb-current">${item.label}</span>`;
    } else {
      html += `<span class="breadcrumb-link" onclick="navigateToBreadcrumb(${i})">${item.label}</span>`;
    }
  });
  inner.innerHTML = html;
}

// ============================================================
// NAVIGATION
// ============================================================
let _navNoPush = false; // set true by popNav/navigateToBreadcrumb to avoid duplicate stack entry

function navigate(page, pageId) {
  closeFpanel(); // always close floating panel on navigation
  if (page !== 'bikergram') removeNewPostsPill(); // el globo solo vive en el feed

  const pageLabels = {
    inicio: 'Inicio', rutas: 'Rutas', bikergram: 'Gram',
    profile: 'Mi Perfil', admin: 'Admin',
    'admin-users': 'Usuarios', 'admin-events': 'Eventos',
    'admin-notif': 'Notificaciones', 'admin-sync': 'HeyValue Sync',
    'admin-recovery': 'Recuperaciones',
    'admin-edit-user': 'Editar Usuario', 'admin-edit-event': 'Editar Evento',
    retos: 'Retos', insignias: 'Insignias',
    juegos: 'Juegos', 'ludo-game': 'Ludo',
    'rider-detail': 'Perfil',
    dm: 'Mensajes'
  };
  const label = pageLabels[page] || page;

  if (!_navNoPush) {
    const isMainTab = ['inicio', 'rutas', 'bikergram', 'chat'].includes(page);
    if (isMainTab) {
      STATE.navStack = [{ page, pageId, label }];
    } else {
      const top = STATE.navStack[STATE.navStack.length - 1];
      if (!top || top.page !== page || String(top.pageId) !== String(pageId)) {
        STATE.navStack.push({ page, pageId, label });
      }
    }
  }

  // Update bottom nav
  document.querySelectorAll('.bnav-item').forEach(b => b.classList.remove('active'));
  const btn = document.querySelector(`.bnav-item[data-page="${page}"]`);
  if (btn) btn.classList.add('active');

  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

  STATE.currentPage = page;
  STATE.currentPageId = pageId;
  renderPage(page, pageId);
  renderBreadcrumb();

  // Refresh posts from cloud when entering BikerGram (no flicker — render happens once via timer)
  if (page === 'bikergram' && HV.connected) {
    syncPostsFromCloud();
  }
}

function renderPage(page, pageId) {
  const el = document.getElementById('page-' + page);
  if (!el) return;
  el.classList.add('active');

  switch(page) {
    case 'inicio': renderInicio(); break;
    case 'rutas': renderRutas(); break;
    case 'bikers': renderBikers(); break;
    case 'rider-detail': renderRiderDetail(pageId); break;
    case 'bikergram': renderBikerGram(); break;
    case 'eventos': RUTAS_TAB = 'rutas'; renderRutas(); break;
    case 'retos': renderRetos(); break;
    case 'insignias': renderInsignias(); break;
    case 'profile': renderProfile(); break;
    case 'admin': renderAdmin(); break;
    case 'chat': renderChat(); break;
    case 'ranking': renderRanking(); break;
    case 'juegos': openLudo3D(); break;
    case 'mapas': renderMapas(); break;
    case 'en-ruta': renderEnRuta(); break;
    case 'dm': renderDmPage(); break;
  }

  // Scroll to top
  el.scrollTop = 0;
}

