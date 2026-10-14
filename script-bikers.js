// ============================================================
// BIKERS PAGE
// ============================================================
function renderBikers() {
  const search = '';
  const sorted = [...STATE.users].sort((a,b) => b.points - a.points);

  document.getElementById('page-bikers').innerHTML = `
    <div style="margin-bottom:16px">
      <div style="font-size:18px;font-weight:800;margin-bottom:12px">Bikers (${sorted.length})</div>
      <input class="input" type="text" id="biker-search" placeholder="Buscar por nombre..." oninput="searchBikers(this.value)">
    </div>
    <div id="bikers-list">
      ${sorted.map(r => renderRiderCard(r)).join('')}
    </div>
  `;
}

function searchBikers(q) {
  const filtered = STATE.users.filter(u => u.username.toLowerCase().includes(q.toLowerCase()));
  document.getElementById('bikers-list').innerHTML = filtered.length === 0
    ? '<div class="empty-state"><div class="empty-icon">🔍</div><div>Sin resultados</div></div>'
    : filtered.map(r => renderRiderCard(r)).join('');
}

function renderRiderCard(r) {
  const rank = STATE.users.sort((a,b) => b.points - a.points).findIndex(u => u.id === r.id) + 1;
  return `
    <div class="rider-card vanish" onclick="viewRider(${r.id})">
      <div class="rider-avatar" style="background:${avatarColor(r.id)}">
        ${r.profile_pic ? `<img src="${r.profile_pic}">` : initials(r.username)}
      </div>
      <div class="rider-info">
        <div class="rider-name">
          ${r.username}
          ${r.is_admin ? '<span class="badge-gold" style="padding:1px 5px;font-size:9px">ADMIN</span>' : ''}
          ${r.is_injured ? '<span class="badge-red" style="padding:1px 5px;font-size:9px">LESIONADO</span>' : ''}
        </div>
        <div class="rider-bike">${r.bike_model || 'Sin moto'}</div>
      </div>
      <div style="text-align:right">
        <div class="rider-points">${r.points} pts</div>
        <div style="font-size:11px;color:var(--text2)">#${rank}</div>
      </div>
    </div>
  `;
}

function viewRider(id) {
  STATE.selectedRider = STATE.users.find(u => u.id === id);
  navigate('rider-detail');
}

function renderRiderDetail(userId) {
  // If userId passed (from BikerGram), use it; else fall back to selectedRider
  const targetId = userId || STATE.selectedRider?.id;
  const r = STATE.users.find(u => u.id === targetId) || STATE.selectedRider;
  if (!r) { navigate('bikers'); return; }
  recalculateUserStats(r.id);
  const rank = STATE.users.sort((a,b) => b.points - a.points).findIndex(u => u.id === r.id) + 1;
  const lv = levelOf(r.points);
  const progress = levelProgress(r.points);
  const myBadges = STATE.userBadges.filter(ub => ub.user_id === r.id);
  const earned = myBadges.map(ub => ub.badge_id);
  const stats = getUserStats(r.id);
  const myEvents = STATE.attendance.filter(a => a.user_id === r.id).length;
  const followers = getFollowerCount(r.id);
  const following = getFollowingCount(r.id);
  const posts = STATE.posts.filter(p => p.user_id === r.id);

  document.getElementById('page-rider-detail').innerHTML = `
    <div style="display:flex;align-items:center;margin-bottom:16px">
      <button onclick="popNav()" style="display:inline-flex;align-items:center;gap:5px;padding:7px 15px;background:var(--surface2);border:1.5px solid var(--accent);border-radius:10px;font-size:13px;font-weight:700;color:var(--accent);cursor:pointer;transition:all 0.15s" onmouseover="this.style.background='var(--accent)';this.style.color='#fff'" onmouseout="this.style.background='var(--surface2)';this.style.color='var(--accent)'">← Volver</button>
      <span style="font-size:15px;font-weight:700;margin-left:4px">${r.username}</span>
    </div>
    <div style="text-align:center;margin-bottom:16px">
      <div style="margin:0 auto 12px;display:flex;justify-content:center">
        ${renderAvatar(r, 88, '', true)}
      </div>
      <div style="font-size:20px;font-weight:800">${r.username} ${r.is_admin ? '<span class="badge-gold" style="font-size:11px">ADMIN</span>' : ''}</div>
      <div style="color:var(--text2);font-size:13px;margin-top:4px">${r.bike_model || 'Sin moto'}</div>
      ${r.bio ? `<div style="font-size:13px;color:var(--text2);margin-top:8px;max-width:280px;margin-left:auto;margin-right:auto">${r.bio}</div>` : ''}
    </div>

    <div class="stat-row" style="margin-bottom:12px">
      <div class="stat-box"><div class="stat-val">${posts.length}</div><div class="stat-lbl">Posts</div></div>
      <div class="stat-box"><div class="stat-val">${followers}</div><div class="stat-lbl">Seguidores</div></div>
      <div class="stat-box"><div class="stat-val">${following}</div><div class="stat-lbl">Siguiendo</div></div>
    </div>

    <div style="display:flex;gap:8px;margin-bottom:16px;justify-content:center">
      ${renderFollowButton(r.id)}
      ${(STATE.user?.id === r.id || STATE.user?.is_admin) ? `<button class="btn btn-secondary" onclick="editRider(${r.id})" style="padding:8px 16px;font-size:13px">Editar</button>` : ''}
    </div>

    ${earned.length > 0 ? `
    <div style="margin-bottom:16px">
      <div style="font-size:12px;font-weight:700;margin-bottom:8px;color:var(--text2)">INSIGNIAS</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        ${STATE.badges.filter(b => earned.includes(b.id)).map(b => `
          <div style="text-align:center;cursor:pointer" onclick="showBadgeDetail(${b.id})" title="${b.name}">
            ${getBadgeSvg(b, true)}
          </div>
        `).join('')}
      </div>
    </div>
    ` : ''}

    <div style="border-top:1px solid var(--border);padding-top:12px">
      <div style="font-size:12px;font-weight:700;margin-bottom:8px;color:var(--text2)">PUBLICACIONES</div>
      ${posts.length === 0 ? `<div style="text-align:center;color:var(--text3);font-size:13px;padding:16px">No hay publicaciones todavia</div>` : ''}
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:2px">
        ${posts.map(p => `
          <div style="aspect-ratio:1;background:#000;overflow:hidden;cursor:pointer" onclick="openLightbox('${p.media_url || p.image_url || ''}')">
            ${(p.media_url || p.image_url) ? `<img src="${p.media_url || p.image_url}" style="width:100%;height:100%;object-fit:cover">` : `<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:20px;color:var(--text3)">📝</div>`}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function editRider(id) {
  const r = STATE.users.find(u => u.id === id);
  if (!r) return;
  const isAdmin = STATE.user?.is_admin;
  const isSelf = STATE.user?.id === id;
  const hasAward = r.is_distinguished;
  const badge20 = STATE.badges.find(b => b.id === 20);
  const hasBadge20 = STATE.userBadges.find(ub => ub.user_id === id && ub.badge_id === 20);

  openModal('Editar Perfil', `
    <!-- Avatar upload -->
    <div style="text-align:center;margin-bottom:16px">
      <div id="ed-avatar-preview" style="margin:0 auto 10px">
        ${renderAvatar(r, 96)}
      </div>
      <label for="ed-avatar" style="display:inline-block;padding:8px 18px;background:var(--card);border:1px solid var(--border);border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;transition:all 0.2s" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'">
        📷 Cambiar foto
      </label>
      <input type="file" id="ed-avatar" accept="image/*" style="display:none" onchange="previewAvatarUpload(event, ${id})">
      ${r.avatar ? `<button type="button" style="display:inline-block;margin-left:8px;padding:8px 14px;background:transparent;border:1px solid var(--border);border-radius:20px;font-size:12px;color:var(--danger);cursor:pointer" onclick="clearAvatar(${id})">Quitar</button>` : ''}
      <div style="font-size:10px;color:var(--text3);margin-top:6px">JPG, PNG, GIF, WEBP — máx 800px</div>
    </div>

    <input class="input" id="ed-username" value="${r.username}" placeholder="Usuario">
    <input class="input" id="ed-email" value="${r.email}" placeholder="Email">
    <input class="input" id="ed-bike" value="${r.bike_model}" placeholder="Modelo de moto">
    <input class="input" id="ed-city" value="${r.city}" placeholder="Ciudad">
    <input class="input" id="ed-bio" value="${r.bio}" placeholder="Biografia">
    ${isSelf ? `<input class="input" id="ed-pass" type="password" placeholder="Nueva contrasena (opcional)">` : ''}

    ${isAdmin && !isSelf ? `
      <div style="margin-top:12px;padding:12px;background:var(--card);border:1px solid var(--border);border-radius:10px">
        <div style="font-size:12px;font-weight:700;margin-bottom:8px;color:var(--accent)">Herramientas de Admin</div>
        <div style="margin-bottom:12px">
          <label style="font-size:12px;color:var(--text2)">Nueva contraseña</label>
          <input class="input" id="ed-pass" type="password" placeholder="Dejar vacio para no cambiar" style="margin-top:4px">
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <div>
            <div style="font-size:12px;font-weight:600">⭐ Insignia Destacado</div>
            <div style="font-size:11px;color:var(--text2)">+${badge20?.points_bonus||0} puntos bonus</div>
          </div>
          ${hasBadge20
            ? `<button class="btn btn-ghost" style="font-size:11px;color:var(--danger)" onclick="removeAdminAward(${id})">Quitar</button>`
            : `<button class="btn btn-primary" style="font-size:11px;padding:6px 14px" onclick="giveAdminAward(${id})">Dar Destacado</button>`
          }
        </div>
        <label style="display:flex;align-items:center;gap:8px;font-size:12px;cursor:pointer">
          <input type="checkbox" id="ed-isadmin" ${r.is_admin ? 'checked' : ''} onchange>
          Es Admin
        </label>
        <div style="margin-top:8px">
          <label style="font-size:12px;color:var(--text2)">Puntos (admin)</label>
          <input class="input" id="ed-points" type="number" value="${r.points}" style="margin-top:4px">
        </div>
      </div>
    ` : ''}

    <button class="btn btn-primary" style="width:100%;margin-top:16px" onclick="doEditRider(${id})">Guardar cambios</button>
    ${isSelf ? `<button class="btn btn-ghost" style="width:100%;margin-top:8px;color:var(--danger)" onclick="closeModal()">Cancelar</button>` : ''}
    ${isAdmin && !isSelf ? `<button class="btn btn-ghost" style="width:100%;margin-top:8px;color:var(--danger);border:1px solid var(--danger)" onclick="closeModal();deleteUser(${id})">🗑️ Eliminar miembro</button>` : ''}
  `);
}

// Live preview when user selects a new avatar
async function previewAvatarUpload(event, userId) {
  const file = event.target.files[0];
  if (!file) return;
  if (file.size > 8 * 1024 * 1024) { toast('Imagen muy grande (máx 8MB)'); return; }
  const compressed = await compressImage(file, 800, 0.82);
  if (!compressed) { toast('No se pudo procesar la imagen'); return; }
  // Store on user record (saved on submit)
  const r = STATE.users.find(u => u.id === userId);
  if (!r) return;
  r.avatar = compressed;
  // Live preview in modal
  const prev = document.getElementById('ed-avatar-preview');
  if (prev) prev.innerHTML = renderAvatar(r, 96);
  // Show "Quitar" button
  event.target.insertAdjacentHTML('afterend',
    `<button type="button" id="ed-avatar-clear" style="display:inline-block;margin-left:8px;padding:8px 14px;background:transparent;border:1px solid var(--border);border-radius:20px;font-size:12px;color:var(--danger);cursor:pointer" onclick="clearAvatar(${userId})">Quitar</button>`);
  toast('Foto cargada — guarda para aplicar');
}

function clearAvatar(userId) {
  const r = STATE.users.find(u => u.id === userId);
  if (!r) return;
  r.avatar = null;
  const prev = document.getElementById('ed-avatar-preview');
  if (prev) prev.innerHTML = renderAvatar(r, 96);
  const clr = document.getElementById('ed-avatar-clear');
  if (clr) clr.remove();
  const fileIn = document.getElementById('ed-avatar');
  if (fileIn) fileIn.value = '';
  toast('Foto quitada — guarda para confirmar');
}

function doEditRider(id, onSaveNav) {
  const r = STATE.users.find(u => u.id === id);
  if (!r) return;
  const isAdmin = STATE.user?.is_admin;
  r.username = document.getElementById('ed-username').value.trim() || r.username;
  r.email = document.getElementById('ed-email').value.trim() || r.email;
  r.bike_model = document.getElementById('ed-bike').value.trim();
  r.city = document.getElementById('ed-city').value.trim();
  r.bio = document.getElementById('ed-bio').value.trim();
  const newPass = document.getElementById('ed-pass')?.value;
  if (newPass) r.password = newPass;
  // Avatar is already set on r.avatar by previewAvatarUpload / clearAvatar

  if (isAdmin) {
    const edIsAdmin = document.getElementById('ed-isadmin');
    const edIsInjured = document.getElementById('ed-isinjured');
    const edPoints = document.getElementById('ed-points');
    if (edIsAdmin) r.is_admin = edIsAdmin.checked;
    if (edIsInjured) r.is_injured = edIsInjured.checked;
    if (edPoints) r.points = parseInt(edPoints.value) || r.points;
  }

  if (STATE.user?.id === id) STATE.user = r;
  ls('bs_session', STATE.user);
  saveState();
  recalculateUserStats(id);
  closeModal();
  if (onSaveNav) { onSaveNav(); }
  else { navigate(id === STATE.user?.id ? 'profile' : 'rider-detail'); }
  toast('Perfil actualizado!');
}

function giveAdminAward(id) {
  const r = STATE.users.find(u => u.id === id);
  if (!r) return;
  r.is_distinguished = true;
  const badge20 = STATE.badges.find(b => b.id === 20);
  const existing = STATE.userBadges.find(ub => ub.user_id === id && ub.badge_id === 20);
  if (!existing && badge20) {
    r.points = (r.points || 0) + badge20.points_bonus;
    STATE.userBadges.push({
      user_id: id, badge_id: 20, earned_at: new Date().toISOString(), stat_value: 1
    });
  }
  saveState();
  toast(`${r.username} получил статус Destacado! ⭐`);
  closeModal();
  if (id === STATE.user?.id) renderProfile();
  else renderAdmin();
}

function removeAdminAward(id) {
  const r = STATE.users.find(u => u.id === id);
  if (!r) return;
  r.is_distinguished = false;
  STATE.userBadges = STATE.userBadges.filter(ub => !(ub.user_id === id && ub.badge_id === 20));
  saveState();
  delete STATE.userStats[id];
  toast(`Destacado removido de ${r.username}`);
  closeModal();
  renderAdmin();
}

