// ============================================================
// RUTAS PAGE
// ============================================================
let RUTAS_TAB = 'rutas';

function renderRutas() {
  const sel = STATE.selectedRoute;
  const myRoutes = STATE.routes.filter(r => r.created_by === STATE.user?.id);
  const allRoutes = STATE.routes;
  const isOwner = sel && sel.created_by === STATE.user?.id;
  const creator = sel ? STATE.users.find(u => u.id === sel.created_by) : null;

  let stopsHtml = '';
  if (sel) {
    try {
      const ss = JSON.parse(sel.stops || '[]');
      if (ss.length) {
        stopsHtml = '<div style="margin-bottom:12px"><div style="font-size:11px;font-weight:700;color:var(--text2);margin-bottom:6px">PARADAS</div>' +
          ss.map((s,i) => `<div style="display:flex;align-items:center;gap:8px;padding:8px;background:var(--surface2);border-radius:8px;margin-bottom:4px">
            <span style="background:#ff8800;color:#fff;font-size:9px;font-weight:700;padding:2px 6px;border-radius:10px">P${i+1}</span>
            <span style="font-size:12px;font-weight:600">${s.name}</span>
            <span style="font-size:10px;color:var(--text3);margin-left:auto">${parseFloat(s.lat).toFixed(4)}, ${parseFloat(s.lng).toFixed(4)}</span>
          </div>`).join('') + '</div>';
      }
    } catch(e) {}
  }

  // Prepare confirmed bikers list
  let confirmedBikers = '';
  if (sel) { (() => {
    const seen = new Set();
    const confirmed = [];
    (STATE.attendance || []).filter(a => a.route_id === sel.id && a.user_id !== STATE.user?.id).forEach(a => {
      if (!seen.has(a.user_id)) { seen.add(a.user_id); confirmed.push(a); }
    });
    if (confirmed.length > 0) {
      confirmedBikers = '<div style="margin-bottom:12px">' +
        '<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">' +
        '<span style="font-size:13px;font-weight:700;color:var(--text2)">👥 Bikers confirmados</span>' +
        '<span class="badge badge-green" style="font-size:10px;padding:2px 6px">' + confirmed.length + '</span>' +
        '</div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:8px">' +
        confirmed.map(a => {
          const u = STATE.users.find(u => u.id === a.user_id);
          if (!u) return '';
          let timeStr = '';
          try { const d = new Date(a.confirmed_at); timeStr = d.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'}); } catch(e) {}
          return '<div style="display:flex;align-items:center;gap:6px;background:var(--surface2);padding:6px 10px 6px 6px;border-radius:20px;border:1px solid var(--border)">' +
            renderAvatar(u, 28) +
            '<span style="font-size:11px;font-weight:600">' + escHtml(u.username) + '</span>' +
            (timeStr ? '<span style="font-size:9px;color:var(--text3);margin-left:2px">' + timeStr + '</span>' : '') +
          '</div>';
        }).join('') +
        '</div>';
    }
  })(); }

  document.getElementById('page-rutas').innerHTML = `
    <!-- Header (always visible) -->
    <div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;min-height:36px">
        <div style="display:flex;align-items:center;gap:8px">
          ${sel ? `<button class="back-neon" onclick="deselectRoute();return" style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:6px 12px;cursor:pointer;font-size:13px;font-weight:700;display:inline-flex;align-items:center;gap:6px"><span style="font-size:20px;line-height:1">←</span> Atrás</button>` : ''}
          ${sel ? `<div style="font-size:18px;font-weight:800">${escHtml(sel.name)}</div>` : ''}
        </div>
        ${!sel ? `
        ${STATE.user?.is_admin ? `<button class="btn btn-primary" style="padding:8px 16px;font-size:12px;margin-left:auto" onclick="createRoute()">+ Nueva ruta</button>` : ''}
        ` : ''}
      </div>
    </div>

    <!-- Route detail (above map when selected) -->
    ${sel ? `
    <div class="card vanish" style="margin-bottom:10px;border-color:rgba(255,59,59,0.4)">
      ${`
      <div style="font-size:13px;color:var(--text2);margin-bottom:10px">${escHtml(sel.description || 'Sin descripción')}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
        <div style="padding:10px;background:var(--surface2);border-radius:8px;border-left:3px solid #22c55e">
          <div style="font-size:9px;color:var(--text3);text-transform:uppercase;font-weight:700;letter-spacing:0.5px">SALIDA</div>
          <div style="font-size:12px;font-weight:700;margin-top:2px">${escHtml(sel.start_name || 'N/A')}</div>
        </div>
        <div style="padding:10px;background:var(--surface2);border-radius:8px;border-left:3px solid #ef4444">
          <div style="font-size:9px;color:var(--text3);text-transform:uppercase;font-weight:700;letter-spacing:0.5px">DESTINO</div>
          <div style="font-size:12px;font-weight:700;margin-top:2px">${escHtml(sel.end_name || 'N/A')}</div>
        </div>
      </div>
      ${stopsHtml}
      <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:12px">
        <span class="badge">⚡ ${sel.difficulty}</span>
        <span class="badge">🏍️ ${creator ? escHtml(creator.username) : '?'}</span>
        ${isOwner ? '<span class="badge badge-green">Tu ruta</span>' : ''}
      </div>
      ${(sel.date || (sel.end_lat && sel.end_lng)) ? `
      <div style="display:flex;gap:8px;align-items:center;padding:10px 12px;background:rgba(255,68,68,0.08);border:1px solid rgba(255,68,68,0.2);border-radius:10px;margin-bottom:12px">
        <span style="font-size:18px">📅</span>
        <div>
          <div style="font-size:12px;font-weight:700">${(() => { try { const d=new Date(sel.date+'T00:00');return d.toLocaleDateString('es-ES',{weekday:'short',day:'numeric',month:'short'}); } catch(e){return sel.date;} })()}</div>
          ${sel.time ? `<div style="font-size:11px;color:var(--accent);font-weight:600">🕐 ${sel.time}</div>` : ''}
        </div>
        ${sel.notify ? `
        <button onclick="scheduleRouteReminder(STATE.routes.find(x=>x.id===${sel.id}))" style="margin-left:auto;padding:6px 14px;border-radius:20px;font-size:12px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px;background:rgba(251,191,36,0.15);border:1.5px solid rgba(251,191,36,0.6);color:#fbbf24;box-shadow:0 0 10px rgba(251,191,36,0.25);transition:all 0.2s" onmouseenter="this.style.boxShadow='0 0 18px rgba(251,191,36,0.5)'" onmouseleave="this.style.boxShadow='0 0 10px rgba(251,191,36,0.25)'">
          🔔 Recordatorio
        </button>` : ''}
      </div>` : ''}
      <!-- CONFIRMED BIKERS -->
      ${(confirmedBikers || '')}
      ${(STATE.user && STATE.user.is_admin) || isOwner ? `
      <div style="display:flex;gap:8px;margin-top:12px">
        <button onclick="editRoute(${sel.id})" style="flex:1;padding:10px;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;background:rgba(251,191,36,0.1);border:1.5px solid rgba(251,191,36,0.5);color:#fbbf24;box-shadow:0 0 10px rgba(251,191,36,0.2);transition:all 0.2s" onmouseenter="this.style.boxShadow='0 0 18px rgba(251,191,36,0.45)';this.style.borderColor='#fbbf24'" onmouseleave="this.style.boxShadow='0 0 10px rgba(251,191,36,0.2)';this.style.borderColor='rgba(251,191,36,0.5)'">✏️ Editar</button>
        <button onclick="deleteRoute(${sel.id})" style="flex:1;padding:10px;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;background:rgba(239,68,68,0.1);border:1.5px solid rgba(239,68,68,0.5);color:#ef4444;box-shadow:0 0 10px rgba(239,68,68,0.2);transition:all 0.2s" onmouseenter="this.style.boxShadow='0 0 18px rgba(239,68,68,0.45)';this.style.borderColor='#ef4444'" onmouseleave="this.style.boxShadow='0 0 10px rgba(239,68,68,0.2)';this.style.borderColor='rgba(239,68,68,0.5)'">🗑️ Eliminar</button>
      </div>` : ''}
      `}
    </div>
    ` : ''}

    <!-- MAP — solo cuando hay ruta seleccionada (y en pestaña Detalle) -->
    ${sel && RIDE_SUBTAB==='detalle' ? `
    <div class="map-container" style="margin-bottom:10px;border-radius:16px;overflow:hidden;border:1px solid rgba(0,212,255,0.15)">
      <div id="map-rutas" style="height:200px"></div>
    </div>
    ` : ''}

    
    <!-- FAB — botón flotante para acciones de ruta -->
    ${sel ? `
    <div class="rutas-fab show" id="rutas-fab">
      <div class="rutas-fab-menu" id="rutas-fab-menu">
        ${_activeRouteId === sel.id ? `
        <div class="rutas-fab-badge rutas-fab-gps-active" id="fab-gps-coords" style="display:flex;align-items:center;gap:6px">
          <span style="width:8px;height:8px;border-radius:50%;background:#22c55e;animation:pulse 1.5s infinite"></span>
          GPS Activo · ${STATE.userLocation ? (STATE.userLocation.lat.toFixed(4)+', '+STATE.userLocation.lng.toFixed(4)) : 'Obteniendo...'}
        </div>
        <button class="rutas-fab-item" onclick="stopGPS();toggleFabMenu()" style="color:#ef4444">⏹️ Apagar GPS</button>
        <button class="rutas-fab-item" onclick="showLiveMap(${sel.id});toggleFabMenu()" style="color:#ffaa00">👥 Ver Mapa</button>
        ` : `
        <button class="rutas-fab-item" onclick="startGPS(${sel.id});toggleFabMenu()" style="color:#ff4444">📍 Activar GPS</button>
        `}
        ${(() => {
          const att = STATE.attendance || [];
          const myAtt = att.find(a => a.user_id === STATE.user?.id && a.route_id === sel.id);
          if (myAtt) {
            return `<div class="rutas-fab-item" style="color:#22c55e;cursor:default">✅ Ya confirmaste</div>`;
          }
          return `<button class="rutas-fab-item" id="fab-confirm-btn" onclick="manualCheckin(${sel.id});toggleFabMenu()" style="color:#22c55e">✅ Estoy aquí — Confirmar</button>`;
        })()}
      </div>
      <button class="rutas-fab-main" id="rutas-fab-btn" onclick="toggleFabMenu()" title="Acciones de ruta">📍</button>
    </div>
    ` : ''}

<!-- Tab content -->
    <div id="rutas-tab-content" style="${sel ? 'display:none' : ''}">
      ${RUTAS_TAB === 'rutas' ? `
        <div class="sub-tab-bar" style="display:flex;gap:4px;margin-bottom:10px">
          <button onclick="setRouteSubTab('nuevas')" style="padding:6px 12px;border-radius:20px;border:none;cursor:pointer;font-size:11px;font-weight:700;background:${routeSubTab==='nuevas'?'rgba(34,197,94,0.2)':'var(--surface2)'};color:${routeSubTab==='nuevas'?'#22c55e':'var(--text2)'}">✅ Nuevas (${(()=>{const t=new Date().toISOString().slice(0,10);return allRoutes.filter(r=>!r.date||r.date>=t).length;})()})</button>
          <button onclick="setRouteSubTab('vencidas')" style="padding:6px 12px;border-radius:20px;border:none;cursor:pointer;font-size:11px;font-weight:700;background:${routeSubTab==='vencidas'?'rgba(255,68,68,0.2)':'var(--surface2)'};color:${routeSubTab==='vencidas'?'#ff4444':'var(--text2)'}">❌ Vencidas (${(()=>{const t=new Date().toISOString().slice(0,10);return allRoutes.filter(r=>r.date&&r.date<t).length;})()})</button>
        </div>

        <div id="rutas-list">
          ${(() => {
            const today = new Date().toISOString().slice(0,10);
            const nuevas = allRoutes.filter(r => !r.date || r.date >= today);
            const vencidas = allRoutes.filter(r => r.date && r.date < today);
            const sourceList = routeSubTab === 'nuevas' ? nuevas : vencidas;
            if (sourceList.length === 0) {
              return `<div class="empty-state"><div class="empty-icon">🗺️</div><div>${routeSubTab==='nuevas'?'No hay rutas nuevas todavia':'No hay rutas vencidas'}</div>${STATE.user?.is_admin&&routeSubTab==='nuevas'?'<button class="btn btn-primary" style="margin-top:12px" onclick="createRoute()">Crear primera ruta</button>':''}</div>`;
            }
            return sourceList.map(r => renderRouteCard(r, routeSubTab==='vencidas')).join('');
          })()}
        </div>
      ` : ''}
    </div>
  `;

  setTimeout(initRutasMap, 100);
}

// ============================================================
// LISTA DE ASISTENCIA / PAGO POR RUEDE  (solo admin gestiona)
// ============================================================
let RIDE_SUBTAB = 'detalle';

function setRideSubTab(tab) {
  RIDE_SUBTAB = tab;
  renderRutas();
}

let RIDE_FILTER = 'todos'; // 'todos' | 'pagaron' | 'pendiente'
function setRideFilter(f) {
  RIDE_FILTER = (RIDE_FILTER === f) ? 'todos' : f;
  if (_payModalRouteId) _refreshPayModal(_payModalRouteId);
  else renderRutas();
}

let _payModalRouteId = null;

function _refreshPayModal(routeId) {
  const modal = document.getElementById('modal');
  if (!modal || !modal.classList.contains('open')) return;
  const el = document.getElementById('modal-content');
  if (!el) return;
  const r = STATE.routes.find(x => x.id === routeId);
  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <div style="font-size:16px;font-weight:700">💵 ${r ? escHtml(r.name) : 'Pagos'}</div>
      <button class="modal-x" onclick="closeModal()">✕</button>
    </div>
    ${renderRideList(routeId)}
  `;
}

function openRidePayList(routeId) {
  const r = STATE.routes.find(x => x.id === routeId);
  if (!r) return;
  _maybeSeedPlayaBlanca(routeId);
  _payModalRouteId = routeId;
  openModal('💵 ' + escHtml(r.name), renderRideList(routeId));
}

// Siembra una sola vez la lista real de la rodada "Playa blanca, colon".
// [nombre, apellido, comida, pago] -> pago: 1=pagó, 0=pendiente
function _maybeSeedPlayaBlanca(routeId) {
  if (ls('bs_paylist_seed_pb')) return;
  const r = STATE.routes.find(x => x.id === routeId);
  if (!r || !/playa\s*blanca/i.test(r.name || '')) return;
  if (!STATE.payList) STATE.payList = ls('bs_paylist') || {};
  if ((STATE.payList[routeId] || []).length === 0) {
    const D = [
      ['Fitzgerald','Mejía','pargo',1],
      ['Meyling','Mercado','filete de pargo',1],
      ['Indira','Mercado','camarones',1],
      ['Alexia','Junieth','pulpo con coco',1],
      ['Orlando','Rojo','pargo',1],
      ['Orlando','(esposa)','pargo',1],
      ['Natalia','Escarpeta','pargo',1],
      ['Nandy','Sofía','pulpo con coco',1],
      ['Ramón','Tomás RK','filete de pargo',1],
      ['Rolando','Chavarría','pulpo',1],
      ['Antonini','','filete de pargo',1],
      ['Carolina','Santana','filete de pargo',1],
      ['José','Vergara','pulpo con coco',1],
      ['Rodolfo','Mendieta','filete de pargo',1],
      ['Alexis','','filete de pargo',1],
      ['Masieel','','filete de pargo',1],
      ['Nohemí','Iriarte','pargo',1],
      ['Felipe','Gonzáles','pargo',1],
      ['Esther','Suárez','pargo',1],
      ['Ronny','Fabián','camarones',1],
      ['Maylin','','filete de pargo',1],
      ['Alicia','Navi','pargo',1],
      ['Mexicano','','pargo',1],
      ['Javier','Enrique','pargo',1],
      ['Wesly','','pargo',1],
      ['Esposa','de Wesly','pollo frito',1],
      ['Positivo','','filete de pargo',0],
      ['Abdiel','Ledesma','pulpo con coco',0],
      ['Jesús','','pargo',0],
      ['Stiven','','camarones',0],
      ['Carlos','Iván Cruz','pargo',0],
      ['Roberth','de León','pulpo con coco',1],
      ['Yaisbeth','Vargas','camarones',1],
      ['José','Rosa','filete de pargo',0],
      ['Juliette','(hija de Rosa)','pargo',0],
      ['Engel','Ampie','pargo',1],
      ['Katerine','','pargo',1],
      ['Dindoski','','filete de pargo',1],
      ['Jonathan','Soto','camarones',1],
      ['Dana','Falconet','camarones',1],
      ['Scarlett','','filete de pargo',1],
      ['Scarlett','(2)','filete de pargo',1],
      ['Scarlett','(3)','pulpo',1],
      ['Scarlett','(4)','camarones',1],
      ['Scarlett','(amigo)','pargo',1],
      ['Scarlett','(amiga)','camarones',1],
      ['Scarlett','(amigo 3)','camarones',1],
      ['Olivares','','camarones',1],
      ['Maiker','Quiroz','pulpo',1],
      ['Maiker','Quiroz (2)','pulpo',1],
      ['Gean','Rodríguez','pargo',0],
      ['Gean','(mochila)','pargo',0],
    ];
    STATE.payList[routeId] = D.map((d, i) => ({ id: 'pb' + (i + 1), nombre: d[0], apellido: d[1], comida: d[2], pago: !!d[3] }));
    saveRideList();
  }
  ls('bs_paylist_seed_pb', true);
}

function getRideList(routeId) {
  if (!STATE.payList) STATE.payList = ls('bs_paylist') || {};
  return STATE.payList[routeId] || [];
}
function saveRideList() {
  ls('bs_paylist', STATE.payList || {});
  _ec2Push(); // persistir en EC2
}

function renderRideList(routeId) {
  _maybeSeedPlayaBlanca(routeId);
  const isAdmin = _canEditPay(routeId);
  const list = getRideList(routeId);
  const pagaron = list.filter(m => m.pago);
  const pendiente = list.filter(m => !m.pago);

  const head = `
    <div style="margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;gap:8px">
      <div>
        <div style="font-size:14px;font-weight:800">💵 Control de pagos</div>
        <div style="font-size:11px;color:var(--text3);margin-top:2px">${list.length} en lista · <span style="color:#22c55e;font-weight:700">${pagaron.length} pagaron</span> · <span style="color:#ffae3a;font-weight:700">${pendiente.length} pendiente${pendiente.length===1?'':'s'}</span></div>
      </div>
      ${isAdmin && list.length > 0 ? `<button onclick="descargarPlanilla(${routeId})" style="background:rgba(99,102,241,0.15);border:1px solid rgba(99,102,241,0.4);color:#818cf8;border-radius:10px;padding:7px 12px;cursor:pointer;font-size:11px;font-weight:700;white-space:nowrap;flex-shrink:0">⬇️ Descargar Planilla</button>` : ''}
    </div>`;

  const addForm = isAdmin ? `
    <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;background:rgba(16,185,129,0.04);border:1.5px solid rgba(16,185,129,0.3);border-radius:14px;padding:10px;margin-bottom:14px;box-shadow:0 0 12px rgba(16,185,129,0.1)">
      <input class="input" id="rl-nombre" placeholder="Nombre" style="flex:1;min-width:84px;margin:0;border:1.5px solid rgba(16,185,129,0.45);background:rgba(16,185,129,0.06);box-shadow:0 0 8px rgba(16,185,129,0.2);color:#e2ffe8" onfocus="this.style.borderColor='#10b981';this.style.boxShadow='0 0 14px rgba(16,185,129,0.5)'" onblur="this.style.borderColor='rgba(16,185,129,0.45)';this.style.boxShadow='0 0 8px rgba(16,185,129,0.2)'">
      <input class="input" id="rl-apellido" placeholder="Apellido" style="flex:1;min-width:84px;margin:0;border:1.5px solid rgba(16,185,129,0.45);background:rgba(16,185,129,0.06);box-shadow:0 0 8px rgba(16,185,129,0.2);color:#e2ffe8" onfocus="this.style.borderColor='#10b981';this.style.boxShadow='0 0 14px rgba(16,185,129,0.5)'" onblur="this.style.borderColor='rgba(16,185,129,0.45)';this.style.boxShadow='0 0 8px rgba(16,185,129,0.2)'">
      <input class="input" id="rl-comida" placeholder="Comida" style="flex:1;min-width:84px;margin:0;border:1.5px solid rgba(16,185,129,0.45);background:rgba(16,185,129,0.06);box-shadow:0 0 8px rgba(16,185,129,0.2);color:#e2ffe8" onfocus="this.style.borderColor='#10b981';this.style.boxShadow='0 0 14px rgba(16,185,129,0.5)'" onblur="this.style.borderColor='rgba(16,185,129,0.45)';this.style.boxShadow='0 0 8px rgba(16,185,129,0.2)'">
      <button class="btn btn-primary" style="padding:9px 16px;white-space:nowrap" onclick="submitRideMember(${routeId})">Agregar</button>
    </div>` : '';

  const row = m => `
    <div style="display:flex;align-items:center;gap:8px;padding:10px;background:var(--surface2);border-radius:10px;margin-bottom:6px;border-left:3px solid ${m.pago?'#22c55e':'#ffae3a'}">
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:700">${escHtml(m.nombre)} ${escHtml(m.apellido||'')}</div>
        <div style="font-size:11px;color:var(--text3)">🍽️ ${escHtml(m.comida || '—')}</div>
      </div>
      ${isAdmin ? `
      <button onclick="toggleRidePago(${routeId},'${m.id}')" title="${m.pago?'Marcar como pendiente':'Marcar como pagó'}" style="background:${m.pago?'rgba(255,174,58,0.15)':'rgba(34,197,94,0.15)'};border:1px solid ${m.pago?'#ffae3a':'#22c55e'};color:${m.pago?'#ffae3a':'#22c55e'};border-radius:8px;padding:6px 9px;cursor:pointer;font-size:11px;font-weight:700;white-space:nowrap">${m.pago?'↩ Pendiente':'✅ Pagó'}</button>
      <button onclick="deleteRideMember(${routeId},'${m.id}')" title="Quitar de la lista" style="background:var(--surface);border:1px solid #ef4444;color:#ef4444;border-radius:8px;padding:6px 8px;cursor:pointer;font-size:13px">🗑️</button>
      ` : `<span class="badge" style="background:${m.pago?'rgba(34,197,94,0.15)':'rgba(255,174,58,0.15)'};color:${m.pago?'#22c55e':'#ffae3a'};border:1px solid ${m.pago?'rgba(34,197,94,0.3)':'rgba(255,174,58,0.3)'};white-space:nowrap">${m.pago?'✅ Pagó':'⏳ Pendiente'}</span>`}
    </div>`;

  const group = (titulo, color, arr) => `
    <div style="margin-bottom:14px">
      <div style="font-size:12px;font-weight:800;color:${color};margin-bottom:8px;display:flex;align-items:center;gap:6px">${titulo} <span style="background:${color}22;color:${color};border-radius:10px;padding:1px 8px;font-size:11px">${arr.length}</span></div>
      ${arr.length ? arr.map(row).join('') : `<div style="font-size:12px;color:var(--text3);padding:4px 2px">— Nadie aún —</div>`}
    </div>`;

  const filterBar = `
    <div style="display:flex;gap:6px;margin-bottom:12px">
      <button onclick="setRideFilter('pagaron')" style="padding:6px 12px;border-radius:10px;font-size:11px;font-weight:700;cursor:pointer;border:1px solid ${RIDE_FILTER==='pagaron'?'#22c55e':'var(--border)'};background:${RIDE_FILTER==='pagaron'?'rgba(34,197,94,0.2)':'var(--surface2)'};color:${RIDE_FILTER==='pagaron'?'#22c55e':'var(--text2)'}">✅ Pagaron (${pagaron.length})</button>
      <button onclick="setRideFilter('pendiente')" style="padding:6px 12px;border-radius:10px;font-size:11px;font-weight:700;cursor:pointer;border:1px solid ${RIDE_FILTER==='pendiente'?'#ffae3a':'var(--border)'};background:${RIDE_FILTER==='pendiente'?'rgba(255,174,58,0.2)':'var(--surface2)'};color:${RIDE_FILTER==='pendiente'?'#ffae3a':'var(--text2)'}">⏳ Pendiente (${pendiente.length})</button>
    </div>`;

  const showPag = RIDE_FILTER === 'todos' || RIDE_FILTER === 'pagaron';
  const showPend = RIDE_FILTER === 'todos' || RIDE_FILTER === 'pendiente';
  const body = (list.length === 0 && !_canEditPay(routeId))
    ? `<div class="empty-state" style="padding:20px 0"><div class="empty-icon">📝</div><div>Aún no hay nadie en la lista</div></div>`
    : (showPag ? group('✅ Pagaron', '#22c55e', pagaron) : '') + (showPend ? group('⏳ Pendiente', '#ffae3a', pendiente) : '');

  return head + addForm + filterBar + body;
}

function openAddRideMember(routeId) {
  if (!_canEditPay(routeId)) { toast('Sin permisos'); return; }
  const body = `
    <input class="input" id="rl-nombre" placeholder="Nombre" style="margin-bottom:8px;border:1.5px solid rgba(16,185,129,0.45);background:rgba(16,185,129,0.06);box-shadow:0 0 8px rgba(16,185,129,0.2);color:#e2ffe8" onfocus="this.style.borderColor='#10b981';this.style.boxShadow='0 0 14px rgba(16,185,129,0.5)'" onblur="this.style.borderColor='rgba(16,185,129,0.45)';this.style.boxShadow='0 0 8px rgba(16,185,129,0.2)'">
    <input class="input" id="rl-apellido" placeholder="Apellido" style="margin-bottom:8px;border:1.5px solid rgba(16,185,129,0.45);background:rgba(16,185,129,0.06);box-shadow:0 0 8px rgba(16,185,129,0.2);color:#e2ffe8" onfocus="this.style.borderColor='#10b981';this.style.boxShadow='0 0 14px rgba(16,185,129,0.5)'" onblur="this.style.borderColor='rgba(16,185,129,0.45)';this.style.boxShadow='0 0 8px rgba(16,185,129,0.2)'">
    <input class="input" id="rl-comida" placeholder="Comida (ej. Pollo, Vegetariano...)" style="margin-bottom:8px;border:1.5px solid rgba(16,185,129,0.45);background:rgba(16,185,129,0.06);box-shadow:0 0 8px rgba(16,185,129,0.2);color:#e2ffe8" onfocus="this.style.borderColor='#10b981';this.style.boxShadow='0 0 14px rgba(16,185,129,0.5)'" onblur="this.style.borderColor='rgba(16,185,129,0.45)';this.style.boxShadow='0 0 8px rgba(16,185,129,0.2)'">
    <div style="display:flex;gap:8px;margin-bottom:14px">
      <label style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:10px;border-radius:10px;background:var(--surface2);border:1px solid var(--border);cursor:pointer;font-size:13px;font-weight:700">
        <input type="radio" name="rl-pago" value="1"> ✅ Pagó
      </label>
      <label style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:10px;border-radius:10px;background:var(--surface2);border:1px solid var(--border);cursor:pointer;font-size:13px;font-weight:700">
        <input type="radio" name="rl-pago" value="0" checked> ❌ No pagó
      </label>
    </div>
    <button class="btn btn-primary" style="width:100%;padding:12px" onclick="submitRideMember(${routeId})">Agregar a la lista</button>`;
  openModal('➕ Agregar asistente', body);
}

function submitRideMember(routeId) {
  if (!_canEditPay(routeId)) { toast('Sin permisos'); return; }
  const nombre = (document.getElementById('rl-nombre').value || '').trim();
  const apellido = (document.getElementById('rl-apellido').value || '').trim();
  const comida = (document.getElementById('rl-comida').value || '').trim();
  const pagoEl = document.querySelector('input[name="rl-pago"]:checked');
  const pago = pagoEl ? pagoEl.value === '1' : false;
  if (!nombre) { toast('Escribe al menos el nombre'); return; }
  if (!STATE.payList) STATE.payList = ls('bs_paylist') || {};
  if (!STATE.payList[routeId]) STATE.payList[routeId] = [];
  STATE.payList[routeId].push({ id: 'm'+Date.now()+Math.floor(Math.random()*1000), nombre, apellido, comida, pago });
  saveRideList();
  openRidePayList(routeId);
  toast('Asistente agregado');
}

function _canEditPay(routeId) {
  if (!STATE.user) return false;
  if (STATE.user.is_admin) return true;
  const r = STATE.routes.find(x => x.id === routeId);
  return r && r.created_by === STATE.user.id;
}

function descargarPlanilla(routeId) {
  const r = STATE.routes.find(x => x.id === routeId);
  const list = getRideList(routeId);
  const nombre = r ? r.name : 'Ruta';
  const pagaron = list.filter(m => m.pago).length;
  const pendientes = list.length - pagaron;
  const hoy = new Date().toLocaleDateString('es-PA', {day:'2-digit',month:'2-digit',year:'numeric'});

  const col = (v, w) => String(v).padEnd(w).substring(0, w);
  const sep = '─'.repeat(58);

  const lines = [
    `PLANILLA DE PAGOS`,
    `Ruta: ${nombre}`,
    `Fecha: ${hoy}`,
    sep,
    col('#',4) + col('Nombre',16) + col('Apellido',16) + col('Comida',14) + 'Estado',
    sep,
    ...list.map((m, i) =>
      col(i+1, 4) + col(m.nombre||'', 16) + col(m.apellido||'', 16) + col(m.comida||'—', 14) + (m.pago ? 'Pagó' : 'Pendiente')
    ),
    sep,
    `Total: ${list.length}   Pagaron: ${pagaron}   Pendientes: ${pendientes}`,
    sep,
  ];

  const texto = lines.join('\r\n');
  const blob = new Blob([texto], {type: 'text/plain;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const filename = `Planilla_${nombre.replace(/[^a-z0-9]/gi,'_')}.txt`;

  // Open in new tab (works on mobile PWA)
  const win = window.open(url, '_blank');
  // Also trigger download as fallback
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function toggleRidePago(routeId, memberId) {
  if (!_canEditPay(routeId)) return;
  const list = (STATE.payList && STATE.payList[routeId]) || [];
  const m = list.find(x => x.id === memberId);
  if (m) { m.pago = !m.pago; saveRideList(); _refreshPayModal(routeId); }
}

function deleteRideMember(routeId, memberId) {
  if (!_canEditPay(routeId)) return;
  if (!confirm('¿Quitar a esta persona de la lista?')) return;
  if (STATE.payList && STATE.payList[routeId]) {
    STATE.payList[routeId] = STATE.payList[routeId].filter(x => x.id !== memberId);
    saveRideList();
    _refreshPayModal(routeId);
  }
}

let routeSubTab = 'nuevas';
let routeFilter = { difficulty: 'todas', maxKm: 500 };
// Store selected POI data so it survives modal recreation
let _routePOI = { start: null, end: null };

// Haversine distance in km
function routeDistanceKm(r) {
  if (!r.start_lat || !r.end_lat) return 0;
  const R = 6371;
  const dLat = (parseFloat(r.end_lat) - parseFloat(r.start_lat)) * Math.PI / 180;
  const dLng = (parseFloat(r.end_lng) - parseFloat(r.start_lng)) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(parseFloat(r.start_lat)*Math.PI/180)*Math.cos(parseFloat(r.end_lat)*Math.PI/180)*Math.sin(dLng/2)**2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

// Export route as GPX file
// ── Open route in Waze / Google Maps / Apple Maps ────────────────────────────
// Always available — does NOT require GPS, geolocation, or any other condition.
// Works with whatever coordinates the route already has. If route has no coords,
// shows an interactive map so user can pick start/end.
function openRouteInNav(routeId) {
  const r = STATE.routes.find(x => x.id === routeId);
  if (!r) {
    toast('Ruta no encontrada');
    return;
  }
  let stops = [];
  try { stops = JSON.parse(r.stops || '[]'); } catch(e) {}
  const allPoints = [
    { name: r.start_name || 'Salida', lat: r.start_lat, lng: r.start_lng },
    ...stops.map(s => ({ name: s.name, lat: s.lat, lng: s.lng })),
    { name: r.end_name || 'Destino', lat: r.end_lat, lng: r.end_lng },
  ].filter(p => p.lat && p.lng);

  // If route has no coordinates, show a map picker so user can set start/end
  if (allPoints.length < 2) {
    pickRoutePointsForNav(r, stops);
    return;
  }

  const start = allPoints[0];
  const end = allPoints[allPoints.length - 1];

  // Detect platform
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(navigator.userAgent);

  // ── Waze deep link ─────────────────────────────────────────────────────
  const wazeUrl = `waze://?ll=${end.lat},${end.lng}&navigate=yes`;
  const wazeWebUrl = `https://waze.com/ul?ll=${end.lat},${end.lng}&navigate=yes`;

  // ── Google Maps deep link ─────────────────────────────────────────────
  const gmapsUrl = `comgooglemaps://?saddr=${start.lat},${start.lng}&daddr=${end.lat},${end.lng}&directionsmode=motorcycle`;
  const gmapsWebUrl = `https://www.google.com/maps/dir/?api=1&origin=${start.lat},${start.lng}&destination=${end.lat},${end.lng}&travelmode=motorcycle`;

  // ── Apple Maps (iOS only) ─────────────────────────────────────────────
  const appleMapsUrl = `https://maps.apple.com/?saddr=${start.lat},${start.lng}&daddr=${end.lat},${end.lng}&dirflg=d`;

  const body = `
    <div style="text-align:center;margin-bottom:14px">
      <div style="font-size:13px;color:var(--text2);margin-bottom:4px">${escHtml(r.name)}</div>
      <div style="font-size:11px;color:var(--text3)">${escHtml(start.name)} → ${escHtml(end.name)}</div>
    </div>
    <div style="display:grid;gap:10px">
      <button onclick="navigateWith('${wazeUrl}', '${wazeWebUrl}')" style="padding:14px;border-radius:12px;border:1px solid rgba(0,212,255,0.3);background:rgba(0,212,255,0.08);color:#00d4ff;cursor:pointer;font-size:14px;font-weight:700;display:flex;align-items:center;gap:12px">
        <div style="width:42px;height:42px;border-radius:50%;background:#33ccff;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0">🧭</div>
        <div style="flex:1;text-align:left">
          <div>Waze</div>
          <div style="font-size:11px;font-weight:400;opacity:0.8">${isIOS || isAndroid ? 'Abre la app instalada' : 'Abre waze.com'}</div>
        </div>
        <span style="font-size:18px">→</span>
      </button>
      <button onclick="navigateWith('${gmapsUrl}', '${gmapsWebUrl}')" style="padding:14px;border-radius:12px;border:1px solid rgba(34,197,94,0.3);background:rgba(34,197,94,0.08);color:#22c55e;cursor:pointer;font-size:14px;font-weight:700;display:flex;align-items:center;gap:12px">
        <div style="width:42px;height:42px;border-radius:50%;background:#22c55e;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0">🗺️</div>
        <div style="flex:1;text-align:left">
          <div>Google Maps</div>
          <div style="font-size:11px;font-weight:400;opacity:0.8">${isIOS || isAndroid ? 'Abre la app instalada' : 'maps.google.com'}</div>
        </div>
        <span style="font-size:18px">→</span>
      </button>
      ${isIOS ? `
      <button onclick="window.open('${appleMapsUrl}','_blank');closeModal();" style="padding:14px;border-radius:12px;border:1px solid rgba(168,85,247,0.3);background:rgba(168,85,247,0.08);color:#a855f7;cursor:pointer;font-size:14px;font-weight:700;display:flex;align-items:center;gap:12px">
        <div style="width:42px;height:42px;border-radius:50%;background:#a855f7;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0">🍎</div>
        <div style="flex:1;text-align:left">
          <div>Apple Maps</div>
          <div style="font-size:11px;font-weight:400;opacity:0.8">Solo en iPhone/iPad</div>
        </div>
        <span style="font-size:18px">→</span>
      </button>` : ''}
    </div>
    <div style="margin-top:14px;padding:10px;background:rgba(255,136,0,0.08);border:1px solid rgba(255,136,0,0.2);border-radius:10px;font-size:11px;color:var(--text2);text-align:center">
      ${isIOS || isAndroid ? 'Si la app no abre, ya tenes Google Maps en el telefono — toca el boton' : 'Abre desde el celular para que use las apps instaladas'}
    </div>
  `;
  openModal('🧭 Seguir ruta en...', body);
}

// Pick start/end points on a map for routes that don't have coordinates
function pickRoutePointsForNav(r, existingStops) {
  const body = `
    <div style="font-size:12px;color:var(--text2);text-align:center;margin-bottom:8px">
      Esta ruta no tiene coordenadas. Toca el mapa para elegir:
    </div>
    <div style="display:flex;gap:6px;justify-content:center;margin-bottom:8px;font-size:11px">
      <span style="padding:4px 8px;background:rgba(34,197,94,0.15);border:1px solid rgba(34,197,94,0.4);border-radius:6px;color:#22c55e">1. Toca: Salida</span>
      <span style="padding:4px 8px;background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.4);border-radius:6px;color:#ef4444">2. Toca: Destino</span>
    </div>
    <div id="pick-nav-map" style="height:300px;border-radius:10px;overflow:hidden;border:1px solid var(--border);margin-bottom:10px"></div>
    <div style="display:flex;gap:6px">
      <button id="pick-start-name" onclick="setPickName('start')" style="flex:1;padding:8px;font-size:11px;background:var(--surface2);border:1px solid var(--border);color:var(--text2);border-radius:8px;cursor:pointer">📍 Nombre salida</button>
      <button id="pick-end-name" onclick="setPickName('end')" style="flex:1;padding:8px;font-size:11px;background:var(--surface2);border:1px solid var(--border);color:var(--text2);border-radius:8px;cursor:pointer">🏁 Nombre destino</button>
    </div>
    <button id="pick-nav-go" disabled onclick="openPickedNav()" style="width:100%;margin-top:10px;padding:12px;background:linear-gradient(135deg,#ff4444,#ff8800);border:none;color:#fff;font-size:14px;font-weight:700;border-radius:10px;cursor:pointer;opacity:0.5">Selecciona los 2 puntos</button>
  `;
  openModal('📍 Elige puntos de la ruta', body);

  setTimeout(() => {
    if (!window.L) return;
    const map = L.map('pick-nav-map').setView([8.9824, -79.5199], 10);
    _mapTile().addTo(map);

    let startMarker = null, endMarker = null;
    let startName = 'Salida', endName = 'Destino';

    map.on('click', e => {
      const { lat, lng } = e.latlng;
      if (!startMarker) {
        startMarker = L.marker([lat, lng], {
          icon: L.divIcon({ html: '🟢', className: '', iconSize: [30, 30], iconAnchor: [15, 15] })
        }).addTo(map).bindPopup('Salida').openPopup();
        window._pickStart = { lat, lng };
      } else if (!endMarker) {
        endMarker = L.marker([lat, lng], {
          icon: L.divIcon({ html: '🔴', className: '', iconSize: [30, 30], iconAnchor: [15, 15] })
        }).addTo(map).bindPopup('Destino').openPopup();
        window._pickEnd = { lat, lng };
        // Update button
        const btn = document.getElementById('pick-nav-go');
        if (btn) { btn.disabled = false; btn.style.opacity = '1'; btn.textContent = '🧭 Abrir en Waze/Maps'; }
      } else {
        // Reset
        map.removeLayer(startMarker);
        map.removeLayer(endMarker);
        startMarker = L.marker([lat, lng], {
          icon: L.divIcon({ html: '🟢', className: '', iconSize: [30, 30], iconAnchor: [15, 15] })
        }).addTo(map);
        window._pickStart = { lat, lng };
        endMarker = null;
        window._pickEnd = null;
        const btn = document.getElementById('pick-nav-go');
        if (btn) { btn.disabled = true; btn.style.opacity = '0.5'; btn.textContent = 'Selecciona los 2 puntos'; }
      }
    });

    window._pickStart = null;
    window._pickEnd = null;
    window._pickStartName = () => startName;
    window._pickEndName = () => endName;
  }, 100);
}

function setPickName(which) {
  const name = prompt(which === 'start' ? 'Nombre del punto de salida:' : 'Nombre del destino:');
  if (name) {
    if (which === 'start') window._pickStartName = () => name;
    else window._pickEndName = () => name;
  }
}

function openPickedNav() {
  if (!window._pickStart || !window._pickEnd) return;
  const s = window._pickStart, e = window._pickEnd;
  const sName = (typeof window._pickStartName === 'function' ? window._pickStartName() : 'Salida');
  const eName = (typeof window._pickEndName === 'function' ? window._pickEndName() : 'Destino');
  closeModal();

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(navigator.userAgent);

  const wazeUrl = `waze://?ll=${e.lat},${e.lng}&navigate=yes`;
  const wazeWebUrl = `https://waze.com/ul?ll=${e.lat},${e.lng}&navigate=yes`;
  const gmapsUrl = `comgooglemaps://?saddr=${s.lat},${s.lng}&daddr=${e.lat},${e.lng}&directionsmode=motorcycle`;
  const gmapsWebUrl = `https://www.google.com/maps/dir/?api=1&origin=${s.lat},${s.lng}&destination=${e.lat},${e.lng}&travelmode=motorcycle`;
  const appleMapsUrl = `https://maps.apple.com/?saddr=${s.lat},${s.lng}&daddr=${e.lat},${e.lng}&dirflg=d`;

  const body = `
    <div style="text-align:center;margin-bottom:14px">
      <div style="font-size:13px;color:var(--text2);margin-bottom:4px">Ruta personalizada</div>
      <div style="font-size:11px;color:var(--text3)">${escHtml(sName)} → ${escHtml(eName)}</div>
    </div>
    <div style="display:grid;gap:10px">
      <button onclick="navigateWith('${wazeUrl}', '${wazeWebUrl}')" style="padding:14px;border-radius:12px;border:1px solid rgba(0,212,255,0.3);background:rgba(0,212,255,0.08);color:#00d4ff;cursor:pointer;font-size:14px;font-weight:700;display:flex;align-items:center;gap:12px">
        <div style="width:42px;height:42px;border-radius:50%;background:#33ccff;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0">🧭</div>
        <div style="flex:1;text-align:left"><div>Waze</div><div style="font-size:11px;font-weight:400;opacity:0.8">${isIOS || isAndroid ? 'Abre la app instalada' : 'Abre waze.com'}</div></div>
        <span style="font-size:18px">→</span>
      </button>
      <button onclick="navigateWith('${gmapsUrl}', '${gmapsWebUrl}')" style="padding:14px;border-radius:12px;border:1px solid rgba(34,197,94,0.3);background:rgba(34,197,94,0.08);color:#22c55e;cursor:pointer;font-size:14px;font-weight:700;display:flex;align-items:center;gap:12px">
        <div style="width:42px;height:42px;border-radius:50%;background:#22c55e;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0">🗺️</div>
        <div style="flex:1;text-align:left"><div>Google Maps</div><div style="font-size:11px;font-weight:400;opacity:0.8">${isIOS || isAndroid ? 'Abre la app instalada' : 'maps.google.com'}</div></div>
        <span style="font-size:18px">→</span>
      </button>
      ${isIOS ? `<button onclick="window.open('${appleMapsUrl}','_blank');closeModal();" style="padding:14px;border-radius:12px;border:1px solid rgba(168,85,247,0.3);background:rgba(168,85,247,0.08);color:#a855f7;cursor:pointer;font-size:14px;font-weight:700;display:flex;align-items:center;gap:12px"><div style="width:42px;height:42px;border-radius:50%;background:#a855f7;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0">🍎</div><div style="flex:1;text-align:left"><div>Apple Maps</div></div><span style="font-size:18px">→</span></button>` : ''}
    </div>
  `;
  openModal('🧭 Seguir ruta en...', body);
}

// Try native app deep link first, fall back to web URL after a short delay
function navigateWith(nativeUrl, webUrl) {
  const start = Date.now();
  window.location.href = nativeUrl;
  setTimeout(() => {
    if (Date.now() - start < 2500) {
      window.open(webUrl, '_blank');
    }
  }, 1500);
  setTimeout(() => closeModal(), 500);
}

// Keep exportRouteGPX as a hidden fallback for power users
function exportRouteGPX(routeId) {
  openRouteInNav(routeId);
}

function setRutasTab(t) {
  RUTAS_TAB = t;
  renderRutas();
}

function setRouteSubTab(t) {
  routeSubTab = t;
  const list = document.getElementById('rutas-list');
  if (list) {
    const today = new Date().toISOString().slice(0,10);
    const nuevas = STATE.routes.filter(r => !r.date || r.date >= today);
    const vencidas = STATE.routes.filter(r => r.date && r.date < today);
    const sourceList = t === 'nuevas' ? nuevas : vencidas;
    list.innerHTML = sourceList.length === 0
      ? `<div class="empty-state"><div class="empty-icon">🗺️</div><div>${t==='nuevas'?'No hay rutas nuevas todavia':'No hay rutas vencidas'}</div></div>`
      : sourceList.map(r => renderRouteCard(r, t==='vencidas')).join('');
  }
  document.querySelectorAll('.sub-tab-bar button').forEach(b => {
    b.style.background = 'var(--surface2)';
    b.style.color = 'var(--text2)';
  });
  event.target.style.background = 'rgba(255,68,68,0.2)';
  event.target.style.color = '#ff4444';
}

function setEventSubTab(t) {
  eventSubTab = t;
  const upcoming = STATE.events.filter(e => e.status === 'activo');
  const past = STATE.events.filter(e => e.status !== 'activo');
  const list = document.getElementById('eventos-list');
  if (list) {
    list.innerHTML = (t === 'proximos' ? upcoming : past).map(ev => renderEventCard(ev)).join('') || '<div class="empty-state"><div class="empty-icon">📅</div><div>Sin eventos</div></div>';
  }
  document.querySelectorAll('.sub-tab-bar button').forEach(b => {
    b.style.background = 'var(--surface2)';
    b.style.color = 'var(--text2)';
  });
  if (event && event.target) {
    event.target.style.background = 'rgba(255,68,68,0.2)';
    event.target.style.color = '#ff4444';
  }
}

function escHtml(s) {
  return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function deselectRoute() {
  STATE.selectedRoute = null;
  renderRutas();
}

function initRutasMap() {
  const mapEl = document.getElementById('map-rutas');
  if (!mapEl) return;
  if (STATE.map) { STATE.map.remove(); STATE.map = null; }
  if (STATE.rutaWatchId !== null) { navigator.geolocation.clearWatch(STATE.rutaWatchId); STATE.rutaWatchId = null; }

  const map = L.map('map-rutas', {zoomControl:false, attributionControl:false}).setView([8.9824, -79.5199], 12);
  _mapTile().addTo(map);
  STATE.map = map;

  const sel = STATE.selectedRoute;

  if (sel) {
    // === MODO RUTA SELECCIONADA ===
    const pts = [[sel.start_lat, sel.start_lng]];
    let stops = [];
    try { stops = JSON.parse(sel.stops || '[]'); } catch(e) {}
    stops.forEach(s => { if (s.lat && s.lng) pts.push([parseFloat(s.lat), parseFloat(s.lng)]); });
    pts.push([sel.end_lat, sel.end_lng]);

    // SALIDA pill
    const startDiv = L.divIcon({className:'', html:`<div style="background:#22c55e;color:#fff;font-size:9px;font-weight:700;padding:3px 7px;border-radius:20px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.5)">SALIDA</div>`});
    L.marker([sel.start_lat, sel.start_lng], {icon:startDiv}).addTo(map);

    // PARADA pills
    stops.forEach((s, i) => {
      if (!s.lat || !s.lng) return;
      const stopDiv = L.divIcon({className:'', html:`<div style="background:#ff8800;color:#fff;font-size:9px;font-weight:700;padding:3px 7px;border-radius:20px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.5)">P${i+1}</div>`});
      L.marker([parseFloat(s.lat), parseFloat(s.lng)], {icon:stopDiv}).addTo(map);
    });

    // DESTINO pill
    const endDiv = L.divIcon({className:'', html:`<div style="background:#ef4444;color:#fff;font-size:9px;font-weight:700;padding:3px 7px;border-radius:20px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.5)">DESTINO</div>`});
    L.marker([sel.end_lat, sel.end_lng], {icon:endDiv}).addTo(map);

    // Placeholder line
    const placeholder = L.polyline(pts, {color:'#ff4444', weight:5, opacity:0.35, dashArray:'12,8'}).addTo(map);

    // Real road route via OSRM
    const coords = pts.map(p => `${p[1]},${p[0]}`).join(';');
    fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`)
      .then(res => res.json())
      .then(data => {
        if (data.code !== 'Ok' || !data.routes || !data.routes[0]) return;
        placeholder.remove();
        L.geoJSON(data.routes[0].geometry, {style: {color:'#ff4444', weight:5, opacity:1, className:'route-animated'}}).addTo(map);
      }).catch(() => {});

    // Fit to route
    if (sel.start_lat && sel.end_lat) map.fitBounds(pts, {padding: [40, 40], maxZoom: 14});

    // === UBICACION EN TIEMPO REAL ===
    if (navigator.geolocation) {
      // My location
      navigator.geolocation.getCurrentPosition(pos => {
        const {latitude:lat, longitude:lng} = pos.coords;
        if (STATE.myLocationMarker) { STATE.myLocationMarker.remove(); }
        const myIcon = L.divIcon({className:'', html:`<div style="width:16px;height:16px;background:#3b82f6;border:3px solid #fff;border-radius:50%;box-shadow:0 0 12px rgba(59,130,246,0.8)"></div>`});
        STATE.myLocationMarker = L.marker([lat, lng], {icon:myIcon}).addTo(map).bindPopup('Mi ubicación');
      }, () => {}, {timeout:5000});

      // Watch position for live tracking
      STATE.rutaWatchId = navigator.geolocation.watchPosition(pos => {
        const {latitude:lat, longitude:lng} = pos.coords;
        if (STATE.myLocationMarker) { STATE.myLocationMarker.remove(); }
        const myIcon = L.divIcon({className:'', html:`<div style="width:16px;height:16px;background:#3b82f6;border:3px solid #fff;border-radius:50%;box-shadow:0 0 12px rgba(59,130,246,0.8)"></div>`});
        STATE.myLocationMarker = L.marker([lat, lng], {icon:myIcon}).addTo(map).bindPopup('Mi ubicación (en vivo)');
      }, () => {}, {enableHighAccuracy:true, maximumAge:5000});
    }

    // Bikers en tiempo real
    renderBikerLiveLocations(map);

  } else {
    // === MODO VISTA GENERAL (todas las rutas) ===
    STATE.routes.forEach(r => {
      if (r.start_lat && r.start_lng) {
        L.circleMarker([r.start_lat, r.start_lng], {
          radius: 8, fillColor: '#00d4ff', color: '#a855f7', weight: 2, opacity: 1, fillOpacity: 0.8
        }).addTo(map).on('click', () => selectRoute(r.id));
      }
      try {
        const stops = JSON.parse(r.stops || '[]');
        stops.forEach((s, i) => {
          if (s.lat && s.lng) {
            L.circleMarker([s.lat, s.lng], {
              radius: 7, fillColor: '#ffaa00', color: '#ff8800', weight: 2, opacity: 1, fillOpacity: 0.8
            }).addTo(map);
          }
        });
      } catch(e) {}
      if (r.end_lat && r.end_lng) {
        L.circleMarker([r.end_lat, r.end_lng], {
          radius: 8, fillColor: '#00e676', color: '#00c853', weight: 2, opacity: 1, fillOpacity: 0.8
        }).addTo(map).on('click', () => selectRoute(r.id));
      }
    });

    // Ubicación del usuario en vista general
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        const {latitude:lat, longitude:lng} = pos.coords;
        map.setView([lat, lng], 12);
        const myIcon = L.divIcon({className:'', html:`<div style="width:14px;height:14px;background:#3b82f6;border:2px solid #fff;border-radius:50%;box-shadow:0 0 10px rgba(59,130,246,0.7)"></div>`});
        L.marker([lat, lng], {icon:myIcon}).addTo(map).bindPopup('Mi ubicación');
      }, () => {}, {timeout:5000});
    }

    const points = [];
    STATE.routes.forEach(r => {
      if (r.start_lat && r.start_lng) points.push([r.start_lat, r.start_lng]);
      if (r.end_lat && r.end_lng) points.push([r.end_lat, r.end_lng]);
    });
    if (points.length > 0) map.fitBounds(points, {padding: [30, 30]});
  }
}

function renderBikerLiveLocations(map) {
  // Muestra todos los bikers activos con ubicación en tiempo real
  // Cada biker comparte su ubicacion en STATE.users (lat/lng en tiempo real simulado)
  STATE.users.forEach(u => {
    if (!u.id || u.id === STATE.user?.id) return;
    if (!u.latitude || !u.longitude) return;
    const icon = L.divIcon({
      className:'',
      html:`<div style="width:18px;height:18px;background:${avatarColor(u.id)};border:2px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;color:#fff;box-shadow:0 0 8px rgba(0,0,0,0.5)">${initials(u.username)}</div>`
    });
    if (!STATE.bikerMarkers[u.id]) {
      STATE.bikerMarkers[u.id] = L.marker([u.latitude, u.longitude], {icon}).addTo(map).bindPopup(`🏍️ ${u.username}`);
    }
  });
}

function selectRoute(id) {
  const r = STATE.routes.find(x => x.id === id);
  if (!r) return;
  STATE.selectedRoute = r;
  RIDE_SUBTAB = 'detalle';
  renderRutas();
}

function navigateToRoute(id) {
  STATE.selectedRoute = STATE.routes.find(x => x.id === id) || null;
  navigate('rutas');
}

function showRouteTab(tab) {
  const routes = tab === 'creadas'
    ? STATE.routes.filter(r => r.created_by === STATE.user?.id)
    : STATE.routes;
  document.getElementById('rutas-list').innerHTML = routes.length === 0
    ? '<div class="empty-state"><div class="empty-icon">🗺️</div><div>Sin rutas</div></div>'
    : routes.map(r => renderRouteCard(r)).join('');
}

function renderRouteCard(r, vencida) {
  const creator = STATE.users.find(u => u.id === r.created_by);
  const isOwner = r.created_by === STATE.user?.id;
  const km = routeDistanceKm(r);
  const difficultyColors = { facil: '#22c55e', media: '#f59e0b', dificil: '#ef4444', epica: '#9c27b0' };
  const diffColor = difficultyColors[r.difficulty] || '#888';
  const cardStyle = vencida ? 'cursor:pointer;position:relative;opacity:0.45;filter:grayscale(0.7)' : 'cursor:pointer;position:relative;background:linear-gradient(135deg,rgba(255,255,255,0.07),rgba(255,150,40,0.06));border:1px solid rgba(255,170,60,0.3)';
  const isAdmin = !!(STATE.user && STATE.user.is_admin);
  return `
    <div class="card vanish route-card" style="${cardStyle};user-select:none" onclick="selectRoute(${r.id})"
      onmousedown="_startLp(${r.id},event)" onmouseup="_cancelLp()" onmouseleave="_cancelLp()" onmousemove="_moveLp()"
      ontouchstart="_startLp(${r.id},event)" ontouchend="_cancelLp()" ontouchmove="_moveLp()">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
        <div style="flex:1;min-width:0">
          <div class="card-title">${escHtml(r.name)}</div>
          <div class="card-sub">${escHtml(r.start_name || 'Sin origen')} → ${escHtml(r.end_name || 'Sin destino')}</div>
          <div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap;align-items:center">
            <span class="badge" style="background:${diffColor}22;color:${diffColor};border:1px solid ${diffColor}44">⚡ ${r.difficulty}</span>
            ${km > 0 ? `<span class="badge" style="background:rgba(0,212,255,0.1);color:#00d4ff;border:1px solid rgba(0,212,255,0.2)">📏 ${km}km</span>` : ''}
            ${r.date ? `<span class="badge" style="background:rgba(255,68,68,0.1);color:#ff6666;border:1px solid rgba(255,68,68,0.2)">📅 ${(() => { try { const d=new Date(r.date+'T00:00');return d.toLocaleDateString('es-ES',{day:'numeric',month:'short'}); } catch(e){return r.date;} })()}${r.time ? ' 🕐' : ''}</span>` : ''}
            <span class="badge">🏍️ ${creator ? escHtml(creator.username) : '?'}</span>
            ${isOwner ? '<span class="badge badge-green">Tu ruta</span>' : ''}
          </div>
          ${(isAdmin||isOwner) ? `<div style="margin-top:8px;font-size:10px;color:var(--text3)">Mantén presionado para editar o eliminar</div>` : ''}
        </div>
        <!-- Botones acción -->
        <div style="display:flex;flex-direction:column;gap:7px;flex-shrink:0;width:100px;position:relative;z-index:3" onclick="event.stopPropagation()" onmousedown="event.stopPropagation()" ontouchstart="event.stopPropagation()">
          <button onclick="event.stopPropagation();openRouteInNav(${r.id})" title="Seguir en Waze o Maps"
            style="width:100%;padding:9px 6px;border-radius:14px;font-size:12px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:5px;background:linear-gradient(135deg,#00d4ff,#0ea5e9);border:2px solid rgba(0,212,255,0.6);color:#fff;box-shadow:0 0 12px rgba(0,212,255,0.4),0 0 24px rgba(0,212,255,0.15);text-shadow:0 0 6px rgba(0,212,255,0.8)">
            🧭 Seguir
          </button>
          ${(isAdmin||isOwner) ? `
          <button onclick="event.stopPropagation();openRidePayList(${r.id})" title="Lista de pagos"
            style="width:100%;padding:9px 6px;border-radius:14px;font-size:12px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:5px;background:rgba(16,185,129,0.12);border:2px solid #10b981;color:#34d399;box-shadow:0 0 14px rgba(16,185,129,0.5),0 0 28px rgba(16,185,129,0.2);text-shadow:0 0 8px #34d399;transition:box-shadow 0.2s"
            onmouseenter="this.style.boxShadow='0 0 22px rgba(16,185,129,0.8),0 0 44px rgba(16,185,129,0.35)'"
            onmouseleave="this.style.boxShadow='0 0 14px rgba(16,185,129,0.5),0 0 28px rgba(16,185,129,0.2)'">
            💵 Pagos
          </button>` : ''}
        </div>
      </div>
    </div>
  `;
}

function setRouteDifficulty(d) {
  // No-op (filter UI removed). Kept for backwards compatibility.
  renderRutas();
}
function setRouteMaxKm(v) {
  // No-op (filter UI removed). Kept for backwards compatibility.
  const list = document.getElementById('rutas-list');
  if (list) {
    const sourceList = (routeSubTab === 'nuevas' ? STATE.routes : STATE.routes.filter(r => r.created_by === STATE.user?.id));
    if (sourceList.length > 0) list.innerHTML = sourceList.map(r => renderRouteCard(r)).join('');
    if (sourceList.length === 0) list.innerHTML = `<div class="empty-state"><div class="empty-icon">🗺️</div><div>No hay rutas todavia</div><button class="btn btn-primary" style="margin-top:12px" onclick="createRoute()">Crear primera ruta</button></div>`;
    else if (filtered.length === 0) list.innerHTML = `<div class="empty-state"><div class="empty-icon">🔍</div><div>Sin resultados</div><div style="font-size:12px;color:var(--text2);margin-top:6px">Ajusta los filtros para ver más rutas</div></div>`;
    else list.innerHTML = filtered.map(r => renderRouteCard(r)).join('');
  }
  // Update km label
  const labels = document.querySelectorAll('[data-rangefilter-km]');
  labels.forEach(l => l.textContent = `${routeFilter.maxKm}km`);
}

function editRoute(id) {
  const r = STATE.routes.find(x => x.id === id);
  if (!r || (r.created_by !== STATE.user?.id && !STATE.user?.is_admin)) return;

  let stops = [];
  try { stops = JSON.parse(r.stops || '[]'); } catch(e) {}

  let stopsHtml = '';
  stops.forEach((s, i) => {
    stopsHtml += `<div id="edit-stop-${i}" style="padding:10px;background:var(--surface2);border-radius:var(--radius-sm);margin-bottom:8px;position:relative;border:1px solid var(--border)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <span style="font-size:12px;font-weight:800;color:#ff9d33;text-shadow:0 0 6px rgba(255,136,0,0.4)">PARADA ${i+1}</span>
        <button onclick="this.closest('#edit-stop-${i}').remove()" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:13px;padding:0">✕</button>
      </div>
      <div style="position:relative;margin-bottom:6px">
        <input class="input" id="es-name-${i}" value="${escHtml(s.name)}" placeholder="Buscar lugar..." style="margin-bottom:0;padding-right:36px">
        <span style="position:absolute;right:10px;top:50%;transform:translateY(-50%);font-size:13px;pointer-events:none;color:var(--accent)">🔍</span>
      </div>
      <div id="es-name-${i}-dropdown" style="position:absolute;left:0;right:0;top:100%;background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);z-index:9999;max-height:180px;overflow-y:auto;box-shadow:0 8px 24px rgba(0,0,0,0.4);display:none"></div>
      <div class="coord-row">
        <input class="input" id="es-lat-${i}" value="${s.lat}" placeholder="Lat" type="text" inputmode="decimal" style="flex:1" readonly>
        <input class="input" id="es-lng-${i}" value="${s.lng}" placeholder="Lng" type="text" inputmode="decimal" style="flex:1" readonly>
      </div>
    </div>`;
  });

  openModal('<span style="color:#ff5555;text-shadow:0 0 12px rgba(255,68,68,0.6);font-weight:800">✏️ Editar Ruta</span>', `
    <input class="input" id="ert-name" value="${escHtml(r.name)}" placeholder="Nombre de la ruta" style="margin-bottom:12px">
    <input class="input" id="ert-desc" value="${escHtml(r.description || '')}" placeholder="Descripcion (opcional)" style="margin-bottom:16px">

    <!-- SALIDA -->
    <div style="background:rgba(34,197,94,0.06);border:1.5px solid rgba(34,197,94,0.4);border-radius:14px;padding:12px;margin-bottom:12px;box-shadow:0 0 14px rgba(34,197,94,0.12)">
      <div style="font-size:13px;font-weight:800;color:#22c55e;text-shadow:0 0 8px rgba(34,197,94,0.5);margin-bottom:8px;display:flex;align-items:center;gap:6px">
        <span style="width:10px;height:10px;border-radius:50%;background:#22c55e;box-shadow:0 0 8px #22c55e;display:inline-block"></span> SALIDA
        <button onclick="useMyLocation('ert-start')" title="Usar mi ubicacion" style="margin-left:auto;padding:3px 10px;background:rgba(34,197,94,0.12);border:1px solid rgba(34,197,94,0.35);border-radius:20px;font-size:10px;color:#22c55e;cursor:pointer;font-weight:700">📍 Mi ubicacion</button>
      </div>
      <div style="position:relative;margin-bottom:8px">
        <input class="input" id="ert-start-name" value="${escHtml(r.start_name || '')}" placeholder="Buscar gasolinera, mall, lugar..." style="margin-bottom:0;padding-right:36px;border-color:rgba(34,197,94,0.3);background:rgba(34,197,94,0.04)">
        <span style="position:absolute;right:12px;top:50%;transform:translateY(-50%);font-size:14px;pointer-events:none;color:#22c55e">🔍</span>
      </div>
      <div id="ert-start-name-dropdown" style="position:absolute;left:0;right:0;top:100%;background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);z-index:9999;max-height:200px;overflow-y:auto;box-shadow:0 8px 24px rgba(0,0,0,0.4);display:none"></div>
      <div class="coord-row">
        <input class="input" id="ert-start-lat" value="${r.start_lat}" placeholder="Latitud" type="text" inputmode="decimal" style="flex:1;border-color:rgba(34,197,94,0.2);background:rgba(34,197,94,0.04);font-size:11px;color:rgba(34,197,94,0.8)" readonly>
        <input class="input" id="ert-start-lng" value="${r.start_lng}" placeholder="Longitud" type="text" inputmode="decimal" style="flex:1;border-color:rgba(34,197,94,0.2);background:rgba(34,197,94,0.04);font-size:11px;color:rgba(34,197,94,0.8)" readonly>
        <button class="btn btn-ghost" style="padding:0 8px;flex:0;font-size:11px;color:#22c55e" onclick="clearPlace('ert-start')">✕</button>
      </div>
    </div>

    <!-- DESTINO -->
    <div style="background:rgba(239,68,68,0.06);border:1.5px solid rgba(239,68,68,0.4);border-radius:14px;padding:12px;margin-bottom:12px;box-shadow:0 0 14px rgba(239,68,68,0.12)">
      <div style="font-size:13px;font-weight:800;color:#ff5a5a;text-shadow:0 0 8px rgba(239,68,68,0.5);margin-bottom:8px;display:flex;align-items:center;gap:6px">
        <span style="width:10px;height:10px;border-radius:50%;background:#ef4444;box-shadow:0 0 8px #ef4444;display:inline-block"></span> DESTINO
        <button onclick="useMyLocation('ert-end')" title="Usar mi ubicacion" style="margin-left:auto;padding:3px 10px;background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.35);border-radius:20px;font-size:10px;color:#ff5a5a;cursor:pointer;font-weight:700">📍 Mi ubicacion</button>
      </div>
      <div style="position:relative;margin-bottom:8px">
        <input class="input" id="ert-end-name" value="${escHtml(r.end_name || '')}" placeholder="Buscar gasolinera, mall, lugar..." style="margin-bottom:0;padding-right:36px;border-color:rgba(239,68,68,0.3);background:rgba(239,68,68,0.04)">
        <span style="position:absolute;right:12px;top:50%;transform:translateY(-50%);font-size:14px;pointer-events:none;color:#ff5a5a">🔍</span>
      </div>
      <div id="ert-end-name-dropdown" style="position:absolute;left:0;right:0;top:100%;background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);z-index:9999;max-height:200px;overflow-y:auto;box-shadow:0 8px 24px rgba(0,0,0,0.4);display:none"></div>
      <div class="coord-row">
        <input class="input" id="ert-end-lat" value="${r.end_lat}" placeholder="Latitud" type="text" inputmode="decimal" style="flex:1;border-color:rgba(239,68,68,0.2);background:rgba(239,68,68,0.04);font-size:11px;color:rgba(255,90,90,0.8)" readonly>
        <input class="input" id="ert-end-lng" value="${r.end_lng}" placeholder="Longitud" type="text" inputmode="decimal" style="flex:1;border-color:rgba(239,68,68,0.2);background:rgba(239,68,68,0.04);font-size:11px;color:rgba(255,90,90,0.8)" readonly>
        <button class="btn btn-ghost" style="padding:0 8px;flex:0;font-size:11px;color:#ff5a5a" onclick="clearPlace('ert-end')">✕</button>
      </div>
    </div>

    <!-- PARADAS -->
    <div style="background:rgba(255,157,51,0.06);border:1.5px solid rgba(255,157,51,0.4);border-radius:14px;padding:12px;margin-bottom:12px;box-shadow:0 0 14px rgba(255,157,51,0.1)">
      <div style="font-size:13px;font-weight:800;color:#ff9d33;text-shadow:0 0 8px rgba(255,136,0,0.5);margin-bottom:8px;display:flex;align-items:center;gap:6px">
        <span style="width:10px;height:10px;border-radius:50%;background:#ff9d33;box-shadow:0 0 8px #ff9d33;display:inline-block"></span> PARADAS
      </div>
      <div id="ert-stops-container">${stopsHtml}</div>
      <button class="btn btn-ghost" style="width:100%;font-size:12px;border-color:rgba(255,157,51,0.3);color:#ff9d33" onclick="addEditStopField()">+ Agregar parada</button>
    </div>

    <select class="input" id="ert-diff" style="margin-bottom:12px">
      <option value="facil" ${r.difficulty==='facil'?'selected':''}>Facil</option>
      <option value="intermedia" ${r.difficulty==='intermedia'?'selected':''}>Intermedia</option>
      <option value="alta" ${r.difficulty==='alta'?'selected':''}>Alta</option>
    </select>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
      <input class="input" type="date" id="ert-date" value="${r.date || ''}" style="font-size:13px">
      <input class="input" type="time" id="ert-time" value="${r.time || ''}" style="font-size:13px">
    </div>

    <label style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--surface2);border:1px solid var(--border);border-radius:10px;margin-bottom:16px;cursor:pointer">
      <input type="checkbox" id="ert-notify" ${r.notify ? 'checked' : ''} style="width:18px;height:18px;accent-color:#ff4444;cursor:pointer">
      <div>
        <div style="font-size:13px;font-weight:600">🔔 Notificacion</div>
        <div style="font-size:11px;color:var(--text3)">Recordatorio 1 hora antes de la salida</div>
      </div>
    </label>

    <button class="btn btn-primary" style="width:100%" onclick="doEditRoute(${r.id})">Guardar cambios</button>
  `);

  stopCounter = stops.length;
  setTimeout(() => {
    setupModalPlaceSearch('ert-start');
    setupModalPlaceSearch('ert-end');
    stops.forEach((s, i) => setupEditStopPlaceSearch(i));
  }, 100);
}

function setupEditStopPlaceSearch(idx) {
  const nameInput = document.getElementById('es-name-' + idx);
  const dropdown = document.getElementById('es-name-' + idx + '-dropdown');
  const latInput = document.getElementById('es-lat-' + idx);
  const lngInput = document.getElementById('es-lng-' + idx);
  if (!nameInput || !dropdown) return;

  let timeout = null;
  nameInput.addEventListener('input', function() {
    clearTimeout(timeout);
    const val = this.value.trim();
    if (val.length < 2) { dropdown.style.display = 'none'; return; }
    timeout = setTimeout(async () => {
      const { local, panamaPOIs, online } = await searchPlaces(val);
      const seen = new Set();
      const merged = [...local, ...panamaPOIs, ...online].filter(p => {
        const key = p.lat.toFixed(4) + ',' + p.lng.toFixed(4);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }).slice(0, 8);
      showPlaceResults(dropdown, merged, { nameInput, latInput, lngInput, onSelect: () => toast('Guardado en EVA Lube 📍') });
    }, 100);
  });
  nameInput.addEventListener('blur', () => setTimeout(() => dropdown.style.display = 'none', 200));
}

function addEditStopField(lat, lng, name) {
  stopCounter++;
  const id = 'editstop-' + stopCounter;
  const container = document.getElementById('ert-stops-container');
  if (!container) return;
  const div = document.createElement('div');
  div.id = id;
  div.style.cssText = 'padding:10px;background:var(--surface2);border-radius:var(--radius-sm);margin-bottom:8px;position:relative;border:1px solid var(--border)';
  div.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
      <span style="font-size:11px;font-weight:700;color:var(--text2)">PARADA</span>
      <button onclick="this.closest('#${id}').remove()" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:13px;padding:0">✕</button>
    </div>
    <div style="position:relative;margin-bottom:6px">
      <input class="input" id="${id}-name" placeholder="Buscar lugar..." value="${name ? escHtml(name) : ''}" style="margin-bottom:0;padding-right:36px">
      <span style="position:absolute;right:10px;top:50%;transform:translateY(-50%);font-size:13px;pointer-events:none;color:var(--accent)">🔍</span>
    </div>
    <div id="${id}-name-dropdown" style="position:absolute;left:0;right:0;top:100%;background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);z-index:9999;max-height:180px;overflow-y:auto;box-shadow:0 8px 24px rgba(0,0,0,0.4);display:none"></div>
    <div class="coord-row">
      <input class="input" id="${id}-lat" placeholder="Lat" type="text" inputmode="decimal" style="flex:1" value="${lat ? lat.toFixed(6) : ''}" readonly>
      <input class="input" id="${id}-lng" placeholder="Lng" type="text" inputmode="decimal" style="flex:1" value="${lng ? lng.toFixed(6) : ''}" readonly>
    </div>`;
  container.appendChild(div);
  setTimeout(() => setupEditstopPlaceSearch(id), 100);
}

function setupEditstopPlaceSearch(stopId) {
  const nameInput = document.getElementById(stopId + '-name');
  const dropdown = document.getElementById(stopId + '-name-dropdown');
  const latInput = document.getElementById(stopId + '-lat');
  const lngInput = document.getElementById(stopId + '-lng');
  if (!nameInput || !dropdown) return;

  let timeout = null;
  nameInput.addEventListener('input', function() {
    clearTimeout(timeout);
    const val = this.value.trim();
    if (val.length < 2) { dropdown.style.display = 'none'; return; }
    timeout = setTimeout(async () => {
      const { local, panamaPOIs, online } = await searchPlaces(val);
      const seen = new Set();
      const merged = [...local, ...panamaPOIs, ...online].filter(p => {
        const key = p.lat.toFixed(4) + ',' + p.lng.toFixed(4);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }).slice(0, 8);
      showPlaceResults(dropdown, merged, { nameInput, latInput, lngInput, onSelect: () => toast('Guardado en EVA Lube 📍') });
    }, 100);
  });
  nameInput.addEventListener('blur', () => setTimeout(() => dropdown.style.display = 'none', 200));
}

async function doEditRoute(id) {
  const name = document.getElementById('ert-name').value.trim();
  const desc = document.getElementById('ert-desc').value.trim();
  const startName = document.getElementById('ert-start-name').value.trim();
  const startLat = parseFloat(document.getElementById('ert-start-lat').value) || 0;
  const startLng = parseFloat(document.getElementById('ert-start-lng').value) || 0;
  const endName = document.getElementById('ert-end-name').value.trim();
  const endLat = parseFloat(document.getElementById('ert-end-lat').value) || 0;
  const endLng = parseFloat(document.getElementById('ert-end-lng').value) || 0;
  const diff = document.getElementById('ert-diff').value;
  const date = document.getElementById('ert-date').value;
  const time = document.getElementById('ert-time').value;
  const notify = document.getElementById('ert-notify').checked;

  if (!name) { toast('El nombre es obligatorio'); return; }
  if (!startLat || !startLng) { toast('Busca y selecciona un punto de SALIDA'); return; }
  if (!endLat || !endLng) { toast('Busca y selecciona un punto de DESTINO'); return; }

  const stops = [];
  // Stops from edit-stop-N fields
  document.querySelectorAll('[id^="edit-stop-"]').forEach(function(el) {
    const idx = el.id.replace('edit-stop-', '');
    const stopName = document.getElementById('es-name-' + idx);
    const stopLat = document.getElementById('es-lat-' + idx);
    const stopLng = document.getElementById('es-lng-' + idx);
    if (stopName && stopLat && stopLng && stopName.value.trim() && stopLat.value && stopLng.value) {
      stops.push({name: stopName.value.trim(), lat: parseFloat(stopLat.value), lng: parseFloat(stopLng.value)});
    }
  });
  // Stops from editstop-N fields
  document.querySelectorAll('[id^="editstop-"][id$="-name"]').forEach(function(el) {
    var stopId = el.id.replace('-name', '');
    var stopLat = document.getElementById(stopId + '-lat');
    var stopLng = document.getElementById(stopId + '-lng');
    if (el.value.trim() && stopLat && stopLng && stopLat.value && stopLng.value) {
      stops.push({name: el.value.trim(), lat: parseFloat(stopLat.value), lng: parseFloat(stopLng.value)});
    }
  });

  if (!name) { toast('El nombre es obligatorio'); return; }
  const idx = STATE.routes.findIndex(x => x.id === id);
  if (idx === -1) return;

  STATE.routes[idx] = {
    ...STATE.routes[idx],
    name,
    description: desc,
    start_lat: startLat,
    start_lng: startLng,
    start_name: startName,
    end_lat: endLat,
    end_lng: endLng,
    end_name: endName,
    difficulty: diff,
    date: date || null,
    time: time || null,
    notify: notify,
    stops: JSON.stringify(stops)
  };

  saveLocal();
  closeModal();
  STATE.selectedRoute = STATE.routes[idx];
  renderRutas();
  toast('Ruta actualizada!');
  const savedRoute = STATE.routes[idx];
  if (notify && savedRoute) scheduleRouteReminder(savedRoute);
  else if (!notify) cancelRouteReminder(savedRoute.id);
  // Guardar directo en la nube (EC2), igual que al crear
  const ok = await _ec2Push();
  if (!ok) toast('⚠️ No se pudo guardar en la nube, se reintentará automáticamente');
}

function createRoute() {
  if (!STATE.user?.is_admin) { toast('Solo administradores pueden crear rutas'); return; }
  // Preload POIs if not loaded yet
  if (!PANAMA_POIS.length) loadPanamaPOIs();
  // Pre-fill from saved POI state
  const s = _routePOI.start || {};
  const e = _routePOI.end || {};
  const startDisplay = s.lat ? 'block' : 'none';
  const startBtnDisplay = s.lat ? 'none' : 'flex';
  const endDisplay = e.lat ? 'block' : 'none';
  const endBtnDisplay = e.lat ? 'none' : 'flex';
  openModal('Nueva Ruta', `
    <div style="margin-bottom:12px">
      <span style="font-size:11px;color:var(--text3)">📍 Usa el mapa para marcar cada punto: salida, destino y paradas</span>
    </div>

    <input class="input" id="rt-name" placeholder="Nombre de la ruta (ej: Ruta del lunes)" style="margin-bottom:10px">
    <input class="input" id="rt-desc" placeholder="Descripcion (opcional)" style="margin-bottom:12px">

    <div style="font-size:12px;font-weight:700;color:#ff6666;margin-bottom:6px;display:flex;align-items:center;gap:6px">
      <span>🚦</span> SALIDA
      <button onclick="useMyLocation('rt-start')" title="Usar mi ubicacion" style="margin-left:auto;padding:2px 8px;background:rgba(255,32,32,0.1);border:1px solid rgba(255,32,32,0.3);border-radius:20px;font-size:10px;color:#ff6666;cursor:pointer">📍 Mi ubicacion</button>
    </div>
    <div id="rt-start-selected" style="display:${startDisplay};padding:8px 12px;background:var(--card);border:1px solid var(--border);border-radius:var(--radius-sm);margin-bottom:6px;font-size:13px;align-items:center;gap:8px">
      <span id="rt-start-selected-name" style="flex:1;color:var(--text);font-weight:600">${s.name || ''}</span>
      <button style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:14px;padding:0" onclick="clearPlace('rt-start')">✕</button>
    </div>
    <button id="rt-start-map-btn" style="width:100%;margin-bottom:8px;text-align:center;padding:12px;font-size:13px;font-weight:700;border:1px solid #22c55e;border-radius:var(--radius-sm);background:rgba(34,197,94,0.15);color:#22c55e;cursor:pointer;transition:all 0.2s;display:${startBtnDisplay}"
      onmouseover="this.style.background='rgba(34,197,94,0.3)'"
      onmouseout="this.style.background='rgba(34,197,94,0.15)'"
      onclick="openRouteMapPicker()">
      🗺️ Buscar SALIDA en el mapa
    </button>
    <div class="coord-row" style="margin-bottom:16px">
      <input class="input" id="rt-start-lat" placeholder="Latitud" type="text" inputmode="decimal" style="flex:1" value="${s.lat ? s.lat.toFixed(6) : ''}" readonly>
      <input class="input" id="rt-start-lng" placeholder="Longitud" type="text" inputmode="decimal" style="flex:1" value="${s.lng ? s.lng.toFixed(6) : ''}" readonly>
      <button class="btn btn-ghost" style="padding:0 8px;flex:0;font-size:11px;color:var(--text3)" onclick="clearPlace('rt-start')" title="Limpiar">✕</button>
    </div>

    <div style="font-size:12px;font-weight:700;color:#ff6666;margin-bottom:6px;display:flex;align-items:center;gap:6px">
      <span>🛑</span> DESTINO
      <button onclick="useMyLocation('rt-end')" title="Usar mi ubicacion" style="margin-left:auto;padding:2px 8px;background:rgba(255,32,32,0.1);border:1px solid rgba(255,32,32,0.3);border-radius:20px;font-size:10px;color:#ff6666;cursor:pointer">📍 Mi ubicacion</button>
    </div>
    <div id="rt-end-selected" style="display:${endDisplay};padding:8px 12px;background:var(--card);border:1px solid var(--border);border-radius:var(--radius-sm);margin-bottom:6px;font-size:13px;align-items:center;gap:8px">
      <span id="rt-end-selected-name" style="flex:1;color:var(--text);font-weight:600">${e.name || ''}</span>
      <button style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:14px;padding:0" onclick="clearPlace('rt-end')">✕</button>
    </div>
    <button id="rt-end-map-btn" style="width:100%;margin-bottom:8px;text-align:center;padding:12px;font-size:13px;font-weight:700;border:1px solid #ef4444;border-radius:var(--radius-sm);background:rgba(239,68,68,0.15);color:#ff6b6b;cursor:pointer;transition:all 0.2s;display:${endBtnDisplay}"
      onmouseover="this.style.background='rgba(239,68,68,0.3)'"
      onmouseout="this.style.background='rgba(239,68,68,0.15)'"
      onclick="openRouteMapPicker()">
      🗺️ Buscar DESTINO en el mapa
    </button>
    <div class="coord-row" style="margin-bottom:16px">
      <input class="input" id="rt-end-lat" placeholder="Latitud" type="text" inputmode="decimal" style="flex:1" value="${e.lat ? e.lat.toFixed(6) : ''}" readonly>
      <input class="input" id="rt-end-lng" placeholder="Longitud" type="text" inputmode="decimal" style="flex:1" value="${e.lng ? e.lng.toFixed(6) : ''}" readonly>
      <button class="btn btn-ghost" style="padding:0 8px;flex:0;font-size:11px;color:var(--text3)" onclick="clearPlace('rt-end')" title="Limpiar">✕</button>
    </div>

    <div style="font-size:12px;font-weight:700;color:#ff6666;margin-bottom:6px;display:flex;align-items:center;gap:6px">
      <span>🛑</span> PARADAS (opcional)
    </div>
    <div id="rt-stops-container" style="margin-bottom:6px"></div>
    <button style="width:100%;font-size:13px;font-weight:700;margin-bottom:16px;padding:12px;text-align:center;border:1px solid #ff8800;border-radius:var(--radius-sm);background:rgba(255,136,0,0.15);color:#ff9d33;cursor:pointer;transition:all 0.2s" onmouseover="this.style.background='rgba(255,136,0,0.3)'" onmouseout="this.style.background='rgba(255,136,0,0.15)'" onclick="addStopField()">➕ Agregar PARADA en el mapa</button>

    <select class="input" id="rt-diff" style="margin-bottom:12px">
      <option value="facil">Facil</option>
      <option value="intermedia" selected>Intermedia</option>
      <option value="alta">Alta</option>
    </select>

    <div style="font-size:12px;font-weight:700;color:#ff6666;margin-bottom:6px;display:flex;align-items:center;gap:6px">
      <span>📅</span> SALIDA
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
      <input class="input" type="date" id="rt-date" style="font-size:13px">
      <input class="input" type="time" id="rt-time" style="font-size:13px" placeholder="Hora de salida">
    </div>

    <label style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--surface2);border:1px solid var(--border);border-radius:10px;margin-bottom:16px;cursor:pointer">
      <input type="checkbox" id="rt-notify" style="width:18px;height:18px;accent-color:#ff4444;cursor:pointer">
      <div>
        <div style="font-size:13px;font-weight:600">🔔 Notificacion</div>
        <div style="font-size:11px;color:var(--text3)">Te recuerdo 1 hora antes de la salida</div>
      </div>
    </label>

    <button class="btn btn-primary" style="width:100%" onclick="doCreateRoute()">Crear ruta</button>

    <div style="margin-top:12px;padding:10px;background:var(--surface2);border-radius:8px;font-size:11px;color:var(--text3);line-height:1.6">
      📍 <b>3,048 lugares de Panamá</b> disponibles en el mapa. Haz clic en <b>Buscar en el mapa</b> para ver gasolineras, talleres, restaurantes y más.
    </div>
  `);

  // POI Picker system — no more text search, map-based instead
}

// ─── POI MAP PICKER ────────────────────────────────────
var _poiPickTarget = null;
var _poiMarkers = null;

function clearPlace(prefix) {
  // Clear from state so form re-renders without this POI
  if (prefix === 'rt-start') _routePOI.start = null;
  else if (prefix === 'rt-end') _routePOI.end = null;
  // Reopen modal to reflect cleared state
  createRoute();
}

function useMyLocation(prefix) {
  if (!navigator.geolocation) {
    toast('Geolocalizacion no disponible en este navegador');
    return;
  }
  toast('Obteniendo ubicacion...');
  navigator.geolocation.getCurrentPosition(
    async pos => {
      const { latitude: lat, longitude: lng } = pos.coords;
      document.getElementById(prefix + '-lat').value = lat.toFixed(6);
      document.getElementById(prefix + '-lng').value = lng.toFixed(6);
      // Also set in _routePOI so POI picker knows
      if (prefix === 'rt-start') { _routePOI.start = { lat, lng }; }
      else if (prefix === 'rt-end') { _routePOI.end = { lat, lng }; }
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, {
          headers: { 'Accept-Language': 'es' }
        });
        const data = await res.json();
        let name = data.address?.road || data.address?.neighbourhood || data.address?.suburb || data.address?.city || data.address?.town || 'Mi ubicacion';
        document.getElementById(prefix + '-name').value = name;
        toast('Ubicacion: ' + name);
      } catch(e) {
        document.getElementById(prefix + '-name').value = 'Mi ubicacion';
        toast('Ubicacion detectada');
      }
    },
    err => { toast('Sin acceso a ubicacion'); },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

function useMyLocationBoth() {
  if (!navigator.geolocation) {
    toast('Geolocalizacion no disponible');
    return;
  }
  toast('Obteniendo ubicacion...');
  navigator.geolocation.getCurrentPosition(
    async pos => {
      const { latitude: lat, longitude: lng } = pos.coords;
      // Fill SALIDA
      document.getElementById('rt-start-lat').value = lat.toFixed(6);
      document.getElementById('rt-start-lng').value = lng.toFixed(6);
      // Fill DESTINO
      document.getElementById('rt-end-lat').value = lat.toFixed(6);
      document.getElementById('rt-end-lng').value = lng.toFixed(6);
      _routePOI.start = { lat, lng };
      _routePOI.end   = { lat, lng };
      // Reverse geocode
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`, {
          headers: { 'Accept-Language': 'es' }
        });
        const data = await res.json();
        const name = data.address?.road || data.address?.neighbourhood || data.address?.suburb || data.address?.city || data.address?.town || 'Mi ubicacion';
        const nameEl = document.getElementById('rt-start-selected-name');
        if (nameEl) nameEl.textContent = name;
        toast('✅ Salida y destino configurados: ' + name);
      } catch(e) {
        toast('✅ Salida y destino configurados');
      }
    },
    err => { toast('Sin acceso a ubicacion'); },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

function startPOIPicker(target) {
  _poiPickTarget = target;
  
  // Close modal completely to free the map
  closeModal();
  
  // Show floating picker bar with search
  var bar = document.createElement('div');
  bar.id = 'poi-picker-bar';
  bar.style.cssText = 'position:fixed;top:10px;left:50%;transform:translateX(-50%);z-index:99999;background:var(--surface, #1a1a2e);border:1px solid var(--accent);border-radius:12px;padding:10px 16px;display:flex;align-items:center;gap:8px;box-shadow:0 4px 20px rgba(255,68,68,0.3);font-size:13px;color:var(--text);flex-wrap:wrap;max-width:95vw';
  bar.innerHTML = '<span style="font-size:16px">📍</span> <b>' + (target === 'start' ? 'SALIDA' : 'DESTINO') + '</b>' +
    '<input id="poi-map-search" type="text" placeholder="🔍 Buscar por nombre..." style="flex:1;min-width:180px;background:var(--card);border:1px solid var(--border);color:var(--text);padding:6px 10px;border-radius:6px;font-size:12px;outline:none" autocomplete="off" oninput="window._handlePOISearch(this.value)">' +
    '<button onclick="cancelPOIPicker()" style="background:var(--card);border:1px solid var(--border);color:var(--text2);padding:6px 12px;border-radius:6px;cursor:pointer;font-size:11px;white-space:nowrap">✕ Cancelar</button>';
  document.body.appendChild(bar);
  
  // Search filter — globally accessible via oninput attribute
  var _searchTimeout = null;
  window._handlePOISearch = function(q) {
    clearTimeout(_searchTimeout);
    var original = (q || '').trim();
    q = original.toLowerCase();
    _searchTimeout = setTimeout(function() {
      // Detectar coordenadas raw tipo "8.993, -79.519"
      var coords = parseRawCoords(original);
      if (coords) {
        if (STATE.map) {
          STATE.map.setView([coords.lat, coords.lng], 16);
          if (window._coordTempMarker) {
            try { STATE.map.removeLayer(window._coordTempMarker); } catch(e) {}
            window._coordTempMarker = null;
          }
          var tLabel = _poiPickTarget === 'start' ? 'SALIDA' : 'DESTINO';
          window._coordTempMarker = L.circleMarker([coords.lat, coords.lng], {
            radius: 10, fillColor: '#ff4444', color: '#fff', weight: 2.5, fillOpacity: 1
          }).addTo(STATE.map);
          window._coordTempMarker.bindPopup(
            '<div style="min-width:180px;font-size:12px">' +
            '<div style="font-weight:700;margin-bottom:8px">📍 ' + coords.lat.toFixed(5) + ', ' + coords.lng.toFixed(5) + '</div>' +
            '<button id="_coord-confirm-btn" style="width:100%;background:#ff4444;color:#fff;border:none;padding:8px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600">✅ Confirmar como ' + tLabel + '</button>' +
            '</div>'
          ).openPopup();
          setTimeout(function() {
            var btn = document.getElementById('_coord-confirm-btn');
            if (btn) btn.onclick = function() {
              var name = prompt('Nombre del lugar:') || '';
              if (window._coordTempMarker) {
                try { STATE.map.removeLayer(window._coordTempMarker); } catch(e) {}
                window._coordTempMarker = null;
              }
              selectPOIFromMap(coords.lat, coords.lng, name || (coords.lat.toFixed(4) + ', ' + coords.lng.toFixed(4)));
            };
          }, 100);
        }
        renderPOIs([]);
        return;
      }
      var norm = function(s) { return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); };
      var nq = norm(q);
      var pois = PANAMA_POIS || [];
      if (q.length >= 2) {
        pois = pois.filter(function(p) {
          return norm(p.name).indexOf(nq) !== -1 ||
                 norm(p.subcategory).indexOf(nq) !== -1 ||
                 norm(p.category).indexOf(nq) !== -1 ||
                 norm(p.address).indexOf(nq) !== -1;
        });
      }
      renderPOIs(pois);
    }, 100);
  };
  
  // Load POIs onto map
  loadPOIsToMap();
  
  // Color-code by category for circle markers (mismos colores que la capa del picker)
  function catColor(cat) {
    return _poiCatColor(cat);
  }

  // Show POIs
  function loadPOIsToMap() {
    if (!STATE.map) return;
    if (_poiMarkers) { STATE.map.removeLayer(_poiMarkers); }

    var pois = PANAMA_POIS || [];
    if (pois.length === 0) {
      // Try loading
      loadPanamaPOIs()
        .then(() => { if (PANAMA_POIS.length) renderPOIs(PANAMA_POIS); else toast('No se pudo cargar la base de datos'); })
        .catch(() => toast('No se pudo cargar la base de datos'));
      return;
    }
    renderPOIs(pois);
  }
  
  function renderPOIs(pois) {
    // Remove old markers first to avoid stacking
    if (_poiMarkers) { STATE.map.removeLayer(_poiMarkers); _poiMarkers = null; }
    _poiMarkers = L.featureGroup();
    
    // Store POI data globally for popup onclick access
    window._poiDataMap = {};
    
    pois.forEach(function(p, idx) {
      var icon = p.icon || '📍';
      var color = catColor(p.category);
      var marker = L.circleMarker([p.lat, p.lng], {
        radius: 6,
        fillColor: color,
        color: '#fff',
        weight: 1.5,
        fillOpacity: 0.85
      });
      
      var poiId = 'poi-' + idx;
      window._poiDataMap[poiId] = p;
      
      var targetLabel = _poiPickTarget === 'start' ? 'SALIDA' : 'DESTINO';
      var altLabel = _poiPickTarget === 'start' ? 'DESTINO' : 'SALIDA';
      
      var popupHtml = '<div style="min-width:180px;font-size:12px">' +
        '<div style="font-size:14px;font-weight:700;margin-bottom:4px">' + icon + ' ' + escHtml(p.name || 'Lugar') + '</div>' +
        '<div style="color:var(--text2);margin-bottom:2px">' + escHtml(p.subcategory || p.category || '') + '</div>' +
        (p.address ? '<div style="color:var(--text3);font-size:11px;margin-bottom:6px">' + escHtml(p.address) + '</div>' : '') +
        '<div style="display:flex;gap:6px;margin-top:6px">' +
          '<button data-poi-id="' + poiId + '" data-action="pick" style="flex:1;background:var(--accent);color:#fff;border:none;padding:6px 8px;border-radius:6px;cursor:pointer;font-size:11px;font-weight:600">✅ ' + targetLabel + '</button>' +
          '<button data-poi-id="' + poiId + '" data-action="alt" style="flex:1;background:var(--card);border:1px solid var(--border);color:var(--text2);padding:6px 8px;border-radius:6px;cursor:pointer;font-size:11px">' + altLabel + '</button>' +
        '</div>' +
      '</div>';
      
      marker.bindPopup(popupHtml, {maxWidth: 280});
      marker.bindTooltip(icon + ' ' + (p.name || 'Lugar'), {direction:'top', offset:[0,-8], opacity:1, className: 'poi-tooltip'});
      // Larger markers for easier tapping
      marker.setRadius(8);
      _poiMarkers.addLayer(marker);
    });
    
    STATE.map.addLayer(_poiMarkers);
    
    // Delegate click events from popup buttons (remove old listener first)
    STATE.map.off('popupopen');
    STATE.map.on('popupopen', function(e) {
      setTimeout(function() {
        document.querySelectorAll('[data-poi-id][data-action]').forEach(function(btn) {
          btn.onclick = function() {
            var poiId = this.getAttribute('data-poi-id');
            var action = this.getAttribute('data-action');
            var p = window._poiDataMap[poiId];
            if (!p) return;
            if (action === 'pick') {
              selectPOIFromMap(p.lat, p.lng, p.name);
            } else {
              selectPOIFromMapAlt(p.lat, p.lng, p.name);
            }
          };
        });
      }, 50);
    });
    
    // Fit map to show all markers
    try {
      var bounds = _poiMarkers.getBounds();
      STATE.map.fitBounds(bounds, {padding: [30,30], maxZoom: 16});
    } catch(e) {}
    
    toast(pois.length + ' lugares en el mapa — haz clic en un marcador para seleccionar');
  }
}

function selectPOIFromMap(lat, lng, name) {
  fillPOIFields(_poiPickTarget, lat, lng, name);
  // Reopen the route creation modal so user can continue
  createRoute();
}

function selectPOIFromMapAlt(lat, lng, name) {
  // Select for the OTHER target (SALIDA↔DESTINO)
  var alt = _poiPickTarget === 'start' ? 'end' : 'start';
  fillPOIFields(alt, lat, lng, name);
  // Reopen the route creation modal so user can continue
  createRoute();
}

function fillPOIFields(target, lat, lng, name) {
  // Store in state so it survives modal recreation
  _routePOI[target] = { lat: lat, lng: lng, name: name || 'Lugar seleccionado' };
  // Save to local places
  savePlace({name: name, lat: lat, lng: lng, isOnline: false});
  // Close the POI picker
  cancelPOIPicker();
  toast('✅ ' + name + ' → ' + (target === 'start' ? 'SALIDA' : 'DESTINO'));
  // Reopen modal with pre-filled values
  createRoute();
}

function cancelPOIPicker() {
  _poiPickTarget = null;
  
  // Remove floating bar
  var bar = document.getElementById('poi-picker-bar');
  if (bar) bar.remove();
  
  // Remove POI layer from map
  if (_poiMarkers && STATE.map) {
    STATE.map.removeLayer(_poiMarkers);
    _poiMarkers = null;
  }
  if (window._coordTempMarker && STATE.map) {
    try { STATE.map.removeLayer(window._coordTempMarker); } catch(e) {}
    window._coordTempMarker = null;
  }
  
  // Re-open modal
  document.getElementById('modal').classList.add('open');
  
  // If this was the SALIDA picker and nothing was selected, re-show both map buttons
  ['start', 'end'].forEach(function(t) {
    var sel = document.getElementById('rt-' + t + '-selected');
    if (sel && sel.style.display === 'none') {
      var btn = document.getElementById('rt-' + t + '-map-btn');
      if (btn) btn.style.display = '';
    }
  });
}

function setupModalPlaceSearch(prefix) {
  const nameInput = document.getElementById(prefix + '-name');
  const dropdown = document.getElementById(prefix + '-name-dropdown');
  const latInput = document.getElementById(prefix + '-lat');
  const lngInput = document.getElementById(prefix + '-lng');
  if (!nameInput || !dropdown) return;

  let timeout = null;
  nameInput.addEventListener('input', function() {
    clearTimeout(timeout);
    const val = this.value.trim();
    if (val.length < 2) { dropdown.style.display = 'none'; return; }
    // Detectar coordenadas raw tipo "8.993, -79.519"
    const coords = parseRawCoords(val);
    if (coords) {
      dropdown.innerHTML = '';
      const item = document.createElement('div');
      item.style.cssText = 'padding:10px 12px;cursor:pointer;font-size:12px;display:flex;align-items:center;gap:8px';
      item.innerHTML = '<span style="font-size:16px">📍</span><div><div style="font-weight:600">Usar estas coordenadas</div><div style="color:var(--text3);font-size:10px">' + coords.lat.toFixed(5) + ', ' + coords.lng.toFixed(5) + ' — luego escribe el nombre</div></div>';
      item.addEventListener('mouseover', () => item.style.background = 'var(--surface3)');
      item.addEventListener('mouseout', () => item.style.background = '');
      item.addEventListener('mousedown', ev => {
        ev.preventDefault();
        if (latInput) latInput.value = coords.lat.toFixed(6);
        if (lngInput) lngInput.value = coords.lng.toFixed(6);
        nameInput.value = '';
        nameInput.placeholder = 'Escribe el nombre del lugar...';
        dropdown.style.display = 'none';
        nameInput.focus();
      });
      dropdown.appendChild(item);
      dropdown.style.display = 'block';
      return;
    }
    timeout = setTimeout(async () => {
      const { local, panamaPOIs, online } = await searchPlaces(val);
      const seen = new Set();
      const merged = [...local, ...panamaPOIs, ...online].filter(p => {
        const key = p.lat.toFixed(4) + ',' + p.lng.toFixed(4);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }).slice(0, 8);
      showPlaceResults(dropdown, merged, {
        nameInput, latInput, lngInput,
        onSelect: p => toast(p.isOnline ? 'Guardado en EVA Lube 📍' : 'Lugar seleccionado')
      });
    }, 100);
  });
  nameInput.addEventListener('blur', () => setTimeout(() => dropdown.style.display = 'none', 200));
}

function openGmapsFor(type) {
  let name = '';
  if (type === 'start') name = document.getElementById('rt-start-name').value.trim() || 'Panama';
  else if (type === 'end') name = document.getElementById('rt-end-name').value.trim() || 'Panama';
  else if (type === 'ert-start') name = document.getElementById('ert-start-name').value.trim() || 'Panama';
  else if (type === 'ert-end') name = document.getElementById('ert-end-name').value.trim() || 'Panama';
  else name = document.getElementById('rt-start-name').value.trim() || 'Panama';
  window.open('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(name), '_blank');
  toast('Busca en Google Maps y pega el enlace aqui');
}

function parseRawCoords(text) {
  const m = (text || '').trim().match(/^(-?\d{1,3}(?:\.\d+)?)[,\s]+(-?\d{1,3}(?:\.\d+)?)$/);
  if (!m) return null;
  const lat = parseFloat(m[1]), lng = parseFloat(m[2]);
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

function parseGmapsUrl(url) {
  // Handle various Google Maps URL formats
  // Format 1: @lat,lng,z - direct coordinates
  // Format 2: /place/Name/@lat,lng - place with coordinates
  // Format 3: ?query=lat,lng - search query
  // Format 4: !3dlocation=lat,lng!4d - data coordinates
  const patterns = [
    /@(-?\d+\.?\d*),(-?\d+\.?\d*)/,
    /!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/,
    /query=(-?\d+\.?\d*)%2C(-?\d+\.?\d*)/,
    /\?q=(-?\d+\.?\d*),(-?\d+\.?\d*)/,
    /\/place\/[^\/]+\/(-?\d+\.?\d*),(-?\d+\.?\d*)/
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
  }
  return null;
}

// Auto-parse on paste into coord fields (create & edit)
document.addEventListener('paste', function(e) {
  setTimeout(function() {
    ['rt-start', 'rt-end', 'ert-start', 'ert-end'].forEach(function(prefix) {
      const latEl = document.getElementById(prefix + '-lat');
      const lngEl = document.getElementById(prefix + '-lng');
      if (!latEl || !lngEl) return;
      const latVal = latEl.value.trim();
      if (latVal.includes('google.com') || latVal.includes('maps')) {
        const coords = parseGmapsUrl(latVal);
        if (coords) {
          latEl.value = coords.lat;
          lngEl.value = coords.lng;
          toast('Coordenadas extraídas: ' + coords.lat.toFixed(5) + ', ' + coords.lng.toFixed(5));
        }
      }
    });
    // Edit stop fields
    document.querySelectorAll('[id^="editstop-"][id$="-lat"]').forEach(function(latEl) {
      const val = latEl.value.trim();
      if (val.includes('google.com') || val.includes('maps')) {
        const coords = parseGmapsUrl(val);
        if (coords) {
          latEl.value = coords.lat;
          const lngEl = document.getElementById(latEl.id.replace('-lat', '-lng'));
          if (lngEl) lngEl.value = coords.lng;
          toast('Coordenadas extraídas!');
        }
      }
    });
  }, 100);
});

let stopCounter = 0;
function addStopField(lat, lng, name) {
  stopCounter++;
  const id = 'stop-' + stopCounter;
  const container = document.getElementById('rt-stops-container');
  const div = document.createElement('div');
  div.id = id;
  div.style.cssText = 'padding:10px;background:var(--surface2);border-radius:var(--radius-sm);margin-bottom:8px;position:relative;border:1px solid var(--border)';
  div.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
      <span style="font-size:12px;font-weight:800;color:#ff9d33;text-shadow:0 0 6px rgba(255,136,0,0.4)">PARADA ${stopCounter}</span>
      <button onclick="this.closest('#${id}').remove()" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:13px;padding:0">✕</button>
    </div>
    <div style="position:relative;margin-bottom:6px">
      <input class="input" id="${id}-name" placeholder="Buscar lugar..." value="${name ? escHtml(name) : ''}" style="margin-bottom:0;padding-right:36px">
      <span style="position:absolute;right:10px;top:50%;transform:translateY(-50%);font-size:13px;pointer-events:none;color:var(--accent)">🔍</span>
    </div>
    <div id="${id}-name-dropdown" style="position:absolute;left:0;right:0;top:100%;background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);z-index:9999;max-height:180px;overflow-y:auto;box-shadow:0 8px 24px rgba(0,0,0,0.4);display:none"></div>
    <div class="coord-row">
      <input class="input" id="${id}-lat" placeholder="Lat" type="text" inputmode="decimal" style="flex:1" value="${lat ? lat.toFixed(6) : ''}" readonly>
      <input class="input" id="${id}-lng" placeholder="Lng" type="text" inputmode="decimal" style="flex:1" value="${lng ? lng.toFixed(6) : ''}" readonly>
    </div>`;
  container.appendChild(div);
  // Setup autocomplete for this stop
  setTimeout(() => setupStopPlaceSearch(id), 100);
}

function setupStopPlaceSearch(stopId) {
  const nameInput = document.getElementById(stopId + '-name');
  const dropdown = document.getElementById(stopId + '-name-dropdown');
  const latInput = document.getElementById(stopId + '-lat');
  const lngInput = document.getElementById(stopId + '-lng');
  if (!nameInput || !dropdown) return;

  let timeout = null;
  nameInput.addEventListener('input', function() {
    clearTimeout(timeout);
    const val = this.value.trim();
    if (val.length < 2) { dropdown.style.display = 'none'; return; }
    timeout = setTimeout(async () => {
      const { local, panamaPOIs, online } = await searchPlaces(val);
      const seen = new Set();
      const merged = [...local, ...panamaPOIs, ...online].filter(p => {
        const key = p.lat.toFixed(4) + ',' + p.lng.toFixed(4);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }).slice(0, 8);
      showPlaceResults(dropdown, merged, { nameInput, latInput, lngInput, onSelect: () => toast('Guardado en EVA Lube 📍') });
    }, 100);
  });
  nameInput.addEventListener('blur', () => setTimeout(() => dropdown.style.display = 'none', 200));
}

function openGmapsStop(stopId) {
  const name = document.getElementById(stopId + '-name').value.trim() || 'Panama';
  window.open('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(name), '_blank');
  toast('Busca en Google Maps, luego comparte y pega el enlace aqui');
}



// ============================================================
// PUSH a todos los bikers (servidor /notify -> FCM topic "bikers")
// El servidor valida por Origin + rate-limit; no se expone ninguna credencial.
// ============================================================
function bsNotifyAll(title, body, kind) {
  try {
    fetch('/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title,
        body: (body || '').slice(0, 200),
        kind: kind || 'evento'
      })
    }).catch(function () {});
  } catch (e) {}
}

// Notificación PERSONAL local (medalla / subir de nivel) — vía puente nativo.
// No-op en navegador normal; solo actúa dentro de la app Android.
function bsNotifyMe(title, body) {
  try {
    if (window.BikerNative && window.BikerNative.notify) {
      window.BikerNative.notify(title, body || '');
    }
  } catch (e) {}
}

async function doCreateRoute() {
  const name = document.getElementById('rt-name').value.trim();
  const desc = document.getElementById('rt-desc').value.trim();
  // POI picker now stores names in selected-name spans
  const startNameEl = document.getElementById('rt-start-selected-name');
  const endNameEl = document.getElementById('rt-end-selected-name');
  const startName = startNameEl ? startNameEl.textContent.trim() : '';
  const endName = endNameEl ? endNameEl.textContent.trim() : '';
  const startLat = parseFloat(document.getElementById('rt-start-lat').value) || 0;
  const startLng = parseFloat(document.getElementById('rt-start-lng').value) || 0;
  const endLat = parseFloat(document.getElementById('rt-end-lat').value) || 0;
  const endLng = parseFloat(document.getElementById('rt-end-lng').value) || 0;
  const diff = document.getElementById('rt-diff').value;
  const date = document.getElementById('rt-date').value;
  const time = document.getElementById('rt-time').value;
  const notify = document.getElementById('rt-notify').checked;

  // Collect stops
  const stops = [];
  document.querySelectorAll('[id^="stop-"][id$="-name"]').forEach(function(el) {
    var stopId = el.id.replace('-name', '');
    var stopLat = parseFloat(document.getElementById(stopId + '-lat').value) || 0;
    var stopLng = parseFloat(document.getElementById(stopId + '-lng').value) || 0;
    if (el.value.trim() && stopLat && stopLng) {
      stops.push({name: el.value.trim(), lat: stopLat, lng: stopLng});
    }
  });

  if (!name) { toast('El nombre es obligatorio'); return; }
  if (!startLat || !startLng) { toast('Busca y selecciona un punto de SALIDA'); return; }
  if (!endLat || !endLng) { toast('Busca y selecciona un punto de DESTINO'); return; }
  const route = {
    id: Date.now() * 1000 + Math.floor(Math.random() * 1000),
    name,
    description: desc,
    start_lat: startLat,
    start_lng: startLng,
    start_name: startName,
    end_lat: endLat,
    end_lng: endLng,
    end_name: endName,
    difficulty: diff,
    date: date || null,
    time: time || null,
    notify: notify,
    stops: JSON.stringify(stops),
    created_by: STATE.user.id,
    created_at: new Date().toISOString().slice(0,19).replace('T',' ')
  };
  STATE.routes.push(route);
  saveLocal();
  closeModal();
  STATE.selectedRoute = route;
  renderRutas();
  toast('Ruta creada!');
  if (notify) scheduleRouteReminder(route);
  bsNotifyAll('🏍️ Nueva ruta: ' + name,
    'Salida: ' + (startName || 'ver detalles') + (date ? (' · ' + date + (time ? ' ' + time : '')) : ''),
    'ruta');
  // Guardar directo en la base de datos de la nube (EC2) — rápido, sin esperar
  // el sync completo de HeyValue (que sube 14 tablas y puede demorar mucho).
  const ok = await _ec2Push();
  if (!ok) toast('⚠️ No se pudo guardar en la nube, se reintentará automáticamente');
}

async function deleteRoute(id) {
  const _r = STATE.routes.find(x => x.id === id);
  if (_r && _r.created_by !== STATE.user?.id && !STATE.user?.is_admin) { toast('Solo administradores pueden eliminar'); return; }
  if (!confirm('¿Eliminar esta ruta?')) return;
  // Mark as deleted to block cloud sync from restoring it
  STATE._deletedRouteIds = STATE._deletedRouteIds || [];
  STATE._deletedRouteIds.push(id);
  ls('_deletedRoutes', STATE._deletedRouteIds);
  // Delete from IndexedDB if exists
  if (DB) { try { await idbDelete('routes', id); } catch(e) {} }
  // Remove from STATE
  STATE.routes = STATE.routes.filter(r => r.id !== id);
  STATE.selectedRoute = null;
  // Save local immediately
  ls('bs_routes', STATE.routes);
  // Push a la nube (EC2) inmediatamente para que no vuelva a aparecer en otros
  // dispositivos — EC2 es la base autoritativa de rutas, no HeyValue.
  const ok = await _ec2Push();
  if (ok) {
    STATE._deletedRouteIds = STATE._deletedRouteIds.filter(i => i !== id);
    ls('_deletedRoutes', STATE._deletedRouteIds);
  }
  renderPage(STATE.currentPage || 'rutas');
  toast('Ruta eliminada');
}

