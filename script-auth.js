// ============================================================
// LOGIN / REGISTER
// ============================================================
function showLogin() {
  closeFpanel(); // always close floating panel to prevent overlay blocking clicks
  STATE.navStack = [];
  renderBreadcrumb();
  document.getElementById('page-login').style.display = 'flex';
  document.getElementById('page-login').innerHTML = `
    <img src="icons/logo.png" class="login-logo" alt="Biker Society">
    <div class="login-title">Biker Society</div>
    <div class="login-sub">La comunidad de motociclistas de Panama</div>
    <div class="login-form">
      <input class="input" type="text" id="li-user" placeholder="Usuario o email" autocomplete="off">
      <input class="input" type="password" id="li-pass" placeholder="Contraseña" autocomplete="off">
      <button class="btn btn-primary" style="width:100%;margin-bottom:10px" onclick="doLogin()">Entrar</button>
      <button class="btn btn-ghost" style="width:100%;margin-bottom:10px;font-size:13px" onclick="showForgotPassword()">Olvidé mi contraseña</button>
      <button class="btn btn-secondary" style="width:100%" onclick="showRegister()">Crear cuenta</button>
    </div>
  `;
  document.getElementById('bottomnav').style.display = 'none';
  document.getElementById('topbar').style.display = 'none';
}

function showForgotPassword() {
  document.getElementById('page-login').innerHTML = `
    <img src="icons/logo.png" class="login-logo" alt="Biker Society">
    <div class="login-title">Recuperar Contraseña</div>
    <div class="login-sub">Ingresa tu usuario o email y verificamos si existe tu cuenta</div>
    <div class="login-form">
      <input class="input" type="text" id="fp-input" placeholder="Usuario o email" autocomplete="off" oninput="checkRecoveryAccount()">
      <div id="fp-status" style="font-size:13px;min-height:20px;margin-bottom:10px"></div>
      <button class="btn btn-primary" id="fp-whatsapp-btn" style="width:100%;margin-bottom:10px" onclick="requestRecoveryCode()" disabled>📱 Escribir al WhatsApp</button>
      <button class="btn btn-ghost" style="width:100%" onclick="showLogin()">Volver al login</button>
    </div>
  `;
}

let _recoveryFoundUser = null;

function checkRecoveryAccount() {
  const val = document.getElementById('fp-input').value.trim().toLowerCase();
  const status = document.getElementById('fp-status');
  const btn = document.getElementById('fp-whatsapp-btn');
  _recoveryFoundUser = null;
  btn.disabled = true;
  btn.style.opacity = '0.5';

  if (!val || val.length < 2) {
    status.innerHTML = '';
    return;
  }

  // Check if it's an email or username
  const isEmail = val.includes('@');
  let user = null;
  if (isEmail) {
    user = STATE.users.find(x => x.email && x.email.toLowerCase() === val);
  } else {
    user = STATE.users.find(x => x.username && x.username.toLowerCase() === val);
  }

  if (user) {
    _recoveryFoundUser = user;
    status.innerHTML = `<span style="color:#22c55e">✅ Cuenta encontrada: @${user.username} (${user.email})</span>`;
    btn.disabled = false;
    btn.style.opacity = '1';
  } else {
    status.innerHTML = `<span style="color:#e74c3c">❌ No existe cuenta con ese usuario o email</span>`;
  }
}

async function requestRecoveryCode() {
  const input = document.getElementById('fp-input').value.trim();
  if (!_recoveryFoundUser) { toast('Primero verifica que tu cuenta existe'); return; }
  const user = _recoveryFoundUser;
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const record = {
    code,
    userId: user.id,
    username: user.username,
    email: user.email,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    used: false
  };
  let codes = await loadFromHV('recovery_codes') || {};
  codes[user.email] = record;
  await saveToHV('recovery_codes', codes);
  ls('bs_recovery_pending', user.email);
  const msg = encodeURIComponent(`Hola! Necesito recuperar mi clave de Biker Society.\nMi usuario: @${user.username}\nMi email: ${user.email}`);
  window.open(`https://wa.me/50768344847?text=${msg}`, '_blank');
  toast('Abriendo WhatsApp...');
}

function showResetPassword() {
  document.getElementById('page-login').innerHTML = `
    <img src="icons/logo.png" class="login-logo" alt="Biker Society">
    <div class="login-title">Restablecer Contraseña</div>
    <div class="login-sub">Ingresa el código que recibiste y tu nueva contraseña</div>
    <div class="login-form">
      <input class="input" type="text" id="rp-email" placeholder="Tu email" autocomplete="off">
      <input class="input" type="text" id="rp-code" placeholder="Código de 6 dígitos" maxlength="6" autocomplete="off">
      <input class="input" type="password" id="rp-pass" placeholder="Nueva contraseña" autocomplete="off">
      <input class="input" type="password" id="rp-pass2" placeholder="Confirmar nueva contraseña" autocomplete="off">
      <button class="btn btn-primary" style="width:100%;margin-bottom:10px" onclick="doResetPassword()">Cambiar contraseña</button>
      <button class="btn btn-ghost" style="width:100%" onclick="showLogin()">Volver al login</button>
    </div>
  `;
}

async function doResetPassword() {
  const email = document.getElementById('rp-email').value.trim().toLowerCase();
  const code = document.getElementById('rp-code').value.trim();
  const pass = document.getElementById('rp-pass').value;
  const pass2 = document.getElementById('rp-pass2').value;
  if (!email || !code || !pass || !pass2) { toast('Completa todos los campos'); return; }
  if (pass !== pass2) { toast('Las contraseñas no coinciden'); return; }
  if (pass.length < 4) { toast('La contraseña debe tener al menos 4 caracteres'); return; }
  // Cargar códigos desde WebDAV
  const codes = await loadFromHV('recovery_codes') || {};
  const record = codes[email];
  if (!record || record.used) { toast('Código inválido o ya usado'); return; }
  if (new Date() > new Date(record.expiresAt)) { toast('El código expiró. Solicita uno nuevo.'); return; }
  if (record.code !== code) { toast('Código incorrecto'); return; }
  // Actualizar contraseña
  const userIdx = STATE.users.findIndex(x => x.email.toLowerCase() === email);
  if (userIdx === -1) { toast('Usuario no encontrado'); return; }
  STATE.users[userIdx].password = pass;
  // Marcar código como usado
  codes[email].used = true;
  await saveToHV('recovery_codes', codes);
  ls('bs_recovery_pending', null);
  // Sincronizar usuarios
  await syncToCloud();
  saveLocal();
  toast('¡Contraseña actualizada! Ya puedes iniciar sesión.');
  showLogin();
}

function showRegister() {
  document.getElementById('page-login').innerHTML = `
    <img src="icons/logo.png" class="login-logo" alt="Biker Society">
    <div class="login-title">Unete a Biker Society</div>
    <div class="login-sub">Crea tu cuenta gratis</div>
    <div class="login-form">
      <input class="input" type="text" id="reg-user" placeholder="Nombre de usuario" autocomplete="off">
      <input class="input" type="email" id="reg-email" placeholder="Email" autocomplete="off">
      <input class="input" type="text" id="reg-bike" placeholder="Marca y modelo de tu moto (opcional)" autocomplete="off">
      <input class="input" type="password" id="reg-pass" placeholder="Contraseña" autocomplete="off">
      <button class="btn btn-primary" style="width:100%;margin-bottom:10px" onclick="doRegister()">Crear cuenta</button>
      <button class="btn btn-ghost" style="width:100%" onclick="showLogin()">Ya tengo cuenta</button>
    </div>
  `;
}

async function doLogin() {
  const u = document.getElementById('li-user').value.trim();
  const p = document.getElementById('li-pass').value;

  // La contraseña se valida en el servidor (/api/login); la lista de usuarios
  // ya no trae contraseñas.
  let user = null;
  try {
    const r = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: u, pass: p }) });
    if (r.ok) user = (await r.json()).user || null;
  } catch(e) { toast('Sin conexión'); return; }

  if (!user) { toast('Usuario o contraseña incorrectos'); return; }
  const known = STATE.users.findIndex(x => x.id === user.id);
  if (known >= 0) { user = { ...STATE.users[known], ...user }; STATE.users[known] = user; } else STATE.users.push(user);
  ls('bs_users', STATE.users);
  STATE.user = user;
  ls('bs_session', user);

  // Digital notification chime on login — Web Audio API, no file needed
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch(e) {}

  document.getElementById('page-login').style.display = 'none';
  document.getElementById('topbar').style.display = 'flex';
  document.getElementById('bottomnav').style.display = 'flex';
  navigate('inicio');
  toast('Bienvenido, ' + user.username + '!');
  startPresence();
  if (typeof _loginTs !== 'undefined') _loginTs = Date.now();

  // Sync cloud data silently in background — no visible re-render triggered
  if (HV.user && HV.pass) {
    syncFromCloud(true).then(() => saveLocal()).catch(() => {});
    // Refresh EC2 users list in background
    fetch('/api/db').then(r => r.ok ? r.json() : null).then(db => {
      if (db && Array.isArray(db.users) && db.users.length > 0) {
        const ec2Map = new Map(db.users.map(x => [x.id, x]));
        const localOnly = (STATE.users || []).filter(x => !ec2Map.has(x.id));
        STATE.users = [...db.users, ...localOnly];
        ls('bs_users', STATE.users);
      }
    }).catch(() => {});
  }
  startRifaOverlayPoll();
  startBroadcastPoll();
  updateNotifBadge();
  startDmPoll();
  startSwKeepalive();
  requestNotificationPermission();
}

async function doRegister() {
  const username = document.getElementById('reg-user').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const bike = document.getElementById('reg-bike').value.trim();
  const password = document.getElementById('reg-pass').value;
  if (!username || !email || !password) { toast('Completa todos los campos'); return; }
  if (STATE.users.find(x => x.username?.toLowerCase() === username.toLowerCase())) { toast('Ese usuario ya existe'); return; }
  if (STATE.users.find(x => x.email?.toLowerCase() === email.toLowerCase())) { toast('Ese email ya esta registrado'); return; }
  const newUser = {
    id: Date.now() % 100000,
    username, email, password,
    is_admin: 0, is_injured: 0, injury_note: '',
    bike_model: bike, points: 50,
    profile_pic: '', bio: '', city: 'Panama', experience_level: 'novato'
  };
  STATE.users.push(newUser);
  STATE.user = newUser;
  ls('bs_users', STATE.users);
  ls('bs_session', newUser);
  await _ec2Push(); // guardar en EC2 inmediatamente antes de continuar
  document.getElementById('page-login').style.display = 'none';
  document.getElementById('topbar').style.display = 'flex';
  document.getElementById('bottomnav').style.display = 'flex';
  navigate('inicio');
  toast('Cuenta creada! Bienvenido, ' + username + '!');
}

function showHVSetup() {
  openModal('Configurar HeyValue Cloud', `
    <p style="font-size:13px;color:var(--text2);margin-bottom:16px">Conecta tu almacenamiento en la nube para sincronizar datos entre dispositivos.</p>
    <input class="input" type="text" id="hv-user" placeholder="Usuario de Nextcloud" value="${HV.user}">
    <input class="input" type="password" id="hv-pass" placeholder="App password" value="${HV.pass}">
    <p style="font-size:11px;color:var(--text3);margin-bottom:16px">Crea una app password en cloud.heyvalue.com → Configuración → Seguridad → Contraseñas de aplicacion</p>
    <button class="btn btn-primary" style="width:100%" onclick="saveHVSetup()">Guardar y sincronizar</button>
  `);
}

async function saveHVSetup() {
  const u = document.getElementById('hv-user').value.trim();
  const p = document.getElementById('hv-pass').value;
  if (!u || !p) { toast('Completa ambos campos'); return; }

  // Discover WebDAV path via OCS API
  toast('Conectando a HeyValue...');
  try {
    const r = await fetch(HV.url + '/ocs/v1.php/cloud/user', {
      headers: { Authorization: 'Basic ' + btoa(u + ':' + p), 'OCS-APIREQUEST': 'true' }
    });
    const xml = await r.text();
    const idMatch = xml.match(/<id>([^<]+)<\/id>/);
    const displayName = xml.match(/<display-name>([^<]+)<\/display-name>/)?.[1] || u;
    if (idMatch) {
      HV.hvPath = idMatch[1];
      localStorage.setItem('hv_path', HV.hvPath);
      toast('HeyValue conectado! Descubriendo carpeta...');
    } else {
      toast('Error descubriendo usuario — usando email como path');
      HV.hvPath = '';
    }
  } catch(e) {
    toast('Error conectando: ' + e.message);
    return;
  }

  localStorage.setItem('hv_user', u);
  localStorage.setItem('hv_pass', p);
  HV.user = u; HV.pass = p;
  closeModal();

  // Ensure RuedeGram folder exists
  toast('Creando carpeta BikerGram...');
  await hvRequest('MKCOL', '/' + HV.gramFolder);
  await hvRequest('MKCOL', '/' + HV.gramFolder + '/photos');
  await hvRequest('MKCOL', '/' + HV.gramFolder + '/videos');
  await hvRequest('MKCOL', '/' + HV.gramFolder + '/audio');

  syncFromCloud().then(() => { saveState(); navigate('inicio'); toast('HeyValue listo! Sincronizado.'); });
}

function logout() {
  if (_presenceInterval) { clearInterval(_presenceInterval); _presenceInterval = null; }
  STATE.user = null;
  ls('bs_session', null);
  showLogin();
}

