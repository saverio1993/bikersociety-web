// ============================================================
// ADMIN RULETA DE RIFAS
// ============================================================
let RIFA = { spinning: false, angle: 0, animId: null, ctx: null, mode: 'normal', participants: [], eliminated: [], lastResult: null };
const RIFA_COLORS = ['#ff4444','#f97316','#eab308','#22c55e','#3b82f6','#a855f7','#ec4899','#14b8a6','#6366f1','#ef4444','#10b981','#f59e0b'];

function renderAdminRifa() {
  pushNav('admin-rifa', null, 'Ruleta de Rifas');
  RIFA.spinning = false;
  RIFA.angle = 0;
  RIFA.ctx = null;
  RIFA.participants = [];
  RIFA.eliminated = [];
  RIFA.lastResult = null;
  RIFA.mode = 'normal';
  if (RIFA.animId) { cancelAnimationFrame(RIFA.animId); RIFA.animId = null; }

  document.getElementById('page-admin').innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">
      <button onclick="popNav()" style="display:inline-flex;align-items:center;gap:5px;padding:7px 15px;background:var(--surface2);border:1.5px solid var(--accent);border-radius:10px;font-size:13px;font-weight:700;color:var(--accent);cursor:pointer;transition:all 0.15s" onmouseover="this.style.background='var(--accent)';this.style.color='#fff'" onmouseout="this.style.background='var(--surface2)';this.style.color='var(--accent)'">← Volver</button>
      <span style="font-size:18px;font-weight:800">🎡 Ruleta de Rifas</span>
    </div>

    <!-- MODO -->
    <div style="display:flex;gap:4px;margin-bottom:14px;background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:4px">
      <button id="btn-mode-normal" onclick="rifaSetMode('normal')" style="flex:1;padding:8px;border-radius:9px;font-size:12px;font-weight:700;border:none;cursor:pointer;background:var(--accent);color:#fff;transition:all .2s">🏆 Normal</button>
      <button id="btn-mode-elim"  onclick="rifaSetMode('elimination')" style="flex:1;padding:8px;border-radius:9px;font-size:12px;font-weight:700;border:none;cursor:pointer;background:transparent;color:var(--text2);transition:all .2s">⚡ Eliminación</button>
    </div>

    <!-- RUEDA -->
    <div style="text-align:center;margin-bottom:12px">
      <div style="position:relative;display:inline-block">
        <div style="position:absolute;top:-14px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:13px solid transparent;border-right:13px solid transparent;border-top:24px solid #ffd700;filter:drop-shadow(0 0 8px rgba(255,215,0,0.9));z-index:2"></div>
        <canvas id="rifa-canvas" width="300" height="300" style="display:block;border-radius:50%;box-shadow:0 0 30px rgba(255,68,68,0.3);max-width:calc(100vw - 80px);max-height:calc(100vw - 80px)"></canvas>
      </div>
    </div>

    <button id="rifa-spin-btn" onclick="spinRifa()" style="width:100%;background:linear-gradient(135deg,var(--accent),#f97316);color:#fff;border:none;border-radius:14px;padding:14px;font-size:15px;font-weight:800;cursor:pointer;margin-bottom:12px;letter-spacing:.5px;box-shadow:0 4px 20px rgba(255,68,68,0.4)">🎡 ¡GIRAR LA RULETA!</button>

    <div id="rifa-winner" style="margin-bottom:12px"></div>

    <!-- PARTICIPANTES -->
    <div style="background:var(--card);border:1px solid var(--border);border-radius:16px;padding:14px">
      <div style="font-size:11px;font-weight:700;color:var(--text2);letter-spacing:.5px;margin-bottom:10px">PARTICIPANTES · <span id="rifa-count">0</span></div>

      <div style="display:flex;gap:8px;margin-bottom:10px">
        <input id="rifa-input" class="input" placeholder="Nombre del participante…" style="flex:1;margin:0" onkeydown="if(event.key==='Enter')rifaAddParticipant()">
        <button onclick="rifaAddParticipant()" style="background:var(--accent);color:#fff;border:none;border-radius:10px;padding:0 14px;font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap">+ Agregar</button>
      </div>

      <div id="rifa-chips" style="display:flex;flex-wrap:wrap;gap:6px;min-height:28px;margin-bottom:10px"></div>

      <button onclick="rifaAddAllMembers()" style="width:100%;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:9px;font-size:12px;font-weight:600;cursor:pointer;color:var(--text1)">👥 Agregar todos los miembros</button>
    </div>
  `;

  setTimeout(() => {
    const canvas = document.getElementById('rifa-canvas');
    if (!canvas) return;
    RIFA.ctx = canvas.getContext('2d');
    rifaRenderChips();
    rifaRedraw();
    rifaBroadcast({ state: 'waiting', participants: [], mode: 'normal' });
  }, 50);
}

function rifaSetMode(mode) {
  RIFA.mode = mode;
  const btnN = document.getElementById('btn-mode-normal');
  const btnE = document.getElementById('btn-mode-elim');
  if (btnN) { btnN.style.background = mode === 'normal' ? 'var(--accent)' : 'transparent'; btnN.style.color = mode === 'normal' ? '#fff' : 'var(--text2)'; }
  if (btnE) { btnE.style.background = mode === 'elimination' ? '#ef4444' : 'transparent'; btnE.style.color = mode === 'elimination' ? '#fff' : 'var(--text2)'; }
  // Reset result display when switching mode
  const w = document.getElementById('rifa-winner'); if (w) w.innerHTML = '';
  RIFA.eliminated = [];
  rifaBroadcastDebounced({ state: 'waiting', participants: [...RIFA.participants], mode: RIFA.mode });
}

function rifaAddParticipant() {
  const input = document.getElementById('rifa-input');
  if (!input) return;
  const name = input.value.trim();
  if (!name) return;
  if (RIFA.participants.includes(name)) { toast('Ya está en la lista'); return; }
  RIFA.participants.push(name);
  input.value = '';
  rifaRenderChips();
  rifaRedraw();
  rifaBroadcastDebounced({ state: 'waiting', participants: [...RIFA.participants], mode: RIFA.mode });
}

function rifaRemoveParticipant(idx) {
  RIFA.participants.splice(idx, 1);
  rifaRenderChips();
  rifaRedraw();
  rifaBroadcastDebounced({ state: 'waiting', participants: [...RIFA.participants], mode: RIFA.mode });
}

function rifaAddAllMembers() {
  STATE.users.forEach(u => { if (!RIFA.participants.includes(u.username)) RIFA.participants.push(u.username); });
  rifaRenderChips();
  rifaRedraw();
  rifaBroadcastDebounced({ state: 'waiting', participants: [...RIFA.participants], mode: RIFA.mode });
}

function rifaRenderChips() {
  const el = document.getElementById('rifa-chips');
  const cnt = document.getElementById('rifa-count');
  if (cnt) cnt.textContent = RIFA.participants.length;
  if (!el) return;
  if (RIFA.participants.length === 0) {
    el.innerHTML = '<div style="font-size:12px;color:var(--text3);padding:4px 0">Sin participantes — escribe un nombre arriba</div>';
    return;
  }
  el.innerHTML = RIFA.participants.map((p, i) => {
    const color = RIFA_COLORS[i % RIFA_COLORS.length];
    return `
    <div style="display:inline-flex;align-items:center;gap:4px;padding:5px 6px 5px 12px;background:${color}22;border:1.5px solid ${color};border-radius:20px;font-size:12px;font-weight:700;color:#fff;box-shadow:0 0 8px ${color}55">
      <span style="text-shadow:0 0 6px ${color}">${p}</span>
      <button onclick="rifaRemoveParticipant(${i})" style="background:${color};border:none;color:#fff;cursor:pointer;font-size:13px;font-weight:900;width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;line-height:1;flex-shrink:0;box-shadow:0 0 6px ${color}" title="Quitar">×</button>
    </div>
  `}).join('');
}

function rifaRedraw() {
  const ctx = RIFA.ctx;
  if (!ctx) return;
  const canvas = ctx.canvas;
  if (!canvas || !canvas.isConnected) return;
  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H / 2, r = W / 2 - 4;
  const members = RIFA.participants;
  const n = members.length;

  ctx.clearRect(0, 0, W, H);

  if (n === 0) {
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 2*Math.PI);
    ctx.fillStyle = '#1a1a1a'; ctx.fill();
    ctx.fillStyle = '#555'; ctx.font = '13px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('Agrega participantes', cx, cy);
    return;
  }

  const arc = (2 * Math.PI) / n;
  for (let i = 0; i < n; i++) {
    const start = RIFA.angle + i * arc, end = start + arc;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, start, end); ctx.closePath();
    ctx.fillStyle = RIFA_COLORS[i % RIFA_COLORS.length]; ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(start + arc / 2);
    ctx.textAlign = 'right'; ctx.fillStyle = '#fff';
    ctx.font = `bold ${n > 10 ? 10 : 12}px sans-serif`;
    ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 4;
    const label = members[i].length > 11 ? members[i].substring(0, 10) + '…' : members[i];
    ctx.fillText(label, r - 10, 4);
    ctx.restore();
  }

  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 20);
  grad.addColorStop(0, '#666'); grad.addColorStop(1, '#111');
  ctx.beginPath(); ctx.arc(cx, cy, 20, 0, 2*Math.PI);
  ctx.fillStyle = grad; ctx.fill();
  ctx.strokeStyle = '#888'; ctx.lineWidth = 2; ctx.stroke();
}

function spinRifa() {
  if (RIFA.spinning) return;
  const members = RIFA.participants;
  if (members.length < 2) { toast('Necesitas al menos 2 participantes'); return; }

  RIFA.spinning = true;
  const btn = document.getElementById('rifa-spin-btn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Girando...'; }
  const winnerEl = document.getElementById('rifa-winner');
  if (winnerEl) winnerEl.innerHTML = '';

  const n = members.length;
  const arc = (2 * Math.PI) / n;
  const idx = Math.floor(Math.random() * n);
  const duration = 4500 + Math.random() * 1500;

  // Broadcast spinning state immediately, then result when winner is locked
  rifaBroadcast({ state: 'spinning', count: n, mode: RIFA.mode });
  setTimeout(() => rifaBroadcast({ state: 'result', name: members[idx], type: RIFA.mode === 'elimination' ? 'eliminated' : 'winner', mode: RIFA.mode, remaining: n - 1 }), duration - 500);

  const extraSpins = (5 + Math.random() * 3) * 2 * Math.PI;
  const base = -Math.PI / 2 - (idx * arc + arc / 2);
  const k = Math.ceil((RIFA.angle + extraSpins - base) / (2 * Math.PI));
  const finalAngle = base + k * 2 * Math.PI;
  const startAngle = RIFA.angle;
  const t0 = performance.now();

  function easeOut(t) { return 1 - Math.pow(1 - t, 3.5); }
  function frame(now) {
    const t = Math.min((now - t0) / duration, 1);
    RIFA.angle = startAngle + (finalAngle - startAngle) * easeOut(t);
    if (document.getElementById('rifa-canvas')) rifaRedraw();
    if (t < 1) {
      RIFA.animId = requestAnimationFrame(frame);
    } else {
      RIFA.angle = finalAngle;
      RIFA.spinning = false;
      RIFA.animId = null;
      if (btn) { btn.disabled = false; btn.textContent = '🎡 ¡GIRAR OTRA VEZ!'; }
      rifaShowResult(members[idx], [...members]);
    }
  }
  RIFA.animId = requestAnimationFrame(frame);
}

function rifaShowResult(name, snapshot) {
  const el = document.getElementById('rifa-winner');
  if (!el) return;
  RIFA.lastResult = name;
  const isElim = RIFA.mode === 'elimination';

  el.innerHTML = `
    <div style="background:var(--card);border:1px solid var(--border);border-radius:16px;padding:16px;text-align:center">
      <div style="font-size:11px;font-weight:700;color:var(--text2);letter-spacing:1px;margin-bottom:10px">${isElim ? '💀 ELIMINADO/A...' : '🥁 Y EL GANADOR ES...'}</div>
      <div id="rifa-drum" style="font-size:30px;font-weight:900;min-height:42px;color:var(--accent)"></div>
    </div>
  `;

  let step = 0, drumIdx = Math.floor(Math.random() * snapshot.length);
  const totalSteps = 28;

  function drumStep() {
    const display = document.getElementById('rifa-drum');
    if (!display) return;
    step++;
    if (step < totalSteps) {
      drumIdx = (drumIdx + 1) % snapshot.length;
      display.textContent = snapshot[drumIdx];
      display.style.animation = 'rifaDrumFlash 0.1s ease';
      setTimeout(() => { if (display) display.style.animation = ''; }, 100);
      setTimeout(drumStep, 40 + Math.pow(step / totalSteps, 2.2) * 380);
    } else {
      display.textContent = name;
      display.style.color = isElim ? '#ef4444' : '#ffd700';
      display.style.fontSize = '34px';
      display.style.textShadow = isElim ? '0 0 24px rgba(239,68,68,0.8)' : '0 0 24px rgba(255,215,0,0.8)';
      display.style.animation = 'rifaWinPop 0.5s cubic-bezier(.34,1.56,.64,1)';

      if (isElim) {
        // Remove from participants
        RIFA.participants = RIFA.participants.filter(p => p !== name);
        RIFA.eliminated.push(name);
        rifaRenderChips();
        rifaRedraw();
        rifaBroadcast({ state: 'result', name, type: 'eliminated', mode: 'elimination', remaining: RIFA.participants.length });

        if (RIFA.participants.length === 1) {
          // Last one standing = champion
          setTimeout(() => rifaChampion(RIFA.participants[0]), 600);
        } else {
          el.insertAdjacentHTML('beforeend', `
            <div style="border:1px solid rgba(239,68,68,0.4);border-radius:14px;padding:12px;text-align:center;margin-top:10px">
              <div style="font-size:14px;font-weight:700;color:#ef4444">💀 ${name} eliminado/a</div>
              <div style="font-size:11px;color:var(--text2);margin:4px 0 10px">Quedan <b>${RIFA.participants.length}</b> participantes</div>
              <button onclick="spinRifa()" style="background:linear-gradient(135deg,#ef4444,#f97316);color:#fff;border:none;border-radius:10px;padding:10px 20px;font-size:13px;font-weight:700;cursor:pointer">⚡ Siguiente eliminación</button>
            </div>
          `);
        }
      } else {
        el.insertAdjacentHTML('beforeend', `
          <div style="background:linear-gradient(135deg,rgba(255,215,0,0.12),rgba(255,68,68,0.08));border:1px solid rgba(255,215,0,0.4);border-radius:14px;padding:14px;text-align:center;margin-top:10px;animation:rifaWinPop 0.6s cubic-bezier(.34,1.56,.64,1)">
            <div style="font-size:32px;margin-bottom:6px">🏆</div>
            <div style="font-size:22px;font-weight:900;color:#ffd700">${name}</div>
            <div style="font-size:12px;color:var(--text2);margin-top:4px">¡Ganador de la rifa!</div>
            <button onclick="rifaRemoveLastWinner()" style="margin-top:10px;background:transparent;border:1.5px solid #ff4444;border-radius:8px;padding:7px 14px;font-size:12px;font-weight:700;color:#ff4444;cursor:pointer;animation:rifaNeonPulse 1.2s ease-in-out infinite;letter-spacing:.3px">🗑️ Quitar del sorteo</button>
          </div>
        `);
        rifaBroadcast({ state: 'result', name, type: 'winner', mode: 'normal' });
        rifaConfetti();
      }
    }
  }
  setTimeout(drumStep, 400);
}

function rifaChampion(name) {
  const el = document.getElementById('rifa-winner');
  if (!el) return;
  el.innerHTML = `
    <div style="background:linear-gradient(135deg,rgba(255,215,0,0.15),rgba(255,68,68,0.1));border:2px solid #ffd700;border-radius:18px;padding:20px;text-align:center;animation:rifaWinPop 0.6s cubic-bezier(.34,1.56,.64,1)">
      <div style="font-size:42px;margin-bottom:8px">🏆</div>
      <div style="font-size:13px;font-weight:700;color:var(--text2);letter-spacing:1px;margin-bottom:6px">¡ÚLTIMO EN PIE!</div>
      <div style="font-size:26px;font-weight:900;color:#ffd700;text-shadow:0 0 24px rgba(255,215,0,0.8)">${name}</div>
      <div style="font-size:12px;color:var(--text2);margin-top:6px">Eliminados: ${RIFA.eliminated.join(', ')}</div>
    </div>
  `;
  rifaBroadcast({ state: 'champion', name, eliminated: [...RIFA.eliminated] });
  rifaConfetti();
}

function rifaRemoveLastWinner() {
  if (!RIFA.lastResult) return;
  rifaRemoveParticipant(RIFA.participants.indexOf(RIFA.lastResult));
  const el = document.getElementById('rifa-winner'); if (el) el.innerHTML = '';
  RIFA.lastResult = null;
}

function rifaConfetti() {
  const colors = ['#ff4444','#ffd700','#22c55e','#3b82f6','#a855f7','#f97316','#ec4899','#14b8a6'];
  for (let i = 0; i < 90; i++) {
    setTimeout(() => {
      const el = document.createElement('div');
      const color = colors[i % colors.length];
      const x = 5 + Math.random() * 90, size = 5 + Math.random() * 9;
      const dur = (1.5 + Math.random() * 2).toFixed(2);
      el.style.cssText = `position:fixed;left:${x}vw;top:-12px;width:${size}px;height:${size}px;background:${color};border-radius:${Math.random()>.5?'50%':'3px'};pointer-events:none;z-index:9999;animation:rifaFall ${dur}s linear forwards`;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), (+dur + 0.5) * 1000);
    }, i * 20);
  }
}


// ============================================================
// ADMIN PAGE
// ============================================================

function renderAdminEditUser(id) {
  // Wrapper: opens editRider modal, but after save navigates back to admin users list
  const _origDoEdit = doEditRider;
  window.doEditRider = function(uid) {
    const r = STATE.users.find(u => u.id === uid);
    if (!r) return;
    const isAdmin = STATE.user?.is_admin;
    r.username = document.getElementById('ed-username').value.trim() || r.username;
    r.email = document.getElementById('ed-email').value.trim() || r.email;
    r.bike_model = document.getElementById('ed-bike').value.trim();
    r.city = document.getElementById('ed-city').value.trim();
    r.bio = document.getElementById('ed-bio').value.trim();
    const newPass = document.getElementById('ed-pass')?.value;
    if (newPass) r.password = newPass;
    if (isAdmin) {
      const edIsAdmin = document.getElementById('ed-isadmin');
      const edIsInjured = document.getElementById('ed-isinjured');
      const edPoints = document.getElementById('ed-points');
      if (edIsAdmin) r.is_admin = edIsAdmin.checked;
      if (edIsInjured) r.is_injured = edIsInjured.checked;
      if (edPoints) r.points = parseInt(edPoints.value) || r.points;
    }
    if (STATE.user?.id === uid) STATE.user = r;
    ls('bs_session', STATE.user);
    saveState();
    recalculateUserStats(uid);
    closeModal();
    window.doEditRider = _origDoEdit; // restore
    renderAdminUsers();
    toast('Perfil actualizado!');
  };
  editRider(id);
}

function deleteUser(id) {
  const u = STATE.users.find(x => x.id === id);
  if (!u) return;
  if (!confirm(`Eliminar al usuario "${u.username}"? Esta accion no se puede deshacer.`)) return;
  // Track deleted user so syncFromCloud never restores them
  const deletedUsers = ls('_deletedUsers') || [];
  if (!deletedUsers.includes(id)) {
    deletedUsers.push(id);
    ls('_deletedUsers', deletedUsers);
  }
  STATE.users = STATE.users.filter(x => x.id !== id);
  STATE.userBadges = STATE.userBadges.filter(ub => ub.user_id !== id);
  STATE.userChallenges = STATE.userChallenges.filter(uc => uc.user_id !== id);
  STATE.attendance = STATE.attendance.filter(a => a.user_id !== id);
  STATE.notifications = STATE.notifications.filter(n => n.user_id !== id && n.actor_id !== id);
  STATE.comments = STATE.comments.filter(c => c.user_id !== id);
  if (STATE.user?.id === id) { logout(); return; }
  saveState();
  // Also push deletion to cloud immediately so other users don't restore this user
  if (HV.user) syncToCloud();
  renderAdmin();
  toast('Usuario eliminado');
}

function renderAdmin() {
  if (!STATE.user?.is_admin) { navigate('inicio'); return; }
  // Clear live rifa display when admin returns to main panel (not from resumeSync while still in rifa)
  const stillInRifa = STATE.navStack && STATE.navStack.some(n => n.page === 'admin-rifa');
  if (!stillInRifa) rifaBroadcast({ active: false, state: 'idle' });

  const cards = [
    { icon:'👥', label:'Usuarios',         desc:`${STATE.users.length} miembros registrados`,       color:'#3b82f6', bg:'rgba(59,130,246,0.13)',  fn:'renderAdminUsers()' },
    { icon:'🔔', label:'Notificaciones',   desc:`${STATE.notifications.length} en el sistema`,       color:'#a855f7', bg:'rgba(168,85,247,0.13)',  fn:'renderAdminNotif()' },
    { icon:'🔑', label:'Recuperaciones',   desc:'Códigos de acceso pendientes',                      color:'#eab308', bg:'rgba(234,179,8,0.13)',   fn:'renderAdminRecovery()' },
    { icon:'🎡', label:'Ruleta de Rifas',  desc:'Sorteo aleatorio de miembros',                      color:'#ec4899', bg:'rgba(236,72,153,0.13)',  fn:'renderAdminRifa()' },
    { icon:'📢', label:'Broadcast',        desc:'Enviar mensaje a todos los miembros',               color:'#3b82f6', bg:'rgba(59,130,246,0.13)',  fn:'renderAdminBroadcast()' },
    { icon:'💬', label:'Mensajes DM',      desc:'Chat directo con miembros',                         color:'#6366f1', bg:'rgba(99,102,241,0.13)',  fn:'renderAdminMessages()' },
  ];

  document.getElementById('page-admin').innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:22px">
      <div style="width:46px;height:46px;border-radius:14px;background:linear-gradient(135deg,var(--accent),#f97316);display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0">⚙️</div>
      <div>
        <div style="font-size:19px;font-weight:800;line-height:1.2">Panel de Admin</div>
        <div style="font-size:11px;color:var(--text2);margin-top:2px">${STATE.users.length} riders &middot; ${STATE.events.length} eventos</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      ${cards.map(c => `
        <div onclick="${c.fn}"
          style="background:var(--card);border:1.5px solid var(--border);border-radius:18px;padding:16px 14px;cursor:pointer;transition:border-color 0.18s,transform 0.18s,box-shadow 0.18s;display:flex;flex-direction:column;gap:12px"
          onmouseover="this.style.borderColor='${c.color}';this.style.transform='translateY(-3px)';this.style.boxShadow='0 6px 20px ${c.bg}'"
          onmouseout="this.style.borderColor='var(--border)';this.style.transform='translateY(0)';this.style.boxShadow='none'">
          <div style="width:44px;height:44px;border-radius:13px;background:${c.bg};display:flex;align-items:center;justify-content:center;font-size:22px">${c.icon}</div>
          <div>
            <div style="font-size:13px;font-weight:700;color:var(--text1)">${c.label}</div>
            <div style="font-size:11px;color:var(--text2);margin-top:3px;line-height:1.4">${c.desc}</div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderAdminUsers() {
  pushNav('admin-users', null, 'Usuarios');
  document.getElementById('page-admin').innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
      <button onclick="popNav()" style="display:inline-flex;align-items:center;gap:5px;padding:7px 15px;background:var(--surface2);border:1.5px solid var(--accent);border-radius:10px;font-size:13px;font-weight:700;color:var(--accent);cursor:pointer;transition:all 0.15s" onmouseover="this.style.background='var(--accent)';this.style.color='#fff'" onmouseout="this.style.background='var(--surface2)';this.style.color='var(--accent)'">← Volver</button>
      <span style="font-size:18px;font-weight:800">👥 ${STATE.users.length} Miembros</span>
    </div>
    <input class="input" type="text" id="admin-user-search" placeholder="🔍 Buscar miembro..." style="margin-bottom:14px" oninput="filterAdminUsers(this.value)">
    <div id="admin-users-list">
      ${STATE.users.map(u => {
        const lv = levelOf(u.points || 0);
        return `
        <div class="admin-user-card" id="auc-${u.id}" style="display:flex;align-items:center;gap:14px;padding:14px;background:var(--card);border-radius:14px;border:1px solid var(--border);margin-bottom:10px;cursor:pointer;transition:all 0.2s" onclick="renderAdminEditUser(${u.id})" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'">
          <div style="width:48px;height:48px;border-radius:50%;background:${avatarColor(u.id)};display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:#fff;flex-shrink:0;box-shadow:0 0 12px ${avatarColor(u.id)}44">${initials(u.username)}</div>
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
              <span style="font-size:15px;font-weight:700">${escHtml(u.username)}</span>
              ${u.is_admin ? '<span style="font-size:9px;padding:2px 7px;border-radius:20px;background:rgba(251,191,36,0.15);border:1px solid rgba(251,191,36,0.4);color:#fbbf24;font-weight:700">ADMIN</span>' : ''}
              ${u.is_injured ? '<span style="font-size:9px;padding:2px 7px;border-radius:20px;background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.4);color:#ef4444;font-weight:700">LESIONADO</span>' : ''}
            </div>
            <div style="font-size:11px;color:var(--text2);margin-top:2px">${escHtml(u.email)} · ${u.bike_model || 'Sin moto'}</div>
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div style="font-size:16px;font-weight:900;color:var(--accent)">${u.points || 0}</div>
            <div style="font-size:10px;color:var(--text3)">puntos · ${lv.name}</div>
          </div>
        </div>
      `}).join('')}
    </div>
  `;
}

function filterAdminUsers(q) {
  q = q.toLowerCase();
  STATE.users.forEach(u => {
    const el = document.getElementById('auc-' + u.id);
    if (!el) return;
    const match = !q || (u.username + ' ' + u.email).toLowerCase().includes(q);
    el.style.display = match ? 'flex' : 'none';
  });
}

function renderAdminEvents() {
  pushNav('admin-events', null, 'Eventos');
  document.getElementById('page-admin').innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
      <button onclick="popNav()" style="display:inline-flex;align-items:center;gap:5px;padding:7px 15px;background:var(--surface2);border:1.5px solid var(--accent);border-radius:10px;font-size:13px;font-weight:700;color:var(--accent);cursor:pointer;transition:all 0.15s" onmouseover="this.style.background='var(--accent)';this.style.color='#fff'" onmouseout="this.style.background='var(--surface2)';this.style.color='var(--accent)'">← Volver</button>
      <span style="font-size:18px;font-weight:800">📅 Eventos (${STATE.events.length})</span>
    </div>
    ${STATE.events.map(ev => `
      <div class="admin-list-item" style="margin-bottom:10px;padding:12px;background:var(--card);border-radius:var(--radius);border:1px solid var(--border)">
        <div style="flex:1">
          <div style="font-size:14px;font-weight:700">${ev.title}</div>
          <div style="font-size:11px;color:var(--text2)">${ev.date} · ${ev.location}</div>
        </div>
        <span class="badge ${ev.status==='activo'?'badge-green':'badge-red'}" style="font-size:10px;margin:0 8px">${ev.status}</span>
        <button class="btn btn-primary" style="font-size:11px;padding:6px 10px;margin-right:6px" onclick="renderAdminEditEvent(${ev.id})">✏️ Editar</button>
        <button class="btn btn-ghost" style="font-size:11px;padding:6px 10px;color:var(--danger);border:1px solid var(--danger)" onclick="adminDeleteEvent(${ev.id})">🗑️</button>
      </div>
    `).join('')}
  `;
}

function renderAdminNotif() {
  pushNav('admin-notif', null, 'Notificaciones');
  document.getElementById('page-admin').innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
      <button onclick="popNav()" style="display:inline-flex;align-items:center;gap:5px;padding:7px 15px;background:var(--surface2);border:1.5px solid var(--accent);border-radius:10px;font-size:13px;font-weight:700;color:var(--accent);cursor:pointer;transition:all 0.15s" onmouseover="this.style.background='var(--accent)';this.style.color='#fff'" onmouseout="this.style.background='var(--surface2)';this.style.color='var(--accent)'">← Volver</button>
      <span style="font-size:18px;font-weight:800">🔔 Notificaciones</span>
    </div>
    ${STATE.notifications.length === 0 ? '<div style="padding:24px;text-align:center;color:var(--text3);font-size:13px">Sin notificaciones</div>' :
      STATE.notifications.map(n => `
        <div style="padding:10px 12px;background:var(--card);border-radius:var(--radius);border:1px solid var(--border);margin-bottom:8px">
          <div style="font-size:13px">${n.message}</div>
          <div style="font-size:10px;color:var(--text3);margin-top:4px">${timeAgo(n.created_at)}</div>
        </div>
      `).join('')}
    <button class="btn btn-ghost" style="width:100%;margin-top:8px;color:var(--danger);border:1px solid var(--danger)" onclick="STATE.notifications=[];saveState();renderAdminNotif();toast('Notificaciones borradas')">Borrar todas</button>
  `;
}

function renderAdminSync() {
  pushNav('admin-sync', null, 'HeyValue Sync');
  document.getElementById('page-admin').innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
      <button onclick="popNav()" style="display:inline-flex;align-items:center;gap:5px;padding:7px 15px;background:var(--surface2);border:1.5px solid var(--accent);border-radius:10px;font-size:13px;font-weight:700;color:var(--accent);cursor:pointer;transition:all 0.15s" onmouseover="this.style.background='var(--accent)';this.style.color='#fff'" onmouseout="this.style.background='var(--surface2)';this.style.color='var(--accent)'">← Volver</button>
      <span style="font-size:18px;font-weight:800">☁️ HeyValue Sync</span>
    </div>
    <div style="padding:16px;background:var(--card);border-radius:var(--radius);border:1px solid var(--border)">
      <div style="font-size:13px;margin-bottom:8px">Estado: <b style="color:var(--accent)">${STATE.syncStatus}</b></div>
      <div style="font-size:12px;color:var(--text2);margin-bottom:12px">Usuario: <b>${HV.user || 'No configurado'}</b></div>
      <button class="btn btn-primary" style="width:100%;margin-bottom:8px" onclick="syncToCloud();toast('Sincronizando...')">Forzar sincronizacion</button>
      <button class="btn btn-secondary" style="width:100%" onclick="showHVSetup()">Configurar HeyValue</button>
    </div>
  `;
}

function renderAdminRecovery() {
  pushNav('admin-recovery', null, 'Recuperaciones');
  loadRecoveryCodesAdmin();
  document.getElementById('page-admin').innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
      <button onclick="popNav()" style="display:inline-flex;align-items:center;gap:5px;padding:7px 15px;background:var(--surface2);border:1.5px solid var(--accent);border-radius:10px;font-size:13px;font-weight:700;color:var(--accent);cursor:pointer;transition:all 0.15s" onmouseover="this.style.background='var(--accent)';this.style.color='#fff'" onmouseout="this.style.background='var(--surface2)';this.style.color='var(--accent)'">← Volver</button>
      <span style="font-size:18px;font-weight:800">🔑 Recuperaciones Pendientes</span>
    </div>
    <div style="font-size:12px;color:var(--text2);margin-bottom:12px">Códigos activos — compártelos con los usuarios por WhatsApp</div>
    <div id="recovery-codes-list"></div>
  `;
  loadRecoveryCodesAdmin();
}

function toggleAdmin(section) {
  const el = document.getElementById('admin-' + section);
  if (!el) return;
  const isHidden = el.style.display === 'none';
  el.style.display = isHidden ? 'block' : 'none';
  const arrow = document.getElementById('arrow-' + section);
  if (arrow) arrow.textContent = isHidden ? '▲' : '▼';
  if (section === 'recovery' && isHidden) loadRecoveryCodesAdmin();
}

function togglePass(userId, password) {
  const el = document.getElementById('show-pass-' + userId);
  if (!el) return;
  if (el.textContent === 'ver clave') {
    el.textContent = password;
  } else {
    el.textContent = 'ver clave';
  }
}

function adminCopyPass(userId) {
  const user = STATE.users.find(x => x.id === userId);
  if (!user) return;
  navigator.clipboard.writeText(user.password).then(() => toast('Clave copiada!'));
}

function toggleMyPass() {
  const hidden = document.getElementById('profile-pass-hidden');
  const visible = document.getElementById('profile-pass-visible');
  if (!hidden || !visible) return;
  if (hidden.style.display !== 'none') {
    hidden.style.display = 'none';
    visible.style.display = 'inline';
  } else {
    hidden.style.display = 'inline';
    visible.style.display = 'none';
  }
}

function copyMyPass() {
  if (!STATE.user) return;
  navigator.clipboard.writeText(STATE.user.password).then(() => toast('Clave copiada!'));
}

async function loadRecoveryCodesAdmin() {
  const codes = await loadFromHV('recovery_codes') || {};
  const now = new Date();
  const active = Object.entries(codes).filter(([email, r]) => !r.used && new Date(r.expiresAt) > now);
  const container = document.getElementById('recovery-codes-list');
  if (!container) return;
  if (active.length === 0) {
    container.innerHTML = '<div style="padding:12px;font-size:12px;color:var(--text3)">Sin códigos activos</div>';
    return;
  }
  container.innerHTML = active.map(([email, r]) => `
    <div class="admin-list-item" style="flex-direction:column;align-items:flex-start;gap:6px">
      <div style="display:flex;width:100%;align-items:center;gap:8px">
        <div style="flex:1">
          <div style="font-size:13px;font-weight:600">${r.username || email}</div>
          <div style="font-size:11px;color:var(--text2)">${email}</div>
        </div>
        <div style="font-size:18px;font-weight:900;color:var(--accent);font-family:monospace;letter-spacing:4px">${r.code}</div>
      </div>
      <div style="display:flex;gap:6px;width:100%">
        <button class="btn btn-secondary" style="flex:1;font-size:11px;padding:6px" onclick="adminCopyCode('${email}')">📋 Copiar código</button>
        <button class="btn btn-primary" style="flex:1;font-size:11px;padding:6px" onclick="adminResetPassword('${email}')">🔑 Nueva clave</button>
      </div>
    </div>
  `).join('');
}

function adminCopyCode(email) {
  loadFromHV('recovery_codes').then(codes => {
    const code = codes && codes[email] ? codes[email].code : '';
    if (code) {
      navigator.clipboard.writeText(code).then(() => toast('Código copiado!'));
    }
  });
}

async function adminResetPassword(email) {
  const newPass = prompt('Nueva contraseña para ' + email + ':');
  if (!newPass || newPass.length < 4) { toast('La clave debe tener al menos 4 caracteres'); return; }
  const codes = await loadFromHV('recovery_codes') || {};
  const userIdx = STATE.users.findIndex(x => x.email.toLowerCase() === email);
  if (userIdx === -1) { toast('Usuario no encontrado'); return; }
  STATE.users[userIdx].password = newPass;
  if (codes[email]) { codes[email].used = true; await saveToHV('recovery_codes', codes); }
  await syncToCloud();
  saveLocal();
  toast('Contraseña actualizada para ' + STATE.users[userIdx].username);
  loadRecoveryCodesAdmin();
}

function editEvent(id) {
  const ev = STATE.events.find(x => x.id === id);
  if (!ev) return;
  openModal('Editar Evento', `
    <input class="input" id="ev-title" value="${ev.title}" placeholder="Titulo">
    <input class="input" id="ev-desc" value="${ev.description}" placeholder="Descripcion">
    <input class="input" id="ev-date" type="date" value="${ev.date}" class="input">
    <input class="input" id="ev-time" type="time" value="${ev.time}" class="input">
    <input class="input" id="ev-location" value="${ev.location}" placeholder="Ubicacion">
    <select class="input" id="ev-diff">
      <option value="facil" ${ev.difficulty==='facil'?'selected':''}>Facil</option>
      <option value="intermedia" ${ev.difficulty==='intermedia'?'selected':''}>Intermedia</option>
      <option value="alta" ${ev.difficulty==='alta'?'selected':''}>Alta</option>
    </select>
    <select class="input" id="ev-status">
      <option value="activo" ${ev.status==='activo'?'selected':''}>Activo</option>
      <option value="cancelado" ${ev.status==='cancelado'?'selected':''}>Cancelado</option>
      <option value="completado" ${ev.status==='completado'?'selected':''}>Completado</option>
    </select>
    <button class="btn btn-primary" style="width:100%" onclick="doEditEvent(${id})">Guardar</button>
  `);
}

function renderAdminEditEvent(id) {
  const ev = STATE.events.find(x => x.id === id);
  if (!ev) return;
  openModal('Editar Evento', `
    <input class="input" id="ev-title" value="${ev.title}" placeholder="Titulo">
    <input class="input" id="ev-desc" value="${ev.description}" placeholder="Descripcion">
    <input class="input" id="ev-date" type="date" value="${ev.date}" class="input">
    <input class="input" id="ev-time" type="time" value="${ev.time}" class="input">
    <input class="input" id="ev-location" value="${ev.location}" placeholder="Ubicacion">
    <select class="input" id="ev-diff">
      <option value="facil" ${ev.difficulty==='facil'?'selected':''}>Facil</option>
      <option value="intermedia" ${ev.difficulty==='intermedia'?'selected':''}>Intermedia</option>
      <option value="alta" ${ev.difficulty==='alta'?'selected':''}>Alta</option>
    </select>
    <select class="input" id="ev-status">
      <option value="activo" ${ev.status==='activo'?'selected':''}>Activo</option>
      <option value="cancelado" ${ev.status==='cancelado'?'selected':''}>Cancelado</option>
      <option value="completado" ${ev.status==='completado'?'selected':''}>Completado</option>
    </select>
    <button class="btn btn-primary" style="width:100%;margin-bottom:8px" onclick="doEditEventAdmin(${id})">Guardar</button>
    <button class="btn btn-ghost" style="width:100%;color:var(--danger);border:1px solid var(--danger)" onclick="adminDeleteEvent(${id})">🗑️ Eliminar evento</button>
  `);
}

function doEditEventAdmin(id) {
  const ev = STATE.events.find(x => x.id === id);
  if (!ev) return;
  ev.title = document.getElementById('ev-title').value.trim() || ev.title;
  ev.description = document.getElementById('ev-desc').value.trim();
  ev.date = document.getElementById('ev-date').value || ev.date;
  ev.time = document.getElementById('ev-time').value || ev.time;
  ev.location = document.getElementById('ev-location').value.trim();
  ev.difficulty = document.getElementById('ev-diff').value;
  ev.status = document.getElementById('ev-status').value;
  saveState();
  closeModal();
  renderAdminEvents();
  toast('Evento actualizado');
}

function doEditEvent(id) {
  const ev = STATE.events.find(x => x.id === id);
  if (!ev) return;
  ev.title = document.getElementById('ev-title').value.trim() || ev.title;
  ev.description = document.getElementById('ev-desc').value.trim();
  ev.date = document.getElementById('ev-date').value || ev.date;
  ev.time = document.getElementById('ev-time').value || ev.time;
  ev.location = document.getElementById('ev-location').value.trim();
  ev.difficulty = document.getElementById('ev-diff').value;
  ev.status = document.getElementById('ev-status').value;
  saveState();
  closeModal();
  if (onSaveNav) { onSaveNav(); } else { navigate('admin'); }
  toast('Evento actualizado');
}


// ============================================================
// ADMIN BROADCAST
// ============================================================
function renderAdminBroadcast() {
  document.getElementById('page-admin').innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
      <button onclick="renderAdmin()" style="display:inline-flex;align-items:center;gap:5px;padding:7px 15px;background:var(--surface2);border:1.5px solid #3b82f6;border-radius:10px;font-size:13px;font-weight:700;color:#3b82f6;cursor:pointer">← Volver</button>
      <span style="font-size:18px;font-weight:800">📢 Broadcast</span>
    </div>

    <div style="background:var(--card);border:1px solid var(--border);border-radius:16px;padding:16px;margin-bottom:14px">
      <div style="font-size:12px;color:var(--text2);margin-bottom:10px;line-height:1.5">Envía un mensaje que aparece como overlay flotante en todos los dispositivos conectados <b>y como push notification</b> en los que tienen notificaciones activas.</div>
      <textarea id="bc-text" class="input" placeholder="Escribe tu mensaje para todos los miembros..." rows="4" style="resize:vertical;margin-bottom:10px;height:90px"></textarea>
      <button onclick="adminSendBroadcast()" style="width:100%;background:linear-gradient(135deg,#3b82f6,#6366f1);color:#fff;border:none;border-radius:12px;padding:13px;font-size:14px;font-weight:800;cursor:pointer;box-shadow:0 4px 18px rgba(59,130,246,0.4)">📢 Enviar a todos</button>
    </div>

    <div style="background:var(--card);border:1px solid var(--border);border-radius:16px;padding:14px">
      <div style="font-size:12px;font-weight:700;color:var(--text2);margin-bottom:10px">BORRAR BROADCAST ACTIVO</div>
      <button onclick="adminClearBroadcast()" style="width:100%;background:transparent;border:1.5px solid #ef4444;border-radius:12px;padding:10px;font-size:13px;font-weight:700;color:#ef4444;cursor:pointer">🗑️ Limpiar mensaje activo</button>
    </div>
  `;
}

async function adminSendBroadcast() {
  const text = document.getElementById('bc-text')?.value.trim();
  if (!text) { toast('Escribe un mensaje'); return; }
  const btn = document.querySelector('#page-admin button[onclick="adminSendBroadcast()"]');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Enviando...'; }
  try {
    await fetch('/api/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: true, text })
    });
    toast('✅ Mensaje enviado a todos');
    const ta = document.getElementById('bc-text');
    if (ta) ta.value = '';
  } catch(e) {
    toast('Error al enviar');
  }
  if (btn) { btn.disabled = false; btn.textContent = '📢 Enviar a todos'; }
}

async function adminClearBroadcast() {
  try {
    await fetch('/api/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: false })
    });
    toast('Broadcast limpiado');
  } catch(e) {}
}

// ============================================================
// ADMIN DM INBOX
// ============================================================
let _adminDmRefresh = null;

function renderAdminMessages() {
  if (_adminDmRefresh) { clearInterval(_adminDmRefresh); _adminDmRefresh = null; }
  if (_adminDmThreadRefresh) { clearInterval(_adminDmThreadRefresh); _adminDmThreadRefresh = null; }
  document.getElementById('page-admin').innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
      <button onclick="renderAdmin()" style="display:inline-flex;align-items:center;gap:5px;padding:7px 15px;background:var(--surface2);border:1.5px solid #6366f1;border-radius:10px;font-size:13px;font-weight:700;color:#6366f1;cursor:pointer">← Volver</button>
      <span style="font-size:18px;font-weight:800">💬 Mensajes DM</span>
    </div>
    <div id="admin-dm-list"><div style="padding:24px;text-align:center;color:var(--text2);font-size:13px">Cargando...</div></div>
  `;
  loadAdminDmList();
  if (_adminDmRefresh) clearInterval(_adminDmRefresh);
  _adminDmRefresh = setInterval(loadAdminDmList, 5000);
}

async function loadAdminDmList() {
  const el = document.getElementById('admin-dm-list');
  if (!el) { clearInterval(_adminDmRefresh); return; }
  try {
    const r = await fetch('/api/dm/all', { cache: 'no-store' });
    if (!r.ok) return;
    const data = await r.json();
    const convs = data.conversations || [];
    if (convs.length === 0) {
      el.innerHTML = '<div style="padding:24px;text-align:center;color:var(--text2);font-size:13px">Sin mensajes aún</div>';
      return;
    }
    el.innerHTML = convs.map(c => `
      <div onclick="openAdminDmThread('${escHtml(String(c.user_id))}','${escHtml(c.user_name)}')" style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--card);border:1px solid ${c.unread > 0 ? '#6366f1' : 'var(--border)'};border-radius:14px;margin-bottom:8px;cursor:pointer;transition:all .2s" onmouseover="this.style.borderColor='#6366f1'" onmouseout="this.style.borderColor='${c.unread > 0 ? '#6366f1' : 'var(--border)'}'">
        <div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#3b82f6);display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:800;color:#fff;flex-shrink:0">${(c.user_name||'?').charAt(0).toUpperCase()}</div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:6px">
            <span style="font-size:13px;font-weight:700">${escHtml(c.user_name)}</span>
            ${c.unread > 0 ? `<span style="background:#6366f1;color:#fff;font-size:9px;font-weight:800;padding:2px 6px;border-radius:10px">${c.unread} nuevo${c.unread>1?'s':''}</span>` : ''}
          </div>
          <div style="font-size:11px;color:var(--text2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px">${escHtml(c.last_text)}</div>
        </div>
        <div style="font-size:10px;color:var(--text3);flex-shrink:0">${timeAgo(new Date(c.last_ts).toISOString())}</div>
      </div>
    `).join('');
  } catch(e) {}
}

let _adminDmThread = null;
let _adminDmThreadUser = null;
let _adminDmThreadRefresh = null;

async function openAdminDmThread(userId, userName) {
  _adminDmThread = userId;
  _adminDmThreadUser = userName;
  if (_adminDmThreadRefresh) { clearInterval(_adminDmThreadRefresh); _adminDmThreadRefresh = null; }
  document.getElementById('page-admin').innerHTML = `
    <button onclick="renderAdminMessages()" style="display:inline-flex;align-items:center;gap:5px;padding:7px 15px;background:var(--surface2);border:1.5px solid #6366f1;border-radius:10px;font-size:13px;font-weight:700;color:#6366f1;cursor:pointer;margin-bottom:10px">← Volver</button>
    <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--card);border:1px solid var(--border);border-radius:14px;margin-bottom:12px">
      <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#3b82f6);display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:800;color:#fff;flex-shrink:0">${(userName||'?').charAt(0).toUpperCase()}</div>
      <div>
        <div style="font-size:14px;font-weight:800">${escHtml(userName)}</div>
        <div style="font-size:11px;color:var(--text2)">Miembro</div>
      </div>
    </div>
    <div id="admin-thread-msgs" style="height:calc(100vh - 360px);min-height:120px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;padding-right:2px"></div>
    <div style="margin-top:12px;display:flex;gap:8px;align-items:center;background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:8px 10px">
      <input id="admin-dm-input" placeholder="Responder a ${escHtml(userName)}..." style="flex:1;background:transparent;border:none;color:var(--text);font-size:14px;outline:none;padding:4px 6px" onkeydown="if(event.key==='Enter')adminSendDmReply()">
      <button onclick="adminSendDmReply()" style="background:linear-gradient(135deg,#6366f1,#3b82f6);color:#fff;border:none;border-radius:50%;width:36px;height:36px;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0">➤</button>
    </div>
  `;
  await loadAdminDmThread();
  // Mark messages as read
  fetch('/api/dm', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from_admin: true, read_uid: userId }) }).catch(() => {});

  if (_adminDmThreadRefresh) clearInterval(_adminDmThreadRefresh);
  _adminDmThreadRefresh = setInterval(loadAdminDmThread, 4000);
}

async function loadAdminDmThread() {
  if (!_adminDmThread) return;
  const el = document.getElementById('admin-thread-msgs');
  if (!el) { clearInterval(_adminDmThreadRefresh); return; }
  try {
    const r = await fetch('/api/dm?userId=' + encodeURIComponent(_adminDmThread), { cache: 'no-store' });
    if (!r.ok) return;
    const { messages } = await r.json();
    const wasAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    el.innerHTML = (messages || []).map(m => `
      <div style="display:flex;flex-direction:column;align-items:${m.from_admin ? 'flex-end' : 'flex-start'}">
        <div class="${m.from_admin ? 'dm-bubble-admin' : 'dm-bubble-me'}" style="max-width:78%">${escHtml(m.text)}</div>
        <div style="font-size:9px;color:var(--text3);margin-top:3px;padding:0 4px">${timeAgo(new Date(m.ts).toISOString())}</div>
      </div>
    `).join('') || '<div style="text-align:center;padding:20px;color:var(--text3);font-size:12px">Sin mensajes aún</div>';
    if (wasAtBottom) el.scrollTop = el.scrollHeight;
  } catch(e) {}
}

async function adminSendDmReply() {
  const input = document.getElementById('admin-dm-input');
  if (!input) return;
  const text = input.value.trim();
  if (!text || !_adminDmThread) return;
  input.value = '';
  try {
    await fetch('/api/dm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: _adminDmThread, user_name: _adminDmThreadUser, text, from_admin: true })
    });
    await loadAdminDmThread();
  } catch(e) { toast('Error al enviar'); }
}

// ============================================================
// RIFA BROADCAST — publica estado en EC2 (en memoria, instantáneo)
// ============================================================
let _rifaBcTimer = null;
async function rifaBroadcast(data) {
  try {
    await fetch('/api/rifa-live', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: true, ...data })
    });
  } catch(e) {}
}
function rifaBroadcastDebounced(data) {
  if (_rifaBcTimer) clearTimeout(_rifaBcTimer);
  _rifaBcTimer = setTimeout(() => rifaBroadcast(data), 350);
}
