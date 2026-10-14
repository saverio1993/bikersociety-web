// APP INIT
// ============================================================
function initApp() {
  // ── Phase 1: Load state from localStorage — wrapped in try/catch to guarantee splash hides ──
  try {
    STATE._cloudSynced = false;
    STATE.users = ls('bs_users') || [...SEED_USERS];
    const session = ls('bs_session');
    if (session) {
      const idx = STATE.users.findIndex(u => u.id === session.id);
      if (idx >= 0) STATE.user = STATE.users[idx];
      else STATE.user = session;
      try { const savedAvatar = getAvatar(); if (savedAvatar) { STATE.user.avatar = savedAvatar; STATE.user.profile_pic = savedAvatar; if (idx >= 0) { STATE.users[idx].avatar = savedAvatar; STATE.users[idx].profile_pic = savedAvatar; } } } catch(e) {}
    }
    STATE.routes = ls('bs_routes') || [...SEED_ROUTES];
    // Filter out deleted routes that may have been restored by cloud sync
    if (STATE._deletedRouteIds && STATE._deletedRouteIds.length > 0) {
      const filtered = STATE.routes.filter(r => !STATE._deletedRouteIds.includes(r.id));
      if (filtered.length !== STATE.routes.length) {
        STATE.routes = filtered;
        ls('bs_routes', STATE.routes);
      }
    }
    STATE.events = ls('bs_events') || [...SEED_EVENTS];
    STATE.posts = ls('bs_posts') || [...SEED_POSTS];
    STATE.badges = [...SEED_BADGES];
    STATE.challenges = ls('bs_challenges') || [...SEED_CHALLENGES];
    STATE.userChallenges = ls('bs_uc') || [];
    STATE.userBadges = ls('bs_ub') || [];
    STATE.chatChannels = ls('bs_cc') || [...SEED_CHANNELS];
    STATE.chatMessages = ls('bs_cm') || [...SEED_MESSAGES];
    STATE.notifications = ls('bs_notif') || [];
    STATE.attendance = ls('bs_att') || [];
    STATE.comments = ls('bs_comments') || [];
    STATE.follows = ls('bs_follows') || [];
    STATE._deletedIds = ls('_deletedPosts') || [];
    STATE._deletedRouteIds = ls('_deletedRoutes') || [];
    STATE._deletedUsers = ls('_deletedUsers') || [];
  } catch(err) {
    console.error('[BS] State load failed, using seeds:', err);
    STATE.users = [...SEED_USERS];
    STATE.routes = [...SEED_ROUTES];
    STATE.events = [...SEED_EVENTS];
    STATE.posts = [...SEED_POSTS];
    STATE.badges = [...SEED_BADGES];
    STATE.challenges = [...SEED_CHALLENGES];
    STATE.userChallenges = [];
    STATE.userBadges = [];
    STATE.chatChannels = [...SEED_CHANNELS];
    STATE.chatMessages = [...SEED_MESSAGES];
    STATE.notifications = [];
    STATE.attendance = [];
    STATE.comments = [];
    STATE.follows = [];
    STATE._deletedIds = [];
    STATE._deletedRouteIds = [];
    STATE._deletedUsers = [];
  }

  // ── Phase 2: Show UI immediately — this MUST run so splash always hides ──
  const splashEl = document.getElementById('splash');
  if (splashEl) splashEl.style.display = 'none';

  if (STATE.user) {
    const topbarEl = document.getElementById('topbar');
    const bottomnavEl = document.getElementById('bottomnav');
    if (topbarEl) topbarEl.style.display = 'flex';
    if (bottomnavEl) bottomnavEl.style.display = 'flex';
    navigate('inicio');
    startPresence();
    // Background ops — defer so UI renders first
    setTimeout(() => {
      _ec2Sync(); // load authoritative data from EC2
      initIndexedDB().then(() => recoverPendingPostMedia()).catch(() => {});
      loadPlaces();
      loadPanamaPOIs();
      if (HV.user && HV.pass) {
        syncPostsFromCloud();
        autoConnectHeyValue();
        // Preload current user's avatar from HeyValue (like Gram feed)
        loadAvatarFromHV(STATE.user.id).then(url => {
          if (url && !getAvatar()) {
            saveAvatar(url);
            applyAvatarToUI(url);
          }
        }).catch(() => {});
      }
      startRifaOverlayPoll(); // independiente de HeyValue — usa solo /api/rifa-live
      startBroadcastPoll();
      updateNotifBadge();
      startDmPoll();
      startSwKeepalive();
      requestNotificationPermission();
      autoActivateGPS();
      evaluateAllBadges();
      // Trae rutas nuevas (y otros cambios) de EC2 cada 15s para que lleguen rápido a todos los dispositivos
      if (_routeSyncInterval) clearInterval(_routeSyncInterval);
      _routeSyncInterval = setInterval(_ec2Sync, 15000);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').then(reg => {
          // Re-programar recordatorios de rutas tras registrar el SW
          navigator.serviceWorker.ready.then(() => setTimeout(reRegisterRouteReminders, 1000));
        }).catch(() => {});
      }
    }, 50);
  } else {
    showLogin();
    STATE.navStack = [];
    renderBreadcrumb();
    setTimeout(() => {
      initIndexedDB().catch(() => {});
      loadPlaces();
      loadPanamaPOIs();
      if (HV.user && HV.pass) autoConnectHeyValue();
      evaluateAllBadges();
      if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
    }, 50);
  }
}

// Handle location updates from background SW sync
function handleBackgroundLocation(lat, lng) {
  if (!STATE.user || _activeRouteId === null) return;
  STATE.userLocation = { lat, lng, updated_at: Date.now() };
  checkAttendanceForActiveRoutes();
}

// Auto-confirm attendance for the currently active route only
function checkAttendanceForActiveRoutes() {
  if (!_activeRouteId || !STATE.userLocation) return;
  const route = STATE.routes.find(r => r.id === _activeRouteId);
  if (!route || !route.start_lat || !route.start_lng) return;

  // Check geofence on start point (300m)
  const distStart = haversineM(STATE.userLocation.lat, STATE.userLocation.lng, parseFloat(route.start_lat), parseFloat(route.start_lng));
  if (distStart <= 300) confirmAttendance(route.id, 'auto', false);

  // Check geofence on destination
  if (route.end_lat && route.end_lng) {
    const distEnd = haversineM(STATE.userLocation.lat, STATE.userLocation.lng, parseFloat(route.end_lat), parseFloat(route.end_lng));
    if (distEnd <= 300) confirmAttendance(route.id, 'auto', true);
  }
}

function haversineM(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2-lat1)*Math.PI/180;
  const dLng = (lng2-lng1)*Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function confirmAttendance(routeId, method, isArrival) {
  STATE.attendance = STATE.attendance || [];
  const existing = STATE.attendance.find(a => a.route_id === routeId && a.user_id === STATE.user.id && !!a.is_arrival === !!isArrival);
  if (existing) return; // already confirmed
  STATE.attendance.push({
    id: Date.now() % 100000,
    user_id: STATE.user.id,
    route_id: routeId,
    confirmed_at: new Date().toISOString(),
    method: method || 'manual',
    is_arrival: isArrival || false,
    lat: STATE.userLocation?.lat || null,
    lng: STATE.userLocation?.lng || null
  });
  ls('bs_att', STATE.attendance);
  saveToHV('attendance', STATE.attendance).catch(() => {});
  if (method === 'auto') toast('✅ Asistencia confirmada automaticamente');
}

// Manual check-in: "Estoy aquí" — verifica GPS antes de confirmar
function manualCheckin(routeId) {
  if (!STATE.user) { toast('Inicia sesion primero'); return; }
  if (!navigator.onLine) { toast('Sin conexion — intenta luego'); return; }

  const route = STATE.routes.find(r => r.id === routeId);
  if (!route) { toast('Ruta no encontrada'); return; }

  // Si la ruta no tiene coordenadas de destino, confirmar sin GPS
  if (!route.end_lat || !route.end_lng) {
    confirmAttendance(routeId, 'manual', false);
    renderRutas();
    toast('✅ Asistencia confirmada');
    return;
  }

  // Verificar ubicación GPS real
  if (!navigator.geolocation) {
    toast('⚠️ Tu dispositivo no soporta GPS — confirmando sin verificar ubicacion');
    confirmAttendance(routeId, 'manual', false);
    renderRutas();
    return;
  }

  // Mostrar estado de carga
  const btn = document.getElementById('fab-confirm-btn');
  if (btn) { btn.textContent = '📍 Verificando ubicacion...'; btn.disabled = true; }

  navigator.geolocation.getCurrentPosition(
    pos => {
      const dist = haversineM(
        pos.coords.latitude, pos.coords.longitude,
        parseFloat(route.end_lat), parseFloat(route.end_lng)
      );

      // Restaurar botón
      if (btn) { btn.textContent = '📍 Estoy aquí — Confirmar asistencia'; btn.disabled = false; }

      if (dist <= 300) {
        confirmAttendance(routeId, 'manual', false);
        renderRutas();
        toast('✅ Asistencia confirmada — estas en el punto de encuentro');
      } else if (dist <= 1000) {
        toast('⚠️ Estas a ' + Math.round(dist) + ' metros del destino. Acercate mas para confirmar.');
      } else {
        toast('❌ Estas demasiado lejos (' + Math.round(dist/1000) + ' km). Debes estar en el lugar para confirmar asistencia.');
      }
    },
    err => {
      // Restaurar botón
      if (btn) { btn.textContent = '📍 Estoy aquí — Confirmar asistencia'; btn.disabled = false; }

      if (err.code === 1) {
        toast('⚠️ Permiso de ubicacion denegado. Activa el GPS en tu dispositivo.');
      } else if (err.code === 2) {
        toast('⚠️ No se pudo obtener tu ubicacion. Verifica la señal GPS.');
      } else {
        toast('⚠️ Error al obtener ubicacion. Intenta de nuevo.');
      }
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
  );
}

// Refresh the attendance panel DOM element directly
function renderRutas() {
  const panel = document.getElementById('attendance-panel-' + routeId);
  const btnWrap = document.getElementById('manual-checkin-' + routeId);
  if (!panel && !btnWrap) return;
  const att = STATE.attendance || [];
  const confirmed = att.filter(a => a.route_id === routeId);
  const confirmedUsers = confirmed.map(a => STATE.users.find(u => u.id === a.user_id)).filter(Boolean);
  const totalMembers = 1;
  const pendingCount = 0;
  let html = '';
  if (confirmedUsers.length === 0) {
    html = `<div style="text-align:center;padding:16px;color:var(--text2);font-size:12px">Nadie ha confirmado asistencia aun</div>`;
  } else {
    html = confirmedUsers.map(u => `
      <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
        <div style="width:28px;height:28px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;flex-shrink:0">${(u.username||'?').charAt(0).toUpperCase()}</div>
        <div style="flex:1">
          <div style="font-size:13px;font-weight:600">${escHtml(u.username)}${u.id === STATE.user?.id ? ' (tu)' : ''}</div>
          <div style="font-size:10px;color:var(--text3)">${confirmed.find(a=>a.user_id===u.id)?.note || 'Confirmado'}</div>
        </div>
        <span style="font-size:10px;padding:2px 8px;background:rgba(34,197,94,0.15);border:1px solid rgba(34,197,94,0.4);border-radius:10px;color:#22c55e;font-weight:700">✅</span>
      </div>`).join('');
  }
  if (panel) panel.innerHTML = html;
  if (btnWrap) {
    btnWrap.innerHTML = `<div style="margin-top:8px;padding:8px 12px;background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.25);border-radius:10px;text-align:center;font-size:12px;color:#22c55e;font-weight:600">✅ Ya confirmaste tu asistencia</div>`;
  }
}

// ── Live Location System ──────────────────────────────────────────────────────
// GPS OFF by default. Activates when:
//   a) AUTO: route date==today AND time <= now <= time+2h
//   b) MANUAL: user taps "Activar GPS" on a route
// Saves to HeyValue every 30s. Members polled every 15s when active.

var _geoWatchId = null;
var _saveInterval = null;
var _pollInterval = null;
var _checkInterval = null;
var _activeRouteId = null;    // route being tracked right now
var _routeSyncInterval = null; // polling que trae rutas nuevas de EC2 a todos los dispositivos
var _activeWindowStart = null; // minutes-of-day when activation started
var _lastLocationSave = 0;


// FAB menu toggle
function toggleFabMenu() {
  const menu = document.getElementById('rutas-fab-menu');
  if (!menu) return;
  menu.classList.toggle('open');
}

// FAB click-outside handler
document.addEventListener('click', function(e) {
  const fab = document.getElementById('rutas-fab');
  if (!fab) return;
  const menu = document.getElementById('rutas-fab-menu');
  if (menu && menu.classList.contains('open') && !fab.contains(e.target)) {
    menu.classList.remove('open');
  }
});

// Update FAB button color based on GPS state
function updateFabState() {
  const btn = document.getElementById('rutas-fab-btn');
  const fab = document.getElementById('rutas-fab');
  const gpsBadge = document.getElementById('fab-gps-coords');
  if (!btn) return;
  if (_activeRouteId !== null) {
    btn.style.background = 'linear-gradient(135deg,#22c55e,#16a34a)';
    btn.style.boxShadow = '0 4px 20px rgba(34,197,94,0.4)';
    btn.textContent = '🟢';
  } else {
    btn.style.background = 'linear-gradient(135deg,#ff4444,#ff8800)';
    btn.style.boxShadow = '0 4px 20px rgba(255,68,68,0.35)';
    btn.textContent = '📍';
  }
}

function startGPS(routeId) {
  // If already tracking this route, do nothing
  if (_geoWatchId !== null && _activeRouteId === routeId) return;

  const route = STATE.routes.find(r => r.id === routeId);
  if (!route) return;

  stopGPS(); // clean up any existing tracking

  _activeRouteId = routeId;
  updateFabState();
  renderRutas();
  _activeWindowStart = new Date().getHours() * 60 + new Date().getMinutes();

  toast('📍 GPS activado — ' + route.name);

  if (!navigator.geolocation) { toast('GPS no disponible'); return; }

  // Watch position
  _geoWatchId = navigator.geolocation.watchPosition(
    pos => {
      STATE.userLocation = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        updated_at: Date.now()
      };
      saveLocationToHV();
      checkAttendanceForActiveRoutes();
    },
    err => { console.warn('[BS] GPS:', err.message); },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
  );

  // Save every 30s, poll members every 15s
  _saveInterval = setInterval(saveLocationToHV, 30000);
  _pollInterval = setInterval(loadMembersLocation, 15000);

  // Check every 30s if the 2h window expired
  _checkInterval = setInterval(checkGPSWindow, 30000);

  // Immediate first run
  saveLocationToHV();
  loadMembersLocation();
}

function stopGPS() {
  if (_geoWatchId !== null) { navigator.geolocation.clearWatch(_geoWatchId); _geoWatchId = null; }
  if (_saveInterval) { clearInterval(_saveInterval); _saveInterval = null; }
  if (_pollInterval) { clearInterval(_pollInterval); _pollInterval = null; }
  if (_checkInterval) { clearInterval(_checkInterval); _checkInterval = null; }
  if (_activeRouteId !== null) {
    toast('GPS desactivado — ' + (STATE.routes.find(r => r.id === _activeRouteId)?.name || 'ruta'));
    _activeRouteId = null;
    _activeWindowStart = null;
  }
  // Re-render rutas so the GPS panel reflects the change
  try { renderRutas(); } catch(e) {}
}

// ── Live Map Modal ──────────────────────────────────────────────────────
var _liveMapInterval = null;

function showLiveMap(routeId) {
  const route = STATE.routes.find(r => r.id === routeId);
  if (!route) return;

  // Force-load members now
  loadMembersLocation();

  const content = `
    <div style="margin-bottom:12px;display:flex;align-items:center;gap:8px">
      <div style="font-size:20px">🗺️</div>
      <div>
        <div style="font-size:14px;font-weight:800">${escHtml(route.name)}</div>
        <div style="font-size:11px;color:var(--text2)">Ubicacion en tiempo real</div>
      </div>
      <div id="live-gps-indicator" style="margin-left:auto;display:flex;align-items:center;gap:6px">
        <div style="width:8px;height:8px;border-radius:50%;background:#888"></div>
        <span style="font-size:11px;color:var(--text2)">Sin GPS</span>
      </div>
    </div>
    <div id="live-map" style="height:320px;border-radius:12px;overflow:hidden;border:1px solid var(--border);margin-bottom:12px"></div>
    <div id="live-attendance-list" style="max-height:200px;overflow-y:auto">
      <div style="text-align:center;padding:20px;color:var(--text2);font-size:12px">Cargando...</div>
    </div>
  `;

  openModal('Mapa en Vivo', content);

  setTimeout(() => initLiveMap(route), 100);
}

function initLiveMap(route) {
  if (!window.L) return;

  const mapEl = document.getElementById('live-map');
  if (!mapEl) return;

  // Center on route start
  const centerLat = parseFloat(route.start_lat) || 8.9824;
  const centerLng = parseFloat(route.start_lng) || -79.5199;

  const map = L.map('live-map', { zoomControl: true }).setView([centerLat, centerLng], 14);

  _mapTile().addTo(map);

  // Route start marker
  if (route.start_lat && route.start_lng) {
    L.marker([route.start_lat, route.start_lng], {
      icon: L.divIcon({ html: '🟢', className: '', iconSize: [30, 30], iconAnchor: [15, 15] })
    }).addTo(map).bindPopup('Salida: ' + (route.start_name || 'Punto de salida'));
  }

  // Route end marker
  if (route.end_lat && route.end_lng) {
    L.marker([route.end_lat, route.end_lng], {
      icon: L.divIcon({ html: '🔴', className: '', iconSize: [30, 30], iconAnchor: [15, 15] })
    }).addTo(map).bindPopup('Destino: ' + (route.end_name || 'Destino'));
  }

  // Geofence circle (300m)
  if (route.start_lat && route.start_lng) {
    L.circle([route.start_lat, route.start_lng], {
      radius: 300,
      color: '#22c55e',
      fillColor: '#22c55e',
      fillOpacity: 0.08,
      weight: 1.5
    }).addTo(map);
  }

  // User's own marker
  let userMarker = null;
  function updateMyMarker() {
    if (!STATE.userLocation) return;
    const pos = [STATE.userLocation.lat, STATE.userLocation.lng];
    if (!userMarker) {
      userMarker = L.circleMarker(pos, {
        radius: 8, color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 1, weight: 2
      }).addTo(map).bindPopup('Tu ubicacion');
    } else {
      userMarker.setLatLng(pos);
    }
    // Update GPS indicator
    const ind = document.getElementById('live-gps-indicator');
    if (ind) ind.innerHTML = '<div style="width:8px;height:8px;border-radius:50%;background:#22c55e;box-shadow:0 0 6px #22c55e"></div><span style="font-size:11px;color:#22c55e">GPS activo</span>';
  }

  if (STATE.userLocation) updateMyMarker();

  // Members markers
  let memberMarkers = {};
  function updateMembers() {
    if (!STATE.membersLocation) return;
    const list = document.getElementById('live-attendance-list');
    let html = '<div style="padding:4px 0 8px;font-size:11px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Participantes</div>';

    Object.entries(STATE.membersLocation).forEach(([uid, loc]) => {
      const u = STATE.users.find(x => x.id === parseInt(uid));
      if (!u) return;

      // Update or create marker
      if (!memberMarkers[uid]) {
        memberMarkers[uid] = L.circleMarker([loc.lat, loc.lng], {
          radius: 7, color: '#ff8800', fillColor: '#ff8800', fillOpacity: 0.85, weight: 2
        }).addTo(map).bindPopup(u.username);
      } else {
        memberMarkers[uid].setLatLng([loc.lat, loc.lng]);
      }

      // Check if confirmed
      const confirmed = (STATE.attendance || []).find(a => a.user_id === parseInt(uid) && a.route_id === route.id);
      html += `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
        <div style="width:32px;height:32px;border-radius:50%;background:#ff8800;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#fff;flex-shrink:0">${(u.username||'?').charAt(0).toUpperCase()}</div>
        <div style="flex:1">
          <div style="font-size:13px;font-weight:600">${escHtml(u.username)}</div>
          <div style="font-size:10px;color:var(--text3)">${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}</div>
        </div>
        ${confirmed ? '<span style="font-size:11px;padding:2px 8px;background:rgba(34,197,94,0.15);border:1px solid rgba(34,197,94,0.4);border-radius:10px;color:#22c55e;font-weight:700">✅ Confirmado</span>' : ''}
      </div>`;
    });

    // My own entry
    const myConfirmed = (STATE.attendance || []).find(a => a.user_id === STATE.user?.id && a.route_id === route.id);
    html += `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
      <div style="width:32px;height:32px;border-radius:50%;background:#3b82f6;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#fff;flex-shrink:0">${(STATE.user?.username||'?').charAt(0).toUpperCase()}</div>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:600">${escHtml(STATE.user?.username || 'Tu')} (tu)</div>
        <div style="font-size:10px;color:var(--text3)">${STATE.userLocation ? (STATE.userLocation.lat.toFixed(4)+', '+STATE.userLocation.lng.toFixed(4)) : 'Sin GPS'}</div>
      </div>
      ${myConfirmed ? '<span style="font-size:11px;padding:2px 8px;background:rgba(34,197,94,0.15);border:1px solid rgba(34,197,94,0.4);border-radius:10px;color:#22c55e;font-weight:700">✅ Confirmado</span>' : ''}
    </div>`;

    if (list) list.innerHTML = html;
  }

  updateMembers();

  // Refresh map + list every 15s while modal is open
  _liveMapInterval = setInterval(() => {
    if (!document.getElementById('live-map')) {
      clearInterval(_liveMapInterval);
      return;
    }
    loadMembersLocation().then(() => {
      if (STATE.userLocation) updateMyMarker();
      updateMembers();
    });
  }, 15000);
}

// Auto-check every 30s: is the 2h window still open?
function checkGPSWindow() {
  if (_activeRouteId === null) return;
  const route = STATE.routes.find(r => r.id === _activeRouteId);
  if (!route || !route.date || !route.time) { stopGPS(); return; }

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  if (route.date !== today) { stopGPS(); return; }

  const curMin = now.getHours() * 60 + now.getMinutes();
  const depMin = parseInt(route.time.slice(0,2))*60 + parseInt(route.time.slice(3,5));
  const windowEnd = depMin + 120; // +2 hours

  if (curMin > windowEnd) {
    toast('⏰ Tiempo de ruta terminado — GPS apagado');
    stopGPS();
  }
}

// Check on page load if a route should auto-activate
function autoActivateGPS() {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const curMin = now.getHours() * 60 + now.getMinutes();

  const route = STATE.routes.find(r => {
    if (!r.date || !r.time) return false;
    if (r.date !== today) return false;
    const depMin = parseInt(r.time.slice(0,2))*60 + parseInt(r.time.slice(3,5));
    const windowEnd = depMin + 120;
    return curMin >= depMin && curMin <= windowEnd;
  });

  if (route) startGPS(route.id);
}

async function saveLocationToHV() {
  if (!HV.user || !HV.pass || !STATE.user || !STATE.userLocation) return;
  const now = Date.now();
  if (now - _lastLocationSave < 30000) return;
  _lastLocationSave = now;
  try {
    await saveToHV('member_location_' + STATE.user.id, {
      lat: STATE.userLocation.lat,
      lng: STATE.userLocation.lng,
      accuracy: STATE.userLocation.accuracy,
      username: STATE.user.username,
      route_id: _activeRouteId,
      updated_at: now
    });
  } catch(e) {}
}

async function loadMembersLocation() {
  if (!HV.user || !HV.pass) return;
  STATE.membersLocation = STATE.membersLocation || {};
  for (const u of STATE.users) {
    if (u.id === STATE.user?.id) continue;
    try {
      const data = await loadFromHV('member_location_' + u.id);
      if (data && data.lat && data.lng) {
        // Only show members tracking the same active route (or no route = manual mode)
        if (_activeRouteId && data.route_id && data.route_id !== _activeRouteId) continue;
        if (Date.now() - (data.updated_at || 0) < 120000) { // 2 min max age
          STATE.membersLocation[u.id] = data;
        }
      }
    } catch(e) {}
  }
}

async function autoConnectHeyValue() {
  if (!HV.user || !HV.pass) return;
  try {
    // Ensure Gram folders exist
    await hvRequest('MKCOL', '/' + HV.gramFolder);
    await hvRequest('MKCOL', '/' + HV.gramFolder + '/photos');
    await hvRequest('MKCOL', '/' + HV.gramFolder + '/videos');
    await hvRequest('MKCOL', '/' + HV.gramFolder + '/audio');
    // Ensure profile photos folder
    await hvRequest('MKCOL', '/BikerApp');
    await hvRequest('MKCOL', '/BikerApp/profiles');
    HV.connected = true;
    STATE._cloudSynced = true; // allow cloud uploads ONLY after this flag is set
    // Sync data from cloud — cloud is the source of truth
    await syncFromCloud();
    saveLocal(); // save to localStorage only, don't re-upload
    healMyAvatar(); // si mi avatar local nunca llegó a la nube, súbelo ahora
    // Puntos ganados en el Ludo 3D (página aparte): súmalos al volver
    try {
      const wp = parseInt(localStorage.getItem('ludo_winpts') || '0', 10);
      if (wp > 0 && STATE.user) {
        const u = STATE.users.find(x => x.id === STATE.user.id);
        if (u) { u.points = (u.points || 0) + wp; STATE.user.points = u.points; }
        localStorage.removeItem('ludo_winpts'); saveState();
      }
    } catch (e) {}
    // Re-render current page with cloud data
    if (STATE.currentPage) renderPage(STATE.currentPage);
    // Refresco en vivo del feed: posts + comentarios, detectando me gusta y
    // reacciones (no solo posts nuevos), sin molestar a quien escribe o lee.
    if (STATE._refreshTimer) clearInterval(STATE._refreshTimer);
    STATE._refreshTimer = setInterval(liveFeedTick, 2500);
  } catch(e) {
    console.warn('HeyValue auto-connect failed:', e.message);
  }
}

// Only sync posts — fast, lightweight, used for BikerGram live refresh
async function syncPostsFromCloud() {
  if (!HV.user) return;
  const data = await loadFromHV('posts');
  if (data && Array.isArray(data)) {
    const deletedIds = STATE._deletedIds || [];
    // Filter out deleted posts from cloud data
    const filteredCloud = data.filter(item => !deletedIds.includes(item.id));
    const cloudMap = new Map(filteredCloud.map(item => [item.id, item]));
    // Find posts that exist locally but NOT in cloud — those were deleted by others
    const orphaned = (STATE.posts || []).filter(item => !cloudMap.has(item.id) && !deletedIds.includes(item.id));
    // Clean up orphaned posts from IndexedDB
    if (DB && orphaned.length > 0) {
      for (const post of orphaned) {
        await idbDelete('posts', post.id);
      }
    }
    // Prefer local version if post not yet synced (has pending media upload)
    const merged = [];
    const seen = new Set();
    // Add all cloud posts
    for (const p of filteredCloud) { merged.push(p); seen.add(p.id); }
    // Add local-only posts (new posts not yet synced or unsynced)
    for (const p of (STATE.posts || [])) {
      if (!seen.has(p.id)) merged.push(p);
      else {
        // If local has media_url but cloud doesn't, keep local
        const cloudP = cloudMap.get(p.id);
        if (cloudP && !cloudP.media_url && p.media_url) {
          const idx = merged.findIndex(x => x.id === p.id);
          if (idx >= 0) merged[idx] = p;
        }
      }
    }
    STATE.posts = merged.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
  }
}

// Trae comentarios de la nube (lo que comentan otros) sin pisar los míos locales
// que aún no han subido. Permite que el contador y la lista se actualicen en vivo.
async function syncCommentsFromCloud() {
  if (!HV.user) return;
  const data = await loadFromHV('comments');
  if (data && Array.isArray(data)) {
    const cloudMap = new Map(data.map(c => [c.id, c]));
    const localOnly = (STATE.comments || []).filter(c => !cloudMap.has(c.id));
    STATE.comments = [...data, ...localOnly];
  }
}

// "Firma" ligera del feed: cambia si hay un post nuevo, un me gusta, una
// reacción o un comentario. Así el refresco detecta cambios reales, no solo
// posts nuevos (antes un me gusta de otro no se veía hasta recargar).
function bikergramSignature() {
  const posts = STATE.posts || [];
  const cByPost = {};
  (STATE.comments || []).forEach(c => { cByPost[c.post_id] = (cByPost[c.post_id] || 0) + 1; });
  return posts.map(p => {
    const rx = Object.values(p.reactions || {}).reduce((a, b) => a + b, 0);
    return p.id + ':' + (p.likes || []).length + ':' + rx + ':' + (cByPost[p.id] || 0);
  }).join('|') + '#' + posts.length;
}

// ¿El usuario está escribiendo un comentario? Si es así, NO re-renderizamos
// (le borraríamos el texto). Los comentarios ahora se ven siempre (estilo
// Instagram), así que tener la sección visible ya no cuenta como "ocupado".
function feedHasOpenInteraction() {
  const ae = document.activeElement;
  if (ae && ae.id && (ae.id.indexOf('cmt-') === 0 || ae.id.indexOf('comment-input-') === 0)) return true;
  const inputs = document.querySelectorAll('[id^="cmt-"], [id^="comment-input-"]');
  for (const i of inputs) { if (i.value && i.value.trim()) return true; }
  return false;
}

// Globo flotante estilo Instagram: "⬆️ N nuevas publicaciones". Al tocarlo,
// sube al inicio y refresca. Nunca interrumpe lo que el usuario esté haciendo.
function showNewPostsPill(n) {
  let pill = document.getElementById('new-posts-pill');
  if (!pill) {
    pill = document.createElement('div');
    pill.id = 'new-posts-pill';
    pill.onclick = function() {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      renderBikerGram();
      removeNewPostsPill();
    };
    document.body.appendChild(pill);
  }
  pill.style.cssText = 'position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:9999;background:linear-gradient(135deg,#ff4444,#ff8800);color:#fff;padding:8px 18px;border-radius:20px;font-size:13px;font-weight:800;cursor:pointer;box-shadow:0 6px 20px rgba(255,68,68,0.5);animation:fadeUp 0.3s ease;white-space:nowrap';
  pill.textContent = '⬆️ ' + n + (n === 1 ? ' nueva publicación' : ' nuevas publicaciones');
}

function removeNewPostsPill() {
  const pill = document.getElementById('new-posts-pill');
  if (pill) pill.remove();
}

// Un ciclo del refresco en vivo (cada 2.5s). Guarda anti-solapamiento: si una
// descarga aún no termina (la nube tarda ~2.5s), no se encima otra.
async function liveFeedTick() {
  if (STATE.currentPage !== 'bikergram') { removeNewPostsPill(); return; }
  if (STATE._polling) return;
  STATE._polling = true;
  try {
    const prevCount = STATE.posts.length;
    const prevSig = bikergramSignature();
    await syncPostsFromCloud();
    await syncCommentsFromCloud();
    const newCount = STATE.posts.length;
    if (bikergramSignature() === prevSig) return; // nada cambió de verdad

    const gotNewPosts = newCount > prevCount;
    const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
    const busy = feedHasOpenInteraction();

    if (gotNewPosts && (scrollY > 200 || busy)) {
      // Hay posts nuevos pero el usuario está abajo o ocupado: avisar sin saltar
      showNewPostsPill(newCount - (STATE._feedRenderedCount || prevCount));
    } else if (busy) {
      // Solo cambiaron me gusta/comentarios y está escribiendo: esperar al próximo ciclo
    } else {
      // Seguro re-renderizar: arriba del feed, o solo cambios de me gusta/comentarios
      renderBikerGram();
    }
  } catch (e) {
    /* silencioso: reintenta en el próximo ciclo */
  } finally {
    STATE._polling = false;
  }
}

// Al volver la app a primer plano —abrir desde una notificación, cambiar de
// pestaña, desbloquear el teléfono— trae datos frescos de la nube para ver al
// instante los posts/mensajes nuevos, sin esperar el ciclo de 2.5s.
let _lastResumeSync = 0;
let _loginTs = 0; // timestamp of last login — blocks resumeSync re-render briefly
async function resumeSync() {
  if (!HV.user || document.hidden) return;
  const now = Date.now();
  if (now - _lastResumeSync < 1500) return; // anti-rebote
  _lastResumeSync = now;
  try {
    await syncFromCloud(true);
    // Don't re-render immediately after login (within 6s) — avoids visible double refresh
    if (now - _loginTs < 6000) return;
    if (STATE.currentPage === 'bikergram') renderBikerGram();
    else if (STATE.currentPage && STATE.currentPage !== 'juegos' && typeof renderPage === 'function') renderPage(STATE.currentPage);
  } catch (e) { /* reintenta en el próximo foco */ }
}
document.addEventListener('visibilitychange', resumeSync);
window.addEventListener('focus', resumeSync);

async function _ec2Push() {
  try {
    const r = await fetch('/api/db', {method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({routes: STATE.routes, users: STATE.users, payList: STATE.payList || {}})});
    return r.ok;
  } catch(e) { return false; }
}

async function _ec2Sync() {
  try {
    const r = await fetch('/api/db');
    if (!r.ok) { _ec2Push(); return; }
    const db = await r.json();
    let changed = false;
    let needPush = false;

    // ── Routes: MERGE (never replace) so routes created on other devices/tabs survive ──
    if (Array.isArray(db.routes) && db.routes.length > 0) {
      const deletedRouteIds = new Set(STATE._deletedRouteIds || []);
      const ec2Routes = db.routes.filter(r => !deletedRouteIds.has(r.id));
      const ec2Map = new Map(ec2Routes.map(r => [r.id, r]));
      // Local-only routes (created here but not yet pushed/visible on EC2)
      const localOnly = (STATE.routes || []).filter(r => !ec2Map.has(r.id) && !deletedRouteIds.has(r.id));
      STATE.routes = [...ec2Routes, ...localOnly];
      ls('bs_routes', STATE.routes);
      if (localOnly.length > 0) needPush = true; // persist merged set back to EC2
      changed = true;
    } else {
      needPush = true; // EC2 empty — migrate local data up
    }

    // ── Users: MERGE (never replace) so new local accounts survive ─────────
    if (Array.isArray(db.users) && db.users.length > 0) {
      const ec2Map = new Map(db.users.map(u => [u.id, u]));
      // Local-only users (registered but not yet pushed to EC2)
      const localOnly = (STATE.users || []).filter(u => !ec2Map.has(u.id));
      // Merged list: EC2 base + local-only additions
      STATE.users = [...db.users, ...localOnly];
      // Re-apply live session user on top (avatar, bio changes etc.)
      // but never let an empty local value wipe a photo that EC2 already has
      if (STATE.user) {
        const idx = STATE.users.findIndex(u => u.id === STATE.user.id);
        if (idx >= 0) {
          const ec2u = STATE.users[idx];
          const merged = {...ec2u, ...STATE.user};
          if (!STATE.user.profile_pic && ec2u.profile_pic) merged.profile_pic = ec2u.profile_pic;
          if (!STATE.user.avatar    && ec2u.avatar)       merged.avatar       = ec2u.avatar;
          STATE.users[idx] = merged;
        } else STATE.users.push(STATE.user);
        STATE.user = STATE.users.find(u => u.id === STATE.user.id) || STATE.user;
      }
      if (localOnly.length > 0) needPush = true; // persist merged set
      ls('bs_users', STATE.users);
      changed = true;
    } else {
      needPush = true;
    }

    // ── PayList: merge by route id ─────────────────────────────────────────
    if (db.payList && typeof db.payList === 'object') {
      if (!STATE.payList) STATE.payList = ls('bs_paylist') || {};
      // EC2 wins per-route, keep local routes not in EC2
      for (const [rid, entries] of Object.entries(db.payList)) {
        if (Array.isArray(entries) && entries.length > 0) STATE.payList[rid] = entries;
      }
      ls('bs_paylist', STATE.payList);
    }

    if (needPush) _ec2Push();

    if (changed) {
      const activeId = document.querySelector('.page.active')?.id;
      if (activeId === 'page-rutas') renderRutas();
      else if (activeId === 'page-inicio') renderInicio();
      // page-mapas: never re-render from sync — it would destroy the live map
    }
  } catch(e) {}
}

async function saveState() {
  saveLocal();
  _ec2Push();
  // Only sync to cloud if all posts with media are fully synced (media uploaded to HeyValue)
  if (HV.connected && STATE._cloudSynced !== false) {
    // Siempre sincroniza: cloudSafePosts() ya evita subir media local pesada.
    // (Antes un post viejo con synced!=true dejaba allSynced en falso para
    // siempre y NINGÚN post nuevo llegaba a la nube.)
    await syncToCloud();
  }
}

// Save to localStorage only (no cloud sync)
function saveLocal() {
  ls('bs_users', STATE.users);
  ls('bs_routes', STATE.routes);
  ls('bs_events', STATE.events);
  // Strip large embedded data:/blob: media from posts before saving to localStorage —
  // big base64 photos/videos can blow the ~5MB quota and silently fail to save,
  // which makes the whole post (and any newer ones) disappear after reload.
  // The full post (with media) stays safe in IndexedDB and gets restored on next load.
  ls('bs_posts', (STATE.posts || []).map(p => {
    const url = p.media_url || p.image_url;
    if (url && (url.startsWith('data:') || url.startsWith('blob:')) && url.length > 5000) {
      const { media_url, image_url, ...rest } = p;
      return { ...rest, _pendingMedia: true };
    }
    return p;
  }));
  ls('bs_badges', STATE.badges);
  ls('bs_challenges', STATE.challenges);
  ls('bs_uc', STATE.userChallenges);
  ls('bs_ub', STATE.userBadges);
  ls('bs_cc', STATE.chatChannels);
  ls('bs_cm', STATE.chatMessages);
  ls('bs_notif', STATE.notifications);
  ls('bs_att', STATE.attendance);
  ls('bs_places', STATE.places);
  ls('bs_comments', STATE.comments || []);
  ls('bs_follows', STATE.follows || []);
}


// ============================================================
// RIFA OVERLAY — notificación flotante en cualquier página
// ============================================================
let _rifaOverlayTs = 0;
let _rifaOverlayPoll = null;
let _rifaOverlayDismiss = null;

function startRifaOverlayPoll() {
  if (_rifaOverlayPoll) clearInterval(_rifaOverlayPoll);
  _rifaOverlayPoll = setInterval(checkRifaOverlay, 2000);
  checkRifaOverlay();
}

async function checkRifaOverlay() {
  if (!STATE.user) return;
  try {
    const r = await fetch('/api/rifa-live', { cache: 'no-store' });
    if (!r.ok) return;
    const data = await r.json();
    if (!data || !data.active || Date.now() - data.ts > 20 * 60 * 1000) {
      hideRifaOverlay();
      return;
    }
    // Only show overlay for result/champion
    if (data.state !== 'result' && data.state !== 'champion') return;
    if (data.ts === _rifaOverlayTs) return; // same event already shown
    _rifaOverlayTs = data.ts;
    showRifaOverlay(data);
  } catch(e) {}
}

function showRifaOverlay(data) {
  let el = document.getElementById('rifa-overlay');
  if (!el) {
    el = document.createElement('div');
    el.id = 'rifa-overlay';
    el.style.cssText = 'position:fixed;top:60px;left:12px;right:12px;z-index:9990;pointer-events:auto;max-width:440px;margin:0 auto;';
    document.body.appendChild(el);
  }

  const isChamp = data.state === 'champion';
  const isElim  = data.type === 'eliminated';
  const color   = isChamp ? '#ffd700' : isElim ? '#ef4444' : '#22c55e';
  const glow    = isChamp ? 'rgba(255,215,0,0.35)' : isElim ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)';
  const icon    = isChamp ? '🏆' : isElim ? '💀' : '🎉';
  const label   = isChamp ? '¡CAMPEÓN ABSOLUTO!' : isElim ? 'ELIMINADO/A' : '¡GANADOR/A!';
  const sub     = isChamp
    ? (data.eliminated && data.eliminated.length ? 'Eliminados: ' + data.eliminated.join(', ') : '¡Último en pie!')
    : isElim && data.remaining !== undefined
    ? `Quedan ${data.remaining} participantes`
    : '🎡 Rifa en vivo';

  if (_rifaOverlayDismiss) clearTimeout(_rifaOverlayDismiss);

  el.innerHTML = `
    <div onclick="hideRifaOverlay()" style="
      background:rgba(14,14,20,0.88);
      backdrop-filter:blur(16px);
      -webkit-backdrop-filter:blur(16px);
      border:1.5px solid ${color};
      border-radius:18px;
      padding:14px 16px;
      box-shadow:0 0 28px ${glow},0 8px 40px rgba(0,0,0,0.55);
      animation:rifaOverlayIn .35s cubic-bezier(.34,1.56,.64,1);
      cursor:pointer;
      display:flex;align-items:center;gap:14px;
    ">
      <div style="font-size:40px;flex-shrink:0;line-height:1">${icon}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:9px;font-weight:800;color:${color};letter-spacing:1.2px;margin-bottom:2px;animation:rifaDrumFlash 1.4s ease-in-out infinite">● RIFA EN VIVO</div>
        <div style="font-size:10px;font-weight:700;color:${color};letter-spacing:.8px;margin-bottom:3px">${label}</div>
        <div style="font-size:20px;font-weight:900;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;animation:rifaWinPop .4s cubic-bezier(.34,1.56,.64,1)">${escHtml(data.name || '')}</div>
        <div style="font-size:10px;color:rgba(255,255,255,0.5);margin-top:2px">${escHtml(sub)} · toca para cerrar</div>
      </div>
    </div>
  `;

  // Auto-dismiss after 8 seconds
  _rifaOverlayDismiss = setTimeout(hideRifaOverlay, 8000);
}

function hideRifaOverlay() {
  const el = document.getElementById('rifa-overlay');
  if (el) el.innerHTML = '';
  if (_rifaOverlayDismiss) { clearTimeout(_rifaOverlayDismiss); _rifaOverlayDismiss = null; }
}

// ============================================================
// BROADCAST OVERLAY — admin messages floating on any page
// ============================================================
let _broadcastTs = 0;
let _broadcastPoll = null;
let _broadcastDismiss = null;

function startBroadcastPoll() {
  if (_broadcastPoll) clearInterval(_broadcastPoll);
  _broadcastPoll = setInterval(checkBroadcast, 3000);
  checkBroadcast();
}

async function checkBroadcast() {
  if (!STATE.user) return;
  try {
    const r = await fetch('/api/broadcast', { cache: 'no-store' });
    if (!r.ok) return;
    const data = await r.json();
    if (!data || !data.active) { hideBroadcastOverlay(); return; }
    if (Date.now() - data.ts > 60 * 60 * 1000) { hideBroadcastOverlay(); return; }
    if (data.ts === _broadcastTs) return;
    _broadcastTs = data.ts;
    showBroadcastOverlay(data);
  } catch(e) {}
}

function showBroadcastOverlay(data) {
  let el = document.getElementById('broadcast-overlay');
  if (!el) {
    el = document.createElement('div');
    el.id = 'broadcast-overlay';
    el.style.cssText = 'position:fixed;bottom:88px;left:12px;right:12px;z-index:9991;pointer-events:auto;max-width:440px;margin:0 auto;';
    document.body.appendChild(el);
  }
  if (_broadcastDismiss) clearTimeout(_broadcastDismiss);

  el.innerHTML = `
    <div style="
      background:rgba(10,10,28,0.92);
      backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);
      border:1.5px solid #3b82f6;
      border-radius:20px;
      padding:14px 16px;
      box-shadow:0 0 30px rgba(59,130,246,0.35),0 8px 40px rgba(0,0,0,0.6);
      animation:broadcastIn .4s cubic-bezier(.34,1.56,.64,1);
      display:flex;align-items:flex-start;gap:12px;
    ">
      <div style="font-size:34px;flex-shrink:0;line-height:1;margin-top:2px">📢</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:9px;font-weight:800;color:#3b82f6;letter-spacing:1.2px;margin-bottom:3px">● MENSAJE DEL ADMIN</div>
        <div style="font-size:14px;font-weight:700;color:#fff;line-height:1.4;margin-bottom:6px">${escHtml(data.text || '')}</div>
        <div style="display:flex;gap:8px;align-items:center">
          <button onclick="navigate('dm')" style="background:linear-gradient(135deg,#3b82f6,#6366f1);color:#fff;border:none;border-radius:10px;padding:6px 14px;font-size:12px;font-weight:700;cursor:pointer">💬 Responder</button>
          <button onclick="hideBroadcastOverlay()" style="background:transparent;border:1px solid rgba(255,255,255,0.2);color:rgba(255,255,255,0.5);border-radius:10px;padding:6px 10px;font-size:12px;cursor:pointer">Cerrar</button>
        </div>
      </div>
    </div>
  `;
  _broadcastDismiss = setTimeout(hideBroadcastOverlay, 12000);
}

function hideBroadcastOverlay() {
  const el = document.getElementById('broadcast-overlay');
  if (el) el.innerHTML = '';
  if (_broadcastDismiss) { clearTimeout(_broadcastDismiss); _broadcastDismiss = null; }
}

// ============================================================
// DM UNREAD BADGE POLL
// ============================================================
let _dmPoll = null;

function startDmPoll() {
  if (_dmPoll) clearInterval(_dmPoll);
  _dmPoll = setInterval(checkDmUnread, 5000);
  checkDmUnread();
}

async function checkDmUnread() {
  if (!STATE.user) return;
  try {
    const r = await fetch('/api/dm?userId=' + encodeURIComponent(STATE.user.id), { cache: 'no-store' });
    if (!r.ok) return;
    const data = await r.json();
    const unread = (data.messages || []).filter(m => m.from_admin && !m.read).length;
    const badge = document.getElementById('dm-unread-badge');
    if (badge) {
      if (unread > 0) {
        badge.textContent = unread > 9 ? '9+' : unread;
        badge.style.display = 'block';
      } else {
        badge.style.display = 'none';
      }
    }
  } catch(e) {}
}

// ============================================================
// PUSH NOTIFICATIONS SUBSCRIPTION
// ============================================================
async function registerPushSubscription() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const keyRes = await fetch('/api/push/vapid-key');
    if (!keyRes.ok) return;
    const { key } = await keyRes.json();
    if (!key) return;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key)
    });
    const j = sub.toJSON();
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: j.endpoint,
        p256dh:   j.keys?.p256dh || '',
        auth:     j.keys?.auth   || '',
        user_id:  STATE.user?.id || ''
      })
    });
  } catch(e) {}
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const b64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

// ============================================================
// NOTIFICATION PERMISSION PROMPT (custom card → native)
// ============================================================
function requestNotificationPermission() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') { registerPushSubscription(); return; }
  if (Notification.permission === 'denied') return;
  if (localStorage.getItem('bs_notif_asked')) return;

  // Show custom permission card after short delay
  setTimeout(() => {
    let card = document.getElementById('notif-permission-card');
    if (card) return;
    card = document.createElement('div');
    card.id = 'notif-permission-card';
    card.style.cssText = 'position:fixed;bottom:88px;left:12px;right:12px;z-index:9995;max-width:440px;margin:0 auto;animation:broadcastIn .4s cubic-bezier(.34,1.56,.64,1)';
    card.innerHTML = `
      <div style="background:rgba(10,10,28,0.96);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);border:1.5px solid rgba(59,130,246,0.6);border-radius:20px;padding:16px;box-shadow:0 0 28px rgba(59,130,246,0.3),0 8px 40px rgba(0,0,0,0.6)">
        <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:12px">
          <div style="font-size:32px;line-height:1;margin-top:2px">🔔</div>
          <div>
            <div style="font-size:14px;font-weight:800;color:#fff;margin-bottom:4px">¿Activar notificaciones?</div>
            <div style="font-size:12px;color:rgba(255,255,255,0.6);line-height:1.4">Recibe mensajes del admin y avisos de la rifa aunque la app esté cerrada.</div>
          </div>
        </div>
        <div style="display:flex;gap:8px">
          <button onclick="approveNotifications()" style="flex:1;background:linear-gradient(135deg,#3b82f6,#6366f1);color:#fff;border:none;border-radius:12px;padding:10px;font-size:13px;font-weight:700;cursor:pointer">✅ Sí, activar</button>
          <button onclick="dismissNotifCard()" style="flex:1;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);color:rgba(255,255,255,0.5);border-radius:12px;padding:10px;font-size:13px;cursor:pointer">Ahora no</button>
        </div>
      </div>
    `;
    document.body.appendChild(card);
  }, 2500);
}

function approveNotifications() {
  dismissNotifCard();
  localStorage.setItem('bs_notif_asked', '1');
  Notification.requestPermission().then(perm => {
    if (perm === 'granted') { registerPushSubscription(); toast('¡Notificaciones activadas!'); }
  });
}

function dismissNotifCard() {
  const card = document.getElementById('notif-permission-card');
  if (card) card.remove();
  localStorage.setItem('bs_notif_asked', '1');
}

// ============================================================
// SERVICE WORKER KEEPALIVE (ping every 25s)
// ============================================================
function startSwKeepalive() {
  if (!('serviceWorker' in navigator)) return;
  setInterval(() => {
    navigator.serviceWorker.ready.then(reg => {
      if (reg.active) reg.active.postMessage({ type: 'KEEPALIVE' });
    }).catch(() => {});
  }, 25000);
}
