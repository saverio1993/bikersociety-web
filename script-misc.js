// ============================================================
// RANKING PAGE
// ============================================================
let RANK_SORT = 'points'; // 'points' | 'rides' | 'km' | 'badges'

function renderRanking() {
  if (!STATE.user) { showLogin(); return; }
  // Build ranking data: compute stats for each user
  const userStats = STATE.users.filter(u => !u.is_invisible && !u.is_admin).map(u => {
    const s = getUserStats(u.id);
    return {
      user: u,
      points: u.points || 0,
      rides: s.rides || 0,
      km: s.total_km || 0,
      badges: STATE.userBadges.filter(ub => ub.user_id === u.id).length,
      posts: s.posts || 0,
    };
  });
  // Sort
  userStats.sort((a, b) => b[RANK_SORT] - a[RANK_SORT]);
  const top10 = userStats.slice(0, 10);
  const myRank = userStats.findIndex(s => s.user.id === STATE.user.id) + 1;
  const top1 = top10[0];
  const podium = [top10[1], top10[0], top10[2]]; // 2nd, 1st, 3rd (visual order)

  // Build SVG bar chart of top 10 points
  const maxPoints = Math.max(...top10.map(s => s.points), 1);
  const chartBars = top10.map((s, i) => {
    const h = (s.points / maxPoints) * 100;
    const colors = ['#fbbf24','#9ca3af','#ea580c','#3b82f6','#22c55e','#a855f7','#ec4899','#14b8a6','#f43f5e','#06b6d4'];
    const c = colors[i % colors.length];
    return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
      <div style="font-size:9px;font-weight:700;color:${c}">${s.points}</div>
      <div style="width:100%;height:${Math.max(h,5)}px;background:linear-gradient(to top,${c},${c}66);border-radius:4px 4px 0 0;transition:height 0.5s"></div>
      <div style="font-size:8px;color:var(--text3);text-align:center;width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${i+1}. ${escHtml(s.user.username)}</div>
    </div>`;
  }).join('');

  document.getElementById('page-ranking').innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
      <div>
        <div style="font-size:20px;font-weight:900;letter-spacing:-0.5px">
          <span style="background:linear-gradient(135deg,#fbbf24,#f59e0b);-webkit-background-clip:text;-webkit-text-fill-color:transparent">🏆 Ranking</span>
        </div>
        <div style="font-size:11px;color:var(--text2);margin-top:2px">Tu posicion: <b style="color:#ff4444">#${myRank || '-'}</b> de ${userStats.length}</div>
      </div>
    </div>

    <!-- Sort tabs -->
    <div style="display:flex;gap:6px;margin-bottom:14px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:4px">
      ${[['points','⭐ Puntos'],['rides','🏍️ Rides'],['km','📏 Km'],['badges','🏅 Insignias']].map(([k,label]) => `
        <button onclick="setRankSort('${k}')" style="flex:1;padding:7px 4px;border-radius:8px;border:none;cursor:pointer;font-size:11px;font-weight:700;transition:all 0.2s;background:${RANK_SORT===k?'linear-gradient(135deg,#ff4444,#ff8800)':'transparent'};color:${RANK_SORT===k?'#fff':'var(--text3)'}">${label}</button>
      `).join('')}
    </div>

    <!-- Podium top 3 -->
    ${top10.length >= 3 ? `
    <div style="display:flex;align-items:flex-end;justify-content:center;gap:8px;margin-bottom:18px;padding:14px;background:linear-gradient(180deg,rgba(251,191,36,0.08),transparent);border-radius:16px">
      ${podium.map((s, idx) => {
        if (!s) return '';
        const position = idx === 1 ? 1 : (idx === 0 ? 2 : 3);
        const heights = {1: 110, 2: 90, 3: 70};
        const medals = {1: '🥇', 2: '🥈', 3: '🥉'};
        const colors = {1: 'linear-gradient(180deg,#fbbf24,#f59e0b)', 2: 'linear-gradient(180deg,#9ca3af,#6b7280)', 3: 'linear-gradient(180deg,#ea580c,#c2410c)'};
        const isMe = s.user.id === STATE.user.id;
        return `
          <div style="flex:1;display:flex;flex-direction:column;align-items:center;max-width:120px">
            ${renderAvatar(s.user, position === 1 ? 64 : 54)}
            <div style="font-size:11px;font-weight:700;margin-top:4px;text-align:center;color:${isMe?'#ff4444':'var(--text)'};${isMe?'text-shadow:0 0 8px rgba(255,68,68,0.4)':''}">${escHtml(s.user.username)}${isMe?' (tu)':''}</div>
            <div style="font-size:10px;color:var(--text3);margin-bottom:6px">${s[RANK_SORT]} ${RANK_SORT === 'points' ? 'pts' : (RANK_SORT === 'km' ? 'km' : '')}</div>
            <div style="width:100%;height:${heights[position]}px;background:${colors[position]};border-radius:10px 10px 0 0;display:flex;align-items:flex-start;justify-content:center;padding-top:6px;font-size:20px;font-weight:900;color:#fff;box-shadow:0 4px 12px rgba(0,0,0,0.3)">${medals[position]}</div>
            <div style="font-size:14px;font-weight:900;color:#fff;background:${colors[position]};padding:2px 0;border-radius:0 0 6px 6px;width:60%;text-align:center">${position}</div>
          </div>
        `;
      }).join('')}
    </div>` : ''}

    <!-- Bar chart of top 10 -->
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:16px;margin-bottom:14px">
      <div style="font-size:12px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px">Top 10 · ${RANK_SORT === 'points' ? 'Puntos' : RANK_SORT === 'rides' ? 'Rodadas' : RANK_SORT === 'km' ? 'Kilómetros' : 'Insignias'}</div>
      <div style="display:flex;align-items:flex-end;gap:4px;height:140px;padding-bottom:24px;border-bottom:1px solid var(--border)">
        ${chartBars}
      </div>
    </div>

    <!-- Full list -->
    <div style="font-size:11px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">Clasificación completa</div>
    <div style="display:flex;flex-direction:column;gap:6px">
      ${userStats.map((s, i) => {
        const isMe = s.user.id === STATE.user.id;
        const rankEmoji = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`;
        const points = s[RANK_SORT];
        return `
          <div onclick="navigate('rider-detail')" style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:${isMe?'linear-gradient(135deg,rgba(255,68,68,0.15),rgba(255,136,0,0.08))':'var(--surface)'};border:1px solid ${isMe?'rgba(255,68,68,0.4)':'var(--border)'};border-radius:12px;cursor:pointer;transition:transform 0.15s" onmouseover="this.style.transform='translateX(2px)'" onmouseout="this.style.transform='none'">
            <div style="min-width:32px;text-align:center;font-size:14px;font-weight:800;color:${isMe?'#ff4444':'var(--text2)'}">${rankEmoji}</div>
            ${renderAvatar(s.user, 36)}
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:700;display:flex;align-items:center;gap:4px">
                <span>${escHtml(s.user.username)}</span>
                ${s.user.is_admin ? '<span style="background:linear-gradient(135deg,#fbbf24,#f59e0b);color:#000;padding:0 4px;border-radius:3px;font-size:8px;font-weight:800">ADMIN</span>' : ''}
                ${isMe ? '<span style="background:#ff4444;color:#fff;padding:0 4px;border-radius:3px;font-size:8px;font-weight:800">TU</span>' : ''}
              </div>
              <div style="font-size:10px;color:var(--text3)">${s.km} km · ${s.rides} rides · ${s.badges} 🏅</div>
            </div>
            <div style="text-align:right">
              <div style="font-size:15px;font-weight:800;color:#ff4444">${points}</div>
              <div style="font-size:9px;color:var(--text3)">${RANK_SORT === 'points' ? 'pts' : RANK_SORT === 'km' ? 'km' : RANK_SORT === 'rides' ? 'rides' : 'badges'}</div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function setRankSort(s) {
  RANK_SORT = s;
  renderRanking();
}

// Browser notification for new chat messages (when tab is not focused)
let LAST_SEEN_MSG_COUNT = STATE.chatMessages.length;
setInterval(() => {
  if (STATE.chatMessages.length > LAST_SEEN_MSG_COUNT) {
    const newMsgs = STATE.chatMessages.slice(LAST_SEEN_MSG_COUNT);
    LAST_SEEN_MSG_COUNT = STATE.chatMessages.length;
    // Skip if user is currently in chat
    const onChatPage = document.querySelector('.page.active')?.id === 'page-chat';
    if (!onChatPage) {
      const last = newMsgs[newMsgs.length - 1];
      const author = STATE.users.find(u => u.id === last.user_id);
      if (author && 'Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification('Biker Society · #' + (STATE.chatChannels.find(c => c.id === last.channel_id)?.name || 'chat'), {
            body: `${author.username}: ${last.content.substring(0, 80)}`,
            icon: 'icons/icon-192.png',
            tag: 'bs-chat-' + last.channel_id,
          });
        } catch (e) { /* ignore */ }
      }
      // Update bottom nav badge
      const chatNav = document.querySelector('[data-nav="chat"]');
      if (chatNav) {
        const total = STATE.chatMessages.filter(m => m.user_id !== STATE.user?.id).length;
        let badge = chatNav.querySelector('.nav-badge');
        if (!badge) {
          badge = document.createElement('div');
          badge.className = 'nav-badge';
          badge.style.cssText = 'position:absolute;top:4px;right:8px;background:#ef4444;color:#fff;font-size:9px;font-weight:800;padding:1px 5px;border-radius:8px;min-width:16px;text-align:center';
          chatNav.style.position = 'relative';
          chatNav.appendChild(badge);
        }
        badge.textContent = total > 99 ? '99+' : total;
      }
    }
  }
}, 3000);

function createEvent() {
  if (!STATE.user?.is_admin) { toast('Solo administradores pueden crear eventos'); return; }
  openModal('Crear Evento', `
    <input class="input" id="ev-title" placeholder="Titulo del evento">
    <input class="input" id="ev-desc" placeholder="Descripcion (opcional)">
    <input class="input" id="ev-date" type="date" class="input">
    <input class="input" id="ev-time" type="time" value="08:00" class="input">
    <input class="input" id="ev-location" placeholder="Ubicacion">
    <select class="input" id="ev-diff">
      <option value="facil">Facil</option>
      <option value="intermedia" selected>Intermedia</option>
      <option value="alta">Alta</option>
    </select>
    <button class="btn btn-primary" style="width:100%" onclick="doCreateEvent()">Crear evento</button>
  `);
}

function doCreateEvent() {
  const title = document.getElementById('ev-title').value.trim();
  const desc = document.getElementById('ev-desc').value.trim();
  const date = document.getElementById('ev-date').value;
  const time = document.getElementById('ev-time').value;
  const location = document.getElementById('ev-location').value.trim();
  const diff = document.getElementById('ev-diff').value;
  if (!title || !date) { toast('Titulo y fecha son obligatorios'); return; }
  STATE.events.push({id:Date.now()%100000, title, description:desc, date, time, location, difficulty:diff, status:'activo', max_riders:0, latitude:0, longitude:0, created_by:STATE.user.id});
  saveState();
  closeModal();
  navigate('rutas');
  toast('Evento creado!');
}

// ============================================================
// RETOS PAGE
// ============================================================
function renderRetos() {
  const myChallenges = STATE.userChallenges || [];
  const weekly = STATE.challenges.filter(c => c.category === 'weekly');
  const special = STATE.challenges.filter(c => c.category === 'special');

  document.getElementById('page-retos').innerHTML = `
    <div style="margin-bottom:16px">
      <div style="font-size:18px;font-weight:800;margin-bottom:4px">Retos y Desafios</div>
      <div style="font-size:12px;color:var(--text2)">Completa retos para ganar puntos y insignias</div>
    </div>

    <div style="margin-bottom:16px">
      <div class="card" style="padding:14px">
        <div style="font-size:12px;color:var(--text2);margin-bottom:4px">RETOS SEMANALES</div>
        ${weekly.map(c => renderChallengeCard(c, myChallenges)).join('')}
      </div>
    </div>

    <div style="margin-bottom:16px">
      <div class="card" style="padding:14px">
        <div style="font-size:12px;color:var(--text2);margin-bottom:4px">RETOS ESPECIALES</div>
        ${special.map(c => renderChallengeCard(c, myChallenges)).join('')}
      </div>
    </div>
  `;
}

function renderChallengeCard(c, myChallenges) {
  const myProg = myChallenges.find(mc => mc.challenge_id === c.id);
  const progress = myProg ? myProg.progress : 0;
  const pct = Math.min(100, (progress / c.requirement_count) * 100);
  const done = myProg && myProg.completed;
  return `
    <div class="challenge-card ${done ? 'earned' : ''}" style="margin-top:12px">
      <div class="challenge-title">
        <span style="font-size:20px">${c.icon}</span>
        ${c.title}
        ${done ? '<span class="badge-green" style="font-size:10px">COMPLETADO</span>' : ''}
      </div>
      <div class="challenge-desc">${c.description}</div>
      <div class="challenge-progress">
        <div class="challenge-track"><div class="challenge-fill" style="width:${pct}%"></div></div>
        <div class="challenge-points">${progress}/${c.requirement_count}</div>
      </div>
      <div style="margin-top:8px;font-size:12px;color:var(--accent);font-weight:600">+${c.points} pts</div>
    </div>
  `;
}

// ============================================================
// INSIGNIAS PAGE
// ============================================================
function renderInsignias() {
  if (!STATE.user) { showLogin(); return; }
  const uid = STATE.user.id;
  const stats = getUserStats(uid);
  const earned = STATE.userBadges.filter(ub => ub.user_id === uid).map(ub => ub.badge_id);
  const totalEarned = earned.length;

  const catLabels = {rodaje:'Rodaje',eventos:'Eventos',social:'Social',fotos:'Fotos',rutas:'Rutas',distancia:'Distancia',especial:'Especial'};
  const categories = [...new Set(STATE.badges.map(b => b.category))];

  document.getElementById('page-insignias').innerHTML = `
    <div style="margin-bottom:20px">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">
        <div style="font-size:20px;font-weight:900">Insignias</div>
        <div style="font-size:12px;color:var(--accent);font-weight:700;background:rgba(255,68,68,0.15);padding:2px 10px;border-radius:20px">${totalEarned}/${STATE.badges.length}</div>
      </div>
      <div style="font-size:12px;color:var(--text2)">Desbloquea insignias con tu actividad</div>
    </div>

    <!-- Quick stats bar -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:20px">
      ${[
        {label:'Rodadas',val:stats.rides||0,icon:'🏍'},
        {label:'Km',val:stats.total_km||0,icon:'🛣'},
        {label:'Racha',val:stats.streak||0,icon:'🔥'},
        {label:'Fotos',val:stats.photos||0,icon:'📸'},
      ].map(s => `
        <div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:10px 6px;text-align:center">
          <div style="font-size:18px;margin-bottom:2px">${s.icon}</div>
          <div style="font-size:16px;font-weight:800">${s.val}</div>
          <div style="font-size:10px;color:var(--text2)">${s.label}</div>
        </div>
      `).join('')}
    </div>

    ${categories.map(cat => {
      const catBadges = STATE.badges.filter(b => b.category === cat);
      const catEarned = catBadges.filter(b => earned.includes(b.id)).length;
      return `
      <div style="margin-bottom:24px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <div style="font-size:11px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:1px">${catLabels[cat]||cat}</div>
          <div style="font-size:11px;color:var(--text3)">${catEarned}/${catBadges.length}</div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
          ${catBadges.map(b => {
            const isEarned = earned.includes(b.id);
            const ub = STATE.userBadges.find(x => x.user_id === uid && x.badge_id === b.id);
            const currentVal = stats[b.stat_type] || 0;
            const pct = Math.min(100, Math.round((currentVal / b.threshold) * 100));
            const rarityColors = {common:'#9e9e9e',rare:'#2196f3',epic:'#9c27b0',legendary:'#ffd700'};
            const rarityColor = rarityColors[b.rarity] || '#9e9e9e';

            return `
              <div style="
                background:var(--card);
                border:1px solid ${isEarned ? rarityColor : 'var(--border)'};
                border-radius:14px;
                padding:14px 8px 12px;
                text-align:center;
                cursor:pointer;
                position:relative;
                transition:all 0.25s;
                ${!isEarned ? 'opacity:0.7' : ''}
              " onclick="showBadgeDetail(${b.id})">
                ${isEarned
                  ? `<div style="position:absolute;top:6px;right:6px;width:8px;height:8px;background:#4caf50;border-radius:50%;box-shadow:0 0 6px #4caf50"></div>`
                  : ''
                }
                <div style="margin-bottom:6px;display:flex;justify-content:center">
                  ${getBadgeSvg(b, isEarned)}
                </div>
                <div style="font-size:11px;font-weight:700;margin-bottom:4px;line-height:1.2">${b.name}</div>
                ${!isEarned ? `
                  <div style="font-size:9px;color:var(--text3);margin-bottom:6px">${currentVal}/${b.threshold}</div>
                  <div style="height:3px;background:var(--border);border-radius:2px;overflow:hidden">
                    <div style="height:100%;width:${pct}%;background:${rarityColor};border-radius:2px;transition:width 0.5s"></div>
                  </div>
                  <div style="font-size:9px;color:var(--text3);margin-top:3px">${pct}%</div>
                ` : `
                  <div style="font-size:9px;color:#4caf50">+${b.points_bonus} pts</div>
                `}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `}).join('')}
  `;
}

function showBadgeDetail(id) {
  const b = STATE.badges.find(x => x.id === id);
  if (!b) return;
  if (!STATE.user) { showLogin(); return; }
  const uid = STATE.user.id;
  const earned = STATE.userBadges.find(ub => ub.badge_id === id && ub.user_id === uid);
  const stats = getUserStats(uid);
  const currentVal = stats[b.stat_type] || 0;
  const rarityColors = {common:'#9e9e9e',rare:'#2196f3',epic:'#9c27b0',legendary:'#ffd700'};
  const rarityLabels = {common:'Común',rare:'Rara',epic:'Épica',legendary:'Legendaria'};
  const rarityColor = rarityColors[b.rarity] || '#9e9e9e';
  const rarityLabel = rarityLabels[b.rarity] || b.rarity;
  const pct = Math.min(100, Math.round((currentVal / b.threshold) * 100));

  openModal(`${b.name} <span style="font-size:11px;font-weight:400;color:${rarityColor}">${rarityLabel}</span>`, `
    <div style="text-align:center;margin-bottom:16px">
      <div style="margin-bottom:12px">${getBadgeSvg(b, !!earned)}</div>
      <div style="font-size:15px;font-weight:700;margin-bottom:4px">${b.name}</div>
      <div style="color:var(--text2);font-size:13px;margin-bottom:8px">${b.description}</div>
      <div style="display:inline-block;background:${rarityColor}22;color:${rarityColor};font-size:11px;font-weight:700;padding:2px 12px;border-radius:20px;border:1px solid ${rarityColor}44">${rarityLabel}</div>
    </div>
    ${earned ? `
      <div style="background:rgba(76,175,80,0.1);border:1px solid rgba(76,175,80,0.3);border-radius:10px;padding:12px;text-align:center">
        <div style="color:#4caf50;font-size:13px;font-weight:700">✅ Desbloqueada</div>
        <div style="color:var(--text2);font-size:12px;margin-top:4px">el ${new Date(earned.earned_at).toLocaleDateString()}</div>
        <div style="color:var(--accent);font-size:13px;font-weight:700;margin-top:6px">+${b.points_bonus} puntos</div>
      </div>
    ` : `
      <div style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px">
          <span style="color:var(--text2)">Progreso</span>
          <span style="font-weight:700">${currentVal} / ${b.threshold}</span>
        </div>
        <div style="height:8px;background:var(--border);border-radius:4px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,${rarityColor},${rarityColor}aa);border-radius:4px;transition:width 0.5s"></div>
        </div>
        <div style="text-align:center;font-size:12px;color:var(--text3);margin-top:6px">${pct}% completo</div>
      </div>
      <div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:12px;text-align:center">
        <div style="font-size:12px;color:var(--text2);margin-bottom:4px">Recompensa al desbloquear</div>
        <div style="color:var(--accent);font-size:16px;font-weight:800">+${b.points_bonus} puntos</div>
      </div>
    `}
  `);
}

// ============================================================
// PROFILE PAGE
// ============================================================
function renderProfile() {
  const u = STATE.user;
  if (!u) { showLogin(); return; }
  const lv = levelOf(u.points);
  const progress = levelProgress(u.points);
  const next = nextLevel(u.points);
  const earned = STATE.userBadges.filter(ub => ub.user_id === u.id).map(ub => ub.badge_id);
  const stats = getUserStats(u.id);

  document.getElementById('page-profile').innerHTML = `
    <div style="display:flex;align-items:center;margin-bottom:16px">
      <button onclick="popNav()" style="display:inline-flex;align-items:center;gap:5px;padding:7px 15px;background:var(--surface2);border:1.5px solid var(--accent);border-radius:10px;font-size:13px;font-weight:700;color:var(--accent);cursor:pointer;transition:all 0.15s" onmouseover="this.style.background='var(--accent)';this.style.color='#fff'" onmouseout="this.style.background='var(--surface2)';this.style.color='var(--accent)'">← Volver</button>
    </div>
    <div style="text-align:center;margin-bottom:24px">
      <div style="margin:0 auto 12px;display:flex;flex-direction:column;align-items:center;gap:10px">
        <div style="position:relative;width:96px;height:96px">
          <div id="profile-pic-display">${renderAvatar(u, 96, '', true)}</div>
          <button onclick="document.getElementById('profile-pic-input').click()" style="position:absolute;bottom:0;right:0;width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#ff2020,#ff6600);border:3px solid var(--bg);display:flex;align-items:center;justify-content:center;font-size:15px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.3)">📷</button>
        </div>
        <input type="file" id="profile-pic-input" accept="image/*" style="display:none" onchange="previewProfilePic(event)">
        <!-- Save / Cancel buttons — only shown after picking a file -->
        <div id="profile-pic-actions" style="display:none;gap:8px;justify-content:center;align-items:center;flex-wrap:wrap">
          <button onclick="confirmSaveProfilePic()" style="padding:8px 18px;border-radius:20px;border:none;background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;font-size:13px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px;box-shadow:0 4px 12px rgba(34,197,94,0.4)">✅ Guardar sí</button>
          <button onclick="cancelProfilePic()" style="padding:8px 18px;border-radius:20px;border:1px solid var(--border);background:transparent;color:var(--text2);font-size:13px;font-weight:600;cursor:pointer">✕ Cancelar</button>
        </div>
      </div>
      <div style="font-size:20px;font-weight:800">${u.username} ${u.is_admin ? '<span class="badge-gold" style="font-size:11px">ADMIN</span>' : ''}</div>
      <div style="color:var(--text2);font-size:13px">${u.email}</div>
      <div style="color:var(--text2);font-size:13px">${u.bike_model || 'Sin moto'}</div>
      ${u.bio ? `<div style="color:var(--text2);font-size:13px;margin-top:6px;font-style:italic">"${u.bio}"</div>` : ''}
    </div>

    <!-- Points / Level -->
    <div style="background:var(--card);border:1px solid var(--border);border-radius:16px;padding:16px;margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <div>
          <div style="font-size:11px;color:var(--text2);text-transform:uppercase;letter-spacing:1px">Nivel</div>
          <div style="font-size:22px;font-weight:900;background:linear-gradient(135deg,#ff4444,#ff8800);-webkit-background-clip:text;-webkit-text-fill-color:transparent">${lv.name}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:22px;font-weight:900;color:var(--accent)">${u.points}</div>
          <div style="font-size:11px;color:var(--text2)">puntos</div>
        </div>
      </div>
      <div style="height:6px;background:var(--border);border-radius:3px;overflow:hidden">
        <div style="height:100%;width:${progress}%;background:linear-gradient(90deg,#ff4444,#ff8800);border-radius:3px;transition:width 0.5s"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text3);margin-top:4px">
        <span>${lv.min} pts</span>
        <span>${next ? next.min : 'MAX'} pts</span>
      </div>
    </div>

    <!-- Stats Grid -->
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:16px">
      ${[
        {label:'Rodadas',val:stats.rides||0,sub:'completadas',color:'#ff4444'},
        {label:'Racha',val:stats.streak||0,sub:'días seguidos',color:'#ff8800'},
        {label:'Km Totales',val:stats.total_km||0,sub:'kilómetros',color:'#607d8b'},
        {label:'Rutas Creadas',val:stats.routes_created||0,sub:'rutas',color:'#009688'},
        {label:'Fotos',val:stats.photos||0,sub:'compartidas',color:'#ffeb3b'},
        {label:'Mensajes',val:stats.chat_messages||0,sub:'en chat',color:'#2196f3'},
        {label:'Insignias',val:earned.length,sub:'de ${STATE.badges.length}',color:'#9c27b0'},
        {label:'Días Activo',val:stats.days_active||0,sub:'desde unión',color:'#546e7a'},
      ].map(s => `
        <div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:12px;text-align:center;position:relative;overflow:hidden">
          <div style="position:absolute;top:0;left:0;right:0;height:3px;background:${s.color}"></div>
          <div style="font-size:20px;font-weight:900;margin-bottom:2px">${s.val}</div>
          <div style="font-size:12px;font-weight:700">${s.label}</div>
          <div style="font-size:10px;color:var(--text3)">${s.sub}</div>
        </div>
      `).join('')}
    </div>

    <!-- Earned Badges -->
    ${earned.length > 0 ? `
    <div style="margin-bottom:16px">
      <div style="font-size:12px;font-weight:700;color:var(--text2);margin-bottom:10px;text-transform:uppercase;letter-spacing:1px">Insignias Obtenidas</div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px">
        ${STATE.badges.filter(b => earned.includes(b.id)).map(b => `
          <div style="text-align:center;cursor:pointer" onclick="showBadgeDetail(${b.id})">
            <div style="margin-bottom:4px;display:flex;justify-content:center">${getBadgeSvg(b, true)}</div>
            <div style="font-size:10px;font-weight:600;line-height:1.2">${b.name}</div>
          </div>
        `).join('')}
      </div>
    </div>
    ` : ''}

    <!-- Locked Badges preview -->
    ${earned.length < STATE.badges.length ? `
    <div style="margin-bottom:16px">
      <div style="font-size:12px;font-weight:700;color:var(--text2);margin-bottom:8px;text-transform:uppercase;letter-spacing:1px">Próximas Insignias</div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px">
        ${STATE.badges.filter(b => !earned.includes(b.id)).slice(0,4).map(b => {
          const currentVal = stats[b.stat_type] || 0;
          const pct = Math.min(100, Math.round((currentVal / b.threshold) * 100));
          return `
            <div style="text-align:center;cursor:pointer;opacity:0.5" onclick="showBadgeDetail(${b.id})">
              <div style="margin-bottom:4px;display:flex;justify-content:center">${getBadgeSvg(b, false)}</div>
              <div style="font-size:10px;font-weight:600;line-height:1.2">${b.name}</div>
              <div style="font-size:9px;color:var(--text3)">${pct}%</div>
            </div>
          `;
        }).join('')}
      </div>
      <button class="btn btn-ghost" style="width:100%;margin-top:10px;font-size:12px" onclick="navigate('insignias')">Ver todas las insignias →</button>
    </div>
    ` : ''}

    <!-- My Password -->
    <div style="margin-top:16px;padding:16px;background:var(--surface);border:1px solid var(--border);border-radius:12px;margin-bottom:16px">
      <div style="font-size:12px;font-weight:700;color:var(--text2);margin-bottom:8px;text-transform:uppercase;letter-spacing:1px">Mi Contraseña</div>
      <div style="display:flex;align-items:center;gap:8px">
        <div style="flex:1;font-size:14px;font-weight:600" id="my-profile-pass">
          <span id="profile-pass-hidden">••••••••</span>
          <span id="profile-pass-visible" style="display:none;color:var(--accent)">${u.password}</span>
        </div>
        <button onclick="toggleMyPass()" style="padding:8px 14px;border-radius:20px;border:1px solid var(--border);background:var(--surface2);color:var(--text);font-size:12px;font-weight:700;cursor:pointer">👁️ Ver</button>
        <button onclick="copyMyPass()" style="padding:8px 14px;border-radius:20px;border:1px solid var(--border);background:var(--surface2);color:var(--text);font-size:12px;font-weight:700;cursor:pointer">📋 Copiar</button>
      </div>
    </div>

    <div style="margin-top:20px">
      <button class="btn btn-secondary" style="width:100%;margin-bottom:8px" onclick="editRider(${u.id})">Editar perfil</button>
      <button class="btn btn-secondary" style="width:100%;margin-bottom:8px" onclick="closeModal();navigate('rutas');setTimeout(createRoute,300)">Crear ruta</button>
      <button class="btn btn-ghost" style="width:100%;color:var(--danger)" onclick="logout()">Cerrar sesion</button>
    </div>
  `;
}

// ============================================================
// DM PAGE — chat directo con el admin
// ============================================================
let _dmMessages = [];
let _dmRefreshTimer = null;
let _dmLastTs = 0;

function renderDmPage() {
  if (!STATE.user) { showLogin(); return; }
  const el = document.getElementById('page-dm');
  if (!el) return;

  // Calculate message area height: viewport - topbar(56) - bottom-nav(72) - header(70) - input-bar(62) - padding(32)
  el.innerHTML = `
    <button onclick="navigate('inicio')" style="display:inline-flex;align-items:center;gap:5px;padding:7px 14px;background:var(--surface2);border:1.5px solid #6366f1;border-radius:10px;font-size:13px;font-weight:700;color:#6366f1;cursor:pointer;margin-bottom:10px">← Volver</button>
    <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--card);border:1px solid var(--border);border-radius:14px;margin-bottom:12px">
      <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#3b82f6);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">⚙️</div>
      <div>
        <div style="font-size:15px;font-weight:800">Admin</div>
        <div style="font-size:11px;color:var(--text2)">Chat directo · privado</div>
      </div>
    </div>

    <div id="dm-messages" style="display:flex;flex-direction:column;gap:10px;overflow-y:auto;height:calc(100vh - 310px);min-height:160px;padding-right:4px">
      <div style="text-align:center;padding:20px;color:var(--text3);font-size:12px">Cargando...</div>
    </div>

    <div style="margin-top:12px;display:flex;gap:8px;align-items:center;background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:8px 10px">
      <input id="dm-input" type="text" placeholder="Escribe al admin..." style="flex:1;background:transparent;border:none;color:var(--text);font-size:14px;outline:none;padding:4px 6px" onkeydown="if(event.key==='Enter')sendDmToAdmin()">
      <button onclick="sendDmToAdmin()" style="background:linear-gradient(135deg,#6366f1,#3b82f6);color:#fff;border:none;border-radius:50%;width:36px;height:36px;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 2px 8px rgba(99,102,241,0.4)">➤</button>
    </div>
  `;

  loadDmMessages();
  const badge = document.getElementById('dm-unread-badge');
  if (badge) badge.style.display = 'none';
  fetch('/api/dm', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from_admin: false, user_id: STATE.user.id, user_name: STATE.user.username, read_uid: STATE.user.id })
  }).catch(() => {});

  if (_dmRefreshTimer) clearInterval(_dmRefreshTimer);
  _dmRefreshTimer = setInterval(loadDmMessages, 4000);
}

async function loadDmMessages() {
  if (!STATE.user) return;
  const el = document.getElementById('dm-messages');
  if (!el) { clearInterval(_dmRefreshTimer); return; }
  try {
    const r = await fetch('/api/dm?userId=' + encodeURIComponent(STATE.user.id), { cache: 'no-store' });
    if (!r.ok) return;
    const { messages } = await r.json();
    _dmMessages = messages || [];
    const wasAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;

    if (_dmMessages.length === 0) {
      el.innerHTML = `
        <div style="text-align:center;padding:32px 16px;color:var(--text3)">
          <div style="font-size:36px;margin-bottom:10px">💬</div>
          <div style="font-size:13px;font-weight:600;color:var(--text2);margin-bottom:4px">Sin mensajes aún</div>
          <div style="font-size:12px">Escríbele al admin cualquier duda o comentario</div>
        </div>`;
      return;
    }

    el.innerHTML = _dmMessages.map(m => {
      const isAdmin = m.from_admin;
      return `
        <div style="display:flex;flex-direction:column;align-items:${isAdmin ? 'flex-start' : 'flex-end'}">
          ${isAdmin ? '<div style="font-size:10px;color:var(--text3);margin-bottom:3px;padding-left:4px">⚙️ Admin</div>' : ''}
          <div class="${isAdmin ? 'dm-bubble-admin' : 'dm-bubble-me'}" style="max-width:78%">${escHtml(m.text)}</div>
          <div style="font-size:9px;color:var(--text3);margin-top:3px;padding:0 4px">${timeAgo(new Date(m.ts).toISOString())}</div>
        </div>`;
    }).join('');

    if (wasAtBottom) el.scrollTop = el.scrollHeight;

    // Mark admin messages as read
    const hasUnread = _dmMessages.some(m => m.from_admin && !m.read);
    if (hasUnread) {
      fetch('/api/dm', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: STATE.user.id, user_name: STATE.user.username, from_admin: false, read_uid: STATE.user.id })
      }).catch(() => {});
      const badge = document.getElementById('dm-unread-badge');
      if (badge) badge.style.display = 'none';
    }
  } catch(e) {}
}

async function sendDmToAdmin() {
  if (!STATE.user) return;
  const input = document.getElementById('dm-input');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  try {
    await fetch('/api/dm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id:   STATE.user.id,
        user_name: STATE.user.username,
        text,
        from_admin: false
      })
    });
    loadDmMessages();
  } catch(e) { toast('Error al enviar mensaje'); }
}
