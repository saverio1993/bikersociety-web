// ============================================================
// NEWS FEED (Motos)
// ============================================================
async function loadNews() {
  const container = document.getElementById('news-container');
  if (!container) return;
  container.innerHTML = '<div class="news-loading">Cargando noticias...</div>';
  try {
    // Noticias de motos y de tránsito (Google News en español)
    const J = url => `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`;
    const [motoRes, transitoRes] = await Promise.all([
      fetch(J('https://news.google.com/rss/search?q=motos OR motociclismo OR motociclistas&hl=es-419&gl=PA&ceid=PA:es-419')).catch(() => null),
      fetch(J('https://news.google.com/rss/search?q=tránsito OR "seguridad vial" OR accidente de tránsito&hl=es-419&gl=PA&ceid=PA:es-419')).catch(() => null),
    ]);

    let items = [];

    if (motoRes?.ok) {
      const d = await motoRes.json();
      if (d.status === 'ok' && d.items?.length) {
        items.push(...d.items.slice(0, 4).map(i => ({ ...i, _cat: '🏍️ Motos' })));
      }
    }

    if (transitoRes?.ok) {
      const d = await transitoRes.json();
      if (d.status === 'ok' && d.items?.length) {
        items.push(...d.items.slice(0, 3).map(i => ({ ...i, _cat: '🚦 Tránsito' })));
      }
    }

    if (!items.length) throw new Error('No news');

    // Mezclar aleatoriamente
    items.sort(() => Math.random() - 0.5);

    container.innerHTML = '<div class="news-grid">' + items.map(item => `
      <a class="news-card" href="${item.link}" target="_blank" rel="noopener">
        ${item.thumbnail ? `<img class="news-card-img" src="${item.thumbnail}" alt="${item.title}" onerror="this.style.display='none'">` : ''}
        <div class="news-card-body">
          <div class="news-card-title">${item.title}</div>
          <div class="news-card-desc">${item.description ? item.description.replace(/<[^>]+>/g, '').substring(0, 100) + '...' : ''}</div>
          <div class="news-card-meta">
            <span class="news-badge">${item._cat}</span>
            ${new Date(item.pubDate).toLocaleDateString('es-PA', {day:'numeric',month:'short'})}
          </div>
        </div>
      </a>
    `).join('') + '</div>';
  } catch (e) {
    container.innerHTML = '<div class="news-error">No se pudieron cargar las noticias</div>';
  }
}

// ============================================================
// MORE MENU
// ============================================================
function showMoreMenu() {
  const u = STATE.user;
  const isAdmin = !!(u && u.is_admin);
  const isLoggedIn = !!u;
  const lv = isLoggedIn ? levelOf(u.points) : levelOf(0);
  const next = isLoggedIn ? nextLevel(u.points) : 2000;

  const body = document.getElementById('fpanel-body');
  body.innerHTML = `
    ${isLoggedIn ? `
    <!-- User summary → navega al perfil al tocar -->
    <div onclick="closeFpanel();navigate('profile')" style="margin:8px 4px 16px;padding:16px;background:rgba(0,212,255,0.06);border:1px solid rgba(0,212,255,0.15);border-radius:18px;cursor:pointer;transition:background 0.2s" onmouseenter="this.style.background='rgba(0,212,255,0.11)'" onmouseleave="this.style.background='rgba(0,212,255,0.06)'">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
        ${renderAvatar(u, 48)}
        <div style="flex:1;min-width:0">
          <div style="font-size:16px;font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${u.username}</div>
          <div style="font-size:12px;color:var(--text2);margin-top:2px">${u.bike_model || 'Sin moto'}</div>
        </div>
        <span style="font-size:18px;color:rgba(0,212,255,0.5)">›</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text2);margin-bottom:6px">
        <span style="font-weight:700;color:var(--text1)">Nivel ${lv.name}</span>
        <span>${u.points} pts · <span style="color:#a855f7;font-weight:600">Faltan ${next - u.points} pts</span> para nivel ${levelNum(u.points) + 1}</span>
      </div>
      <div style="height:8px;background:rgba(255,255,255,0.08);border-radius:6px;overflow:hidden;position:relative">
        <div id="fpanel-lvl-bar" style="height:100%;width:0%;background:linear-gradient(90deg,#00d4ff,#a855f7);border-radius:6px;transition:width 0.9s cubic-bezier(.4,0,.2,1);position:relative">
          <div style="position:absolute;right:0;top:50%;transform:translateY(-50%);width:10px;height:10px;background:#fff;border-radius:50%;box-shadow:0 0 6px #a855f7"></div>
        </div>
      </div>
      <div style="text-align:right;font-size:10px;color:#a855f7;font-weight:700;margin-top:4px" id="fpanel-lvl-pct">${Math.round(levelProgress(u.points))}%</div>
    </div>

    <!-- Gamificacion -->
    <div class="fpanel-section-label">GAMIFICACION</div>
    <div class="fpanel-submenu">
      <button class="fpanel-subitem" onclick="closeFpanel();navigate('retos')">
        <div class="fpanel-subitem-icon">🏆</div>
        <span>Retos y Desafios</span>
      </button>
      <button class="fpanel-subitem" onclick="closeFpanel();navigate('insignias')">
        <div class="fpanel-subitem-icon">🎖️</div>
        <span>Insignias</span>
      </button>
    </div>

    <!-- Juegos -->
    <div class="fpanel-section-label">JUEGOS</div>
    <div class="fpanel-item" onclick="closeFpanel();openLudo3D()">
      <div class="fpanel-item-icon" style="background:rgba(0,212,255,0.1);border-color:rgba(0,212,255,0.25)">🎲</div>
      <div class="fpanel-item-text">
        <span class="fpanel-item-label">Ludo</span>
        <span class="fpanel-item-sub">Juega contra otro rider, por turnos</span>
      </div>
      <span class="fpanel-item-arrow">→</span>
    </div>


    ${isAdmin ? `
    <!-- Admin -->
    <div class="fpanel-section-label">ADMINISTRACION</div>
    <div class="fpanel-item" onclick="closeFpanel();navigate('admin')">
      <div class="fpanel-item-icon" style="background:rgba(251,191,36,0.1);border-color:rgba(251,191,36,0.2)">⚙️</div>
      <div class="fpanel-item-text">
        <span class="fpanel-item-label">Panel Admin</span>
        <span class="fpanel-item-sub">Gestionar usuarios y contenido</span>
      </div>
      <span class="fpanel-item-arrow">→</span>
    </div>
    <!-- Sincronizacion (solo admins) -->
    <div class="fpanel-section-label">SINCRONIZACION</div>
    <div class="fpanel-item" style="cursor:default">
      <div class="fpanel-item-icon" style="${HV.connected ? 'background:rgba(34,197,94,0.15);border-color:rgba(34,197,94,0.3)' : 'background:rgba(255,136,0,0.15);border-color:rgba(255,136,0,0.3)'}">
        ${HV.connected ? '✅' : '☁️'}
      </div>
      <div class="fpanel-item-text">
        <span class="fpanel-item-label">HeyValue Cloud</span>
        <span class="fpanel-item-sub">${HV.connected ? 'Conectado' : 'No conectado'}</span>
      </div>
      ${HV.connected ? '<span style="font-size:10px;color:#22c55e;font-weight:700">OK</span>' : ''}
    </div>
    ` : ''}

    <!-- App -->
    <div class="fpanel-section-label">APP</div>

    <!-- Descarga APK nativo Android -->
    <a href="bikersociety.apk" download="BikerSociety.apk" id="apk-download-btn"
      style="display:flex;align-items:center;gap:12px;padding:12px 14px;margin-bottom:6px;background:linear-gradient(135deg,rgba(255,68,68,0.12),rgba(255,136,0,0.08));border:1.5px solid rgba(255,100,0,0.45);border-radius:14px;text-decoration:none;cursor:pointer;box-shadow:0 0 14px rgba(255,80,0,0.2);transition:box-shadow 0.2s"
      onmouseenter="this.style.boxShadow='0 0 24px rgba(255,80,0,0.4)'" onmouseleave="this.style.boxShadow='0 0 14px rgba(255,80,0,0.2)'"
      onclick="checkApkExists(event)">
      <img src="icons/logo.png" style="width:38px;height:38px;border-radius:10px;object-fit:cover;flex-shrink:0;box-shadow:0 0 8px rgba(255,68,68,0.4)">
      <div style="flex:1;min-width:0">
        <div style="font-size:14px;font-weight:800;color:#fff">Biker Society APK</div>
        <div style="font-size:11px;color:rgba(255,180,100,0.9);margin-top:1px">Android · Alarmas nativas · Sin navegador</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:2px;flex-shrink:0">
        <span style="font-size:20px">📥</span>
        <span style="font-size:9px;font-weight:700;color:rgba(255,180,100,0.8)">ANDROID</span>
      </div>
    </a>


    <div class="fpanel-divider"></div>

    <!-- Cerrar sesion -->
    <div class="fpanel-item danger" onclick="closeFpanel();logout()">
      <div class="fpanel-item-icon">🚪</div>
      <div class="fpanel-item-text">
        <span class="fpanel-item-label">Cerrar sesion</span>
        <span class="fpanel-item-sub">Salir de ${u.username}</span>
      </div>
    </div>

    ` : `
    <!-- Guest view -->
    <div style="text-align:center;padding:24px 8px">
      <div style="font-size:40px;margin-bottom:12px">🏍️</div>
      <div style="font-size:16px;font-weight:700;margin-bottom:6px">Biker Society</div>
      <div style="font-size:13px;color:var(--text2);margin-bottom:16px">Inicia sesion para acceder a todas las funciones</div>
      <button class="btn btn-primary" style="width:100%" onclick="closeFpanel();showLogin()">Iniciar Sesion</button>
    </div>
    `}
  `;

  // Open the panel with animation
  document.getElementById('fpanel-overlay').classList.add('open');
  document.getElementById('fpanel').classList.add('open');
  document.body.style.overflow = 'hidden';

  // Animar barra de nivel tras el render
  if (isLoggedIn) {
    requestAnimationFrame(() => {
      const bar = document.getElementById('fpanel-lvl-bar');
      if (bar) bar.style.width = levelProgress(u.points) + '%';
    });
  }
}

function closeFpanel() {
  document.getElementById('fpanel-overlay').classList.remove('open');
  document.getElementById('fpanel').classList.remove('open');
  document.body.style.overflow = '';
}

// ============================================================
// INICIO PAGE
// ============================================================
function renderInicio() {
  const u = STATE.user;
  const lv = levelOf(u ? u.points : 0);
  const progress = levelProgress(u ? u.points : 0);
  const next = nextLevel(u ? u.points : 0);

  // Count my stats
  const myEvents = STATE.attendance.filter(a => a.user_id === u?.id).length;
  const myRoutes = STATE.routes.filter(r => r.created_by === u?.id).length;
  const myBadges = STATE.userBadges.filter(ub => ub.user_id === u?.id).length;

  // Upcoming events
  const upcoming = STATE.events.filter(e => e.status === 'activo').slice(0,3);

  // Ranking top 5 — admins excluded
  const top = [...STATE.users].filter(u => !u.is_admin).sort((a,b) => b.points - a.points).slice(0,5);

  document.getElementById('page-inicio').innerHTML = `
    <!-- Banner de bienvenida -->
    <div class="vanish" id="welcome-banner" style="width:100%;border-radius:16px;overflow:hidden;margin-bottom:14px;line-height:0;border:1px solid rgba(255,68,68,0.25)">
      <img src="icons/banner-bienvenida.png" alt="Bienvenidos a Biker Society" style="width:100%;display:block"
        onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
      <div style="display:none;background:linear-gradient(135deg,#1a0303,#2a0606 35%,#ff4400 160%);min-height:118px;align-items:center;justify-content:center;text-align:center;padding:22px 16px;line-height:1.3">
        <div style="font-size:24px;font-weight:900;color:#fff;text-shadow:0 2px 14px rgba(0,0,0,0.65)">Bienvenidos a Biker Society 🏍️</div>
      </div>
    </div>

    <!-- Wall of Fame Semanal -->
    ${(() => {
      const w = getWeeklyRankings();
      const uKm = w.km ? STATE.users.find(x => x.id === w.km.user_id) : null;
      const uLk = w.likes ? STATE.users.find(x => x.id === w.likes.user_id) : null;
      const uPh = w.photos ? STATE.users.find(x => x.id === w.photos.user_id) : null;
      const hasAny = uKm || uLk || uPh;
      if (!hasAny) return '';
      const days = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
      const today = new Date();
      return `
      <div class="vanish" style="animation-delay:0.15s;margin:16px 0">
        <div style="font-size:13px;font-weight:700;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">
          <span style="color:var(--text2)">MURO DE LA FAMA</span>
          <span style="font-size:11px;color:var(--accent)">Semana del ${getWeekStart().getDate()} · ${days[today.getDay()]}</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
          ${uKm ? `
          <div class="card" style="text-align:center;padding:12px 8px;border-top:2px solid var(--accent);cursor:pointer" onclick="viewRider(${uKm.id})">
            <div style="font-size:24px;margin-bottom:4px">🏆</div>
            <div style="font-size:10px;color:var(--text2);margin-bottom:4px">REY DEL ASFALTO</div>
            <div style="margin:0 auto 4px;width:32px">${renderAvatar(uKm, 32)}</div>
            <div style="font-size:12px;font-weight:700">${uKm.username}</div>
            <div style="font-size:16px;font-weight:900;color:var(--accent)">${w.km.km} km</div>
          </div>
          ` : '<div class="card" style="text-align:center;padding:12px 8px;opacity:0.3"><div style="font-size:24px;margin-bottom:4px">🛣️</div><div style="font-size:10px;color:var(--text2)">REY DEL ASFALTO</div><div style="font-size:11px;margin-top:8px;color:var(--text2)">—</div></div>'}
          ${uLk ? `
          <div class="card" style="text-align:center;padding:12px 8px;border-top:2px solid #ff8800;cursor:pointer" onclick="viewRider(${uLk.id})">
            <div style="font-size:24px;margin-bottom:4px">❤️</div>
            <div style="font-size:10px;color:var(--text2);margin-bottom:4px">REY DE LIKES</div>
            <div style="margin:0 auto 4px;width:32px">${renderAvatar(uLk, 32)}</div>
            <div style="font-size:12px;font-weight:700">${uLk.username}</div>
            <div style="font-size:16px;font-weight:900;color:#ff8800">${w.likes.likes} likes</div>
          </div>
          ` : '<div class="card" style="text-align:center;padding:12px 8px;opacity:0.3"><div style="font-size:24px;margin-bottom:4px">❤️</div><div style="font-size:10px;color:var(--text2)">REY DE LIKES</div><div style="font-size:11px;margin-top:8px;color:var(--text2)">—</div></div>'}
          ${uPh ? `
          <div class="card" style="text-align:center;padding:12px 8px;border-top:2px solid #22c55e;cursor:pointer" onclick="viewRider(${uPh.id})">
            <div style="font-size:24px;margin-bottom:4px">📸</div>
            <div style="font-size:10px;color:var(--text2);margin-bottom:4px">REY DE FOTOS</div>
            <div style="margin:0 auto 4px;width:32px">${renderAvatar(uPh, 32)}</div>
            <div style="font-size:12px;font-weight:700">${uPh.username}</div>
            <div style="font-size:16px;font-weight:900;color:#22c55e">${w.photos.photos} fotos</div>
          </div>
          ` : '<div class="card" style="text-align:center;padding:12px 8px;opacity:0.3"><div style="font-size:24px;margin-bottom:4px">📸</div><div style="font-size:10px;color:var(--text2)">REY DE FOTOS</div><div style="font-size:11px;margin-top:8px;color:var(--text2)">—</div></div>'}
        </div>
      </div>
      `;
    })()}

    <!-- Top Ranking -->
    <div class="vanish" style="animation-delay:0.2s">
      <div style="font-size:13px;font-weight:700;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">
        <span style="color:var(--text2)">TOP BIKERS</span>
        <span style="font-size:11px;color:var(--accent);cursor:pointer" onclick="navigate('bikers')">Ver todos →</span>
      </div>
      ${top.map((r,i) => `
        <div class="rank-item" onclick="viewRider(${r.id})" style="cursor:pointer">
          <div class="rank-num ${i===0?'gold':i===1?'silver':i===2?'bronze':''}">${i+1}</div>
          ${renderAvatar(r, 36)}
          <div class="rider-info">
            <div class="rider-name">${r.username}${r.is_admin?' <span class="badge-gold" style="padding:1px 6px;font-size:9px">ADMIN</span>':''}</div>
            <div class="rider-bike">${r.bike_model || 'Sin moto'}</div>
          </div>
          <div class="rider-points">${r.points} pts</div>
        </div>
      `).join('')}
    </div>

    <!-- Proximas Rutas (solo futuras) -->
    ${(() => { const today = new Date().toISOString().slice(0,10); const prox = STATE.routes.filter(r => !r.date || r.date >= today).slice(0,3); return prox.length ? `
    <div class="vanish" style="animation-delay:0.25s;margin-top:16px">
      <div style="font-size:13px;font-weight:700;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">
        <span style="color:var(--text2)">PROXIMAS RUTAS</span>
        <span style="font-size:11px;color:var(--accent);cursor:pointer" onclick="navigate('rutas')">Ver todos →</span>
      </div>
      ${prox.map(r => `
        <div class="card vanish route-card" style="cursor:pointer;position:relative" onclick="navigateToRoute(${r.id})">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
            <div style="flex:1;min-width:0">
              <div class="card-title">${escHtml(r.name)}</div>
              <div class="card-sub">${escHtml(r.start_name || 'Sin origen')} → ${escHtml(r.end_name || 'Sin destino')}</div>
              <div style="margin-top:6px;display:flex;gap:6px">
                <span class="badge">⚡ ${r.difficulty}</span>
              </div>
            </div>
            <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0;min-width:108px;position:relative;z-index:3" onclick="event.stopPropagation()">
              <button onclick="event.stopPropagation();openRouteInNav(${r.id})" title="Seguir en Waze o Maps" style="width:100%;padding:7px 11px;border-radius:14px;font-size:11px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px;background:linear-gradient(135deg,#00d4ff,#0ea5e9);border:none;color:#fff">🧭 Seguir</button>
              ${(STATE.user && STATE.user.is_admin) || r.created_by === STATE.user?.id ? `
              <button onclick="event.stopPropagation();editRoute(${r.id})" style="width:100%;padding:7px 11px;border-radius:14px;font-size:11px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px;background:var(--surface2);border:1px solid var(--border);color:var(--text)">✏️ Editar</button>
              <button onclick="event.stopPropagation();deleteRoute(${r.id})" style="width:100%;padding:7px 11px;border-radius:14px;font-size:11px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px;background:var(--surface2);border:1px solid #ef4444;color:#ef4444">🗑️ Eliminar</button>
              ` : ''}
            </div>
          </div>
      `).join('')}
    </div>
    ` : ''; })()}

  `;
}

function initHomeMap() {
  if (STATE.map) { STATE.map.remove(); STATE.map = null; }
  const mapEl = document.getElementById('map-home');
  if (!mapEl) return;

  const map = L.map('map-home', {zoomControl:false, attributionControl:false}).setView([8.9824, -79.5199], 12);
  _mapTile().addTo(map);

  // My location marker
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      const {latitude:lat, longitude:lng} = pos.coords;
      map.setView([lat, lng], 13);
      L.circle([lat, lng], {color:'#ff4444', fillColor:'#ff4444', fillOpacity:0.3, radius:200}).addTo(map);
      L.marker([lat, lng]).addTo(map).bindPopup('Tu ubicacion');
    }, () => {}, {timeout:5000});
  }

  // Event markers
  STATE.events.filter(e => e.latitude && e.longitude).forEach(ev => {
    L.circle([ev.latitude, ev.longitude], {
      color:'#ff8800', fillColor:'#ff8800', fillOpacity:0.4, radius:300
    }).addTo(map).bindPopup(`<b>${ev.title}</b><br>${ev.date}`);
  });

  // Route lines with real-road routing via OSRM
  STATE.routes.forEach(rt => {
    if (!rt.start_lat || !rt.end_lat) return;
    const pts = [[rt.start_lat, rt.start_lng]];
    let stops = [];
    try { stops = JSON.parse(rt.stops || '[]'); } catch(e) {}
    stops.forEach(s => { if (s.lat && s.lng) pts.push([parseFloat(s.lat), parseFloat(s.lng)]); });
    pts.push([rt.end_lat, rt.end_lng]);

    // SALIDA pill
    const startDiv = L.divIcon({className:'', html:`<div style="background:#22c55e;color:#fff;font-size:10px;font-weight:700;padding:3px 8px;border-radius:20px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.5)">SALIDA</div>`});
    L.marker([rt.start_lat, rt.start_lng], {icon:startDiv}).addTo(map);

    // PARADA pills
    stops.forEach(s => {
      if (!s.lat || !s.lng) return;
      const stopDiv = L.divIcon({className:'', html:`<div style="background:#ff8800;color:#fff;font-size:10px;font-weight:700;padding:3px 8px;border-radius:20px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.5)">PARADA</div>`});
      L.marker([parseFloat(s.lat), parseFloat(s.lng)], {icon:stopDiv}).addTo(map);
    });

    // DESTINO pill
    const endDiv = L.divIcon({className:'', html:`<div style="background:#ef4444;color:#fff;font-size:10px;font-weight:700;padding:3px 8px;border-radius:20px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.5)">DESTINO</div>`});
    L.marker([rt.end_lat, rt.end_lng], {icon:endDiv}).addTo(map);

    // Dashed placeholder while OSRM loads
    const placeholder = L.polyline(pts, {color:'#ff4444', weight:4, opacity:0.4, dashArray:'10,10'}).addTo(map);

    // Real road route via OSRM
    const coords = pts.map(p => `${p[1]},${p[0]}`).join(';');
    fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`)
      .then(r => r.json())
      .then(data => {
        if (data.code !== 'Ok' || !data.routes || !data.routes[0]) return;
        placeholder.remove();
        L.geoJSON(data.routes[0].geometry, {style: {color:'#ff4444', weight:5, opacity:1, className:'route-animated'}}).addTo(map);
      }).catch(() => {});
  });

  STATE.map = map;
}

