// ============================================================
// EVENTOS PAGE
// ============================================================
function renderEventos() {
  const upcoming = STATE.events.filter(e => e.status === 'activo');
  const past = STATE.events.filter(e => e.status !== 'activo');

  document.getElementById('page-eventos').innerHTML = `
    <div style="margin-bottom:16px;display:flex;justify-content:space-between;align-items:center">
      <div style="font-size:18px;font-weight:800">Eventos</div>
      ${STATE.user?.is_admin ? `<button class="btn btn-primary" style="padding:8px 16px;font-size:12px" onclick="createEvent()">+ Crear evento</button>` : ''}
    </div>

    <div class="tab-bar">
      <button class="tab ${past.length === 0 ? 'active' : ''}" onclick="showEventTab('proximos',this)">Proximos (${upcoming.length})</button>
      <button class="tab" onclick="showEventTab('pasados',this)">Pasados (${past.length})</button>
    </div>

    <div id="eventos-list">
      ${upcoming.length === 0 ? `
        <div class="empty-state">
          <div class="empty-icon">📅</div>
          <div>No hay eventos proximos</div>
          ${STATE.user?.is_admin ? `<button class="btn btn-primary" style="margin-top:12px" onclick="createEvent()">Crear evento</button>` : ''}
        </div>
      ` : upcoming.map(ev => renderEventCard(ev)).join('')}
    </div>
  `;
}

function showEventTab(tab, btn) {
  document.querySelectorAll('.tab-bar .tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  const list = tab === 'proximos' ? STATE.events.filter(e => e.status === 'activo') : STATE.events.filter(e => e.status !== 'activo');
  document.getElementById('eventos-list').innerHTML = list.length === 0
    ? '<div class="empty-state"><div class="empty-icon">📅</div><div>Sin eventos</div></div>'
    : list.map(ev => renderEventCard(ev)).join('');
}

function renderEventCard(ev) {
  const attCount = STATE.attendance.filter(a => a.event_id === ev.id).length;
  const myAtt = STATE.user && STATE.attendance.find(a => a.event_id === ev.id && a.user_id === STATE.user.id);
  // Countdown to event
  let countdown = '';
  try {
    const eventDate = new Date(ev.date + 'T' + (ev.time || '00:00'));
    const diff = eventDate - new Date();
    if (diff > 0) {
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      if (days > 0) countdown = `${days}d ${hours}h`;
      else if (hours > 0) countdown = `${hours}h ${mins}m`;
      else countdown = `${mins}m`;
    } else {
      const passed = Math.abs(diff);
      const days = Math.floor(passed / 86400000);
      countdown = days > 0 ? `Hace ${days}d` : 'Pasado';
    }
  } catch(e) {}

  // Gradient based on difficulty
  const diffGradients = {
    facil: 'linear-gradient(135deg,rgba(34,197,94,0.3),rgba(16,185,129,0.15))',
    intermedia: 'linear-gradient(135deg,rgba(245,158,11,0.3),rgba(255,68,68,0.15))',
    alta: 'linear-gradient(135deg,rgba(239,68,68,0.3),rgba(220,38,38,0.15))',
    epica: 'linear-gradient(135deg,rgba(156,39,176,0.3),rgba(67,56,202,0.15))',
  };
  const gradient = diffGradients[ev.difficulty] || 'linear-gradient(135deg,rgba(255,68,68,0.3),rgba(255,136,0,0.15))';

  return `
    <div class="event-card vanish" onclick="viewEvent(${ev.id})" style="overflow:hidden;cursor:pointer;border-radius:16px;border:1px solid var(--border);background:var(--surface);margin-bottom:12px;transition:transform 0.2s" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'">
      <div style="height:120px;background:${gradient};display:flex;align-items:center;justify-content:space-between;padding:16px;position:relative">
        <div style="font-size:48px;filter:drop-shadow(0 4px 8px rgba(0,0,0,0.3))">🏍️</div>
        <div style="text-align:right">
          <div style="background:rgba(0,0,0,0.5);backdrop-filter:blur(8px);color:#fff;padding:6px 12px;border-radius:20px;font-size:13px;font-weight:800">${countdown}</div>
        </div>
      </div>
      <div style="padding:14px 16px">
        <div style="font-size:11px;color:var(--accent);font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">${ev.date} · ${ev.time}</div>
        <div style="font-size:16px;font-weight:800;margin-bottom:8px;line-height:1.3">${escHtml(ev.title)}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;font-size:12px;color:var(--text2);margin-bottom:10px">
          <span>📍 ${escHtml(ev.location || 'N/A')}</span>
          <span>⚡ ${ev.difficulty}</span>
          <span>👥 ${attCount}</span>
        </div>
        <div style="display:flex;align-items:center;gap:6px">
          ${myAtt
            ? '<span class="badge-green" style="font-size:11px;padding:4px 10px">✅ Confirmado</span>'
            : `<button onclick="event.stopPropagation();confirmEvent(${ev.id})" style="flex:1;padding:8px 14px;background:linear-gradient(135deg,#ff4444,#ff8800);border:none;border-radius:10px;color:#fff;font-size:12px;font-weight:700;cursor:pointer;transition:all 0.2s" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='none'">+ Confirmar asistencia</button>`}
          <button onclick="event.stopPropagation();viewEvent(${ev.id})" style="padding:8px 12px;background:var(--surface2);border:1px solid var(--border);border-radius:10px;color:var(--text2);cursor:pointer;font-size:12px">👁️</button>
        </div>
      </div>
    </div>
  `;
}

function viewEvent(id) {
  const ev = STATE.events.find(x => x.id === id);
  if (!ev) return;
  const attCount = STATE.attendance.filter(a => a.event_id === ev.id).length;
  const attList = STATE.attendance.filter(a => a.event_id === ev.id).map(a => STATE.users.find(u => u.id === a.user_id)).filter(Boolean);
  const myAtt = STATE.user && STATE.attendance.find(a => a.event_id === ev.id && a.user_id === STATE.user.id);
  // Reminder state
  const remKey = 'bs_event_rem_' + ev.id + '_' + (STATE.user ? STATE.user.id : '');
  const hasReminder = ls(remKey) ? true : false;

  openModal(ev.title, `
    <div style="font-size:13px;color:var(--text2);margin-bottom:16px">
      📅 ${ev.date} · 🕐 ${ev.time}<br>
      📍 ${ev.location || 'N/A'} · ⚡ ${ev.difficulty}
    </div>
    ${ev.description ? `<p style="margin-bottom:16px">${ev.description}</p>` : ''}
    <div style="margin-bottom:16px">
      <div style="font-size:13px;font-weight:700;color:var(--text2);margin-bottom:8px">ASISTENTES (${attCount})</div>
      ${attList.length === 0 ? '<div style="font-size:12px;color:var(--text3)">Nadie ha confirmado aun</div>' :
        attList.slice(0, 8).map(u => `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;font-size:13px">
          ${renderAvatar(u, 28)}
          <span>${u.username}</span>
          ${u.is_injured ? '<span class="badge-red" style="font-size:9px">LESIONADO</span>' : ''}
        </div>`).join('')}
      ${attList.length > 8 ? `<div style="font-size:11px;color:var(--text3);margin-top:4px">+${attList.length-8} más</div>` : ''}
    </div>
    ${myAtt
      ? '<button class="btn btn-secondary" style="width:100%" onclick="cancelEvent(' + ev.id + ')">Cancelar asistencia</button>'
      : '<button class="btn btn-primary" style="width:100%" onclick="confirmEvent(' + ev.id + ')">Confirmar asistencia</button>'}
    <div style="margin-top:10px;display:flex;gap:6px;align-items:center;background:rgba(0,212,255,0.05);border:1px solid rgba(0,212,255,0.15);border-radius:10px;padding:10px">
      <div style="font-size:18px">⏰</div>
      <div style="flex:1">
        <div style="font-size:12px;font-weight:700">Recordatorio</div>
        <div style="font-size:10px;color:var(--text2)">${hasReminder ? 'Activado · te avisaremos antes' : 'Recibe una notificacion antes del evento'}</div>
      </div>
      <button onclick="toggleEventReminder(${ev.id})" style="padding:6px 12px;background:${hasReminder ? 'rgba(255,68,68,0.15)' : 'var(--surface2)'};border:1px solid ${hasReminder ? 'rgba(255,68,68,0.3)' : 'var(--border)'};border-radius:8px;color:${hasReminder ? '#ff4444' : 'var(--text2)'};font-size:11px;font-weight:700;cursor:pointer">${hasReminder ? 'Quitar' : 'Activar'}</button>
    </div>
    ${STATE.user?.is_admin ? `<button class="btn btn-ghost" style="width:100%;margin-top:8px;color:var(--danger)" onclick="deleteEvent(${ev.id})">Eliminar evento</button>` : ''}
  `);
}

function confirmEvent(id) {
  if (!STATE.user) { toast('Inicia sesion'); return; }
  if (STATE.attendance.find(a => a.event_id === id && a.user_id === STATE.user.id)) {
    toast('Ya confirmaste'); return;
  }
  STATE.attendance.push({id:Date.now(), user_id:STATE.user.id, event_id:id, confirmed_at:new Date().toISOString(), notes:'', status:'confirmed', featured:false});
  saveState();
  closeModal();
  navigate('rutas');
  toast('Asistencia confirmada!');
}

function cancelEvent(id) {
  STATE.attendance = STATE.attendance.filter(a => !(a.event_id === id && a.user_id === STATE.user.id));
  saveState();
  closeModal();
  navigate('rutas');
  toast('Asistencia cancelada');
}

// Event reminder — set a localStorage flag, then a global setInterval checks every 60s
// and pushes a notification if the event is within 1h and the user has confirmed
function toggleEventReminder(eventId) {
  if (!STATE.user) { toast('Inicia sesion'); return; }
  const remKey = 'bs_event_rem_' + eventId + '_' + STATE.user.id;
  if (ls(remKey)) {
    ls(remKey, null);
    toast('Recordatorio desactivado');
  } else {
    ls(remKey, { eventId, userId: STATE.user.id, at: Date.now() });
    toast('Te avisaremos 1h antes del evento');
  }
  // Re-render modal
  viewEvent(eventId);
}

// Check events every 60s and push reminder notifications
setInterval(() => {
  if (!STATE.user) return;
  const now = Date.now();
  STATE.attendance.filter(a => a.user_id === STATE.user.id).forEach(a => {
    const ev = STATE.events.find(e => e.id === a.event_id);
    if (!ev) return;
    const remKey = 'bs_event_rem_' + ev.id + '_' + STATE.user.id;
    if (!ls(remKey)) return;
    const eventTime = new Date(ev.date + 'T' + (ev.time || '00:00')).getTime();
    const diff = eventTime - now;
    // Notify when 1h before (with 5min tolerance window)
    if (diff > 55*60*1000 && diff < 65*60*1000) {
      const notifId = 'reminder_' + ev.id;
      const existing = STATE.notifications.find(n => n.id === notifId);
      if (!existing) {
        STATE.notifications.unshift({
          id: notifId, user_id: STATE.user.id, type: 'event_reminder',
          message: `⏰ "${ev.title}" empieza en ~1 hora`,
          link: '/eventos', read: false, created_at: new Date().toISOString()
        });
        saveState();
        toast('⏰ ' + ev.title + ' empieza pronto!');
        if ('Notification' in window && Notification.permission === 'granted') {
          try { new Notification('Biker Society · Recordatorio', { body: ev.title + ' en ~1 hora', icon: 'icons/icon-192.png' }); } catch(e){}
        }
        ls(remKey, null); // consume reminder
      }
    }
  });
}, 60000);

// ── Alarm sound (Web Audio API, sin archivos externos) ──────────────────────
function playRouteAlarm() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const pattern = [880, 0, 1046, 0, 880, 0, 1318]; // notas: A5, silencio, C6...
    let t = ctx.currentTime;
    pattern.forEach(freq => {
      if (freq === 0) { t += 0.12; return; }
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.7, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.start(t);
      osc.stop(t + 0.35);
      t += 0.38;
    });
    // Repetir 3 veces
    setTimeout(playRouteAlarm._once = playRouteAlarm._once || (() => {}), 0);
  } catch(e) {}
}

function showAlarmScreen(routeId) {
  const r = STATE.routes.find(x => x.id == routeId);
  const name = r ? r.name : 'tu ruta';
  playRouteAlarm();
  // Repetir alarma 3 veces con intervalo
  let n = 0;
  const iv = setInterval(() => { if (++n < 3) playRouteAlarm(); else clearInterval(iv); }, 2500);
  navigator.vibrate && navigator.vibrate([500,200,500,200,800]);

  openModal('⏰ ¡Salida en 1 hora!', `
    <div style="text-align:center;padding:10px 0">
      <div style="font-size:48px;margin-bottom:8px;animation:pulse 1s infinite">🏍️</div>
      <div style="font-size:18px;font-weight:800;margin-bottom:6px">${escHtml(name)}</div>
      <div style="font-size:13px;color:var(--text2);margin-bottom:20px">Prepárate, la salida es en aproximadamente 1 hora.</div>
      <button class="btn btn-primary" style="width:100%;padding:14px;font-size:15px;font-weight:800" onclick="clearInterval(${iv});closeModal();">✅ Entendido</button>
    </div>
  `);
}

// Escuchar mensaje del SW cuando se toca la notificación
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', e => {
    if (e.data?.type === 'ALARM' && e.data?.routeId) {
      // Esperar a que el state esté cargado
      const check = setInterval(() => {
        if (STATE.routes && STATE.routes.length) {
          clearInterval(check);
          showAlarmScreen(e.data.routeId);
        }
      }, 300);
    }
  });
}

// Detectar apertura por URL ?alarm=routeId
(function() {
  const p = new URLSearchParams(location.search).get('alarm');
  if (p) {
    const check = setInterval(() => {
      if (STATE.routes && STATE.routes.length) {
        clearInterval(check);
        showAlarmScreen(p);
        history.replaceState({}, '', location.pathname);
      }
    }, 300);
  }
})();

// ── Route reminders ─────────────────────────────────────────────────────────
async function scheduleRouteReminder(route) {
  if (!route.date || !route.time) {
    toast('La ruta necesita fecha y hora para activar el recordatorio');
    return false;
  }
  const routeTime = new Date(route.date + 'T' + route.time).getTime();
  const notifyAt  = routeTime - 60 * 60 * 1000; // 1 hora antes
  if (notifyAt < Date.now()) {
    toast('La hora de salida ya pasó, no se puede programar recordatorio');
    return false;
  }

  // Pedir permiso de notificación
  if (!('Notification' in window)) {
    toast('Tu navegador no soporta notificaciones nativas');
    return false;
  }
  let perm = Notification.permission;
  if (perm === 'default') perm = await Notification.requestPermission();
  if (perm !== 'granted') {
    toast('Activa los permisos de notificación del navegador para recibir recordatorios');
    return false;
  }

  // Guardar en localStorage
  const key = 'bs_route_rem_' + route.id;
  ls(key, { routeId: route.id, routeName: route.name, notifyAt, routeTime });

  // APK nativo: usar AlarmManager (funciona aunque la app esté cerrada)
  if (window.BikerNative && window.BikerNative.scheduleAlarm) {
    window.BikerNative.scheduleAlarm(String(route.id), route.name, notifyAt);
  } else if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    // PWA: usar Service Worker
    navigator.serviceWorker.controller.postMessage({
      type: 'SCHEDULE_REMINDER', routeId: route.id, routeName: route.name, notifyAt
    });
  }

  const eta = new Date(notifyAt);
  const h = eta.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const d = eta.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
  toast('🔔 Recordatorio programado: ' + d + ' a las ' + h);
  return true;
}

function cancelRouteReminder(routeId) {
  ls('bs_route_rem_' + routeId, null);
  if (window.BikerNative && window.BikerNative.cancelAlarm) {
    window.BikerNative.cancelAlarm(String(routeId));
  } else if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'CANCEL_REMINDER', routeId });
  }
}

// Re-registrar recordatorios al cargar (por si el SW se reinició)
function reRegisterRouteReminders() {
  (STATE.routes || []).forEach(r => {
    if (!r.notify || !r.date || !r.time) return;
    const key = 'bs_route_rem_' + r.id;
    const saved = ls(key);
    if (!saved) return;
    if (saved.notifyAt < Date.now()) { ls(key, null); return; }
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SCHEDULE_REMINDER', routeId: r.id, routeName: r.name, notifyAt: saved.notifyAt
      });
    }
  });
}

// Chequeo cada 60s para disparar notificación si la app está abierta
setInterval(() => {
  if (!STATE.user) return;
  const now = Date.now();
  (STATE.routes || []).forEach(r => {
    if (!r.notify || !r.date || !r.time) return;
    const key = 'bs_route_rem_' + r.id;
    const saved = ls(key);
    if (!saved) return;
    const diff = saved.notifyAt - now;
    if (diff > -5 * 60 * 1000 && diff < 5 * 60 * 1000) { // ventana de 5 min
      ls(key, null); // consumir
      showAlarmScreen(r.id);
      if (Notification.permission === 'granted') {
        try {
          new Notification('🏍️ ¡Salida en 1 hora!', {
            body: r.name, icon: 'icons/icon-192.png',
            tag: 'route-reminder-' + r.id,
            vibrate: [500,200,500,200,800],
            requireInteraction: true,
            data: { routeId: r.id }
          });
        } catch(e) {}
      }
    }
  });
}, 60000);

function deleteEvent(id) {
  if (!confirm('Eliminar este evento?')) return;
  STATE.events = STATE.events.filter(e => e.id !== id);
  STATE.attendance = STATE.attendance.filter(a => a.event_id !== id);
  saveState();
  closeModal();
  navigate('rutas');
  toast('Evento eliminado');
}

function adminDeleteEvent(id) {
  const ev = STATE.events.find(e => e.id === id);
  if (!ev) return;
  if (!confirm(`Eliminar "${ev.title}"? Esta acción no se puede deshacer.`)) return;
  STATE.events = STATE.events.filter(e => e.id !== id);
  STATE.attendance = STATE.attendance.filter(a => a.event_id !== id);
  saveState();
  closeModal();
  renderAdminEvents();
  toast('Evento eliminado');
}

