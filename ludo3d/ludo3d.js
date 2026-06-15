/* Ludo 3D — Biker Society. Página aparte (Three.js). Multijugador 2 riders por
   turnos vía la nube HeyValue (misma 'games' que la app). Lee la config y la
   sesión desde localStorage que deja la app principal (sin credenciales en este
   archivo). */
(function () {
  'use strict';
  const LUDO = window.LUDO = {};

  // ---------- Config / sesión (vienen de la app principal) ----------
  function readJSON(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  let HV = readJSON('bs_hv');
  let ME = readJSON('bs_ludo_session') || readJSON('bs_session');
  const ts = () => new Date().toISOString();

  // ---------- Nube ----------
  async function hv(method, path, body) {
    if (!HV) return null;
    const opts = { method, cache: 'no-store', headers: { Authorization: 'Basic ' + btoa(HV.user + ':' + HV.pass) } };
    if (body !== undefined) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
    try {
      const r = await fetch(HV.url + '/nc' + path, opts);
      if (r.status === 200) { const t = await r.text(); try { return JSON.parse(t); } catch (_) { return t; } }
      return r.status;
    } catch (e) { return null; }
  }
  async function loadGames() { const d = await hv('GET', '/' + HV.syncKey + '/games.json'); return Array.isArray(d) ? d : []; }
  function prune(arr) {
    const now = Date.now();
    return arr.filter(g => g.status !== 'finished' || (now - new Date(g.updated_at || now).getTime()) < 2 * 864e5).slice(-60);
  }
  async function saveGames(arr) { await hv('MKCOL', '/' + HV.syncKey); return hv('PUT', '/' + HV.syncKey + '/games.json', prune(arr)); }

  // ---------- Motor Ludo (2 jugadores: rojo creador vs amarillo) ----------
  const LOOP = [[6,1],[6,2],[6,3],[6,4],[6,5],[5,6],[4,6],[3,6],[2,6],[1,6],[0,6],[0,7],[0,8],[1,8],[2,8],[3,8],[4,8],[5,8],[6,9],[6,10],[6,11],[6,12],[6,13],[6,14],[7,14],[8,14],[8,13],[8,12],[8,11],[8,10],[8,9],[9,8],[10,8],[11,8],[12,8],[13,8],[14,8],[14,7],[14,6],[13,6],[12,6],[11,6],[10,6],[9,6],[8,5],[8,4],[8,3],[8,2],[8,1],[8,0],[7,0],[6,0]];
  const START = { red: 0, yellow: 26 };
  const HOME = { red: [[7,1],[7,2],[7,3],[7,4],[7,5]], yellow: [[7,13],[7,12],[7,11],[7,10],[7,9]] };
  const BASE = { red: [[1.5,1.5],[1.5,4.5],[4.5,1.5],[4.5,4.5]], yellow: [[10.5,10.5],[10.5,13.5],[13.5,10.5],[13.5,13.5]] };
  const SAFE = new Set([0, 13, 26, 39, 8, 21, 34, 47]);
  const COLHEX = { red: 0xe23b3b, yellow: 0xf2b417 };

  function route(color) { const a = []; for (let i = 0; i < 51; i++) a.push(LOOP[(START[color] + i) % 52]); HOME[color].forEach(c => a.push(c)); return a; }
  const ROUTE = { red: route('red'), yellow: route('yellow') };
  function gOther(g, id) { const p = g.players.find(x => x.id !== id); return p ? p.id : null; }
  function gName(g, id) { const p = g.players.find(x => x.id === id); return p ? p.username : '?'; }
  function gColor(g, id) { const p = g.players.find(x => x.id === id); return p ? p.color : 'red'; }
  function movable(tokens, dice) { const r = []; tokens.forEach((p, i) => { if (p === -1) { if (dice === 6) r.push(i); } else if (p < 55 && p + dice <= 55) r.push(i); }); return r; }
  function startGame(g) {
    g.players[0].color = 'red'; g.players[1].color = 'yellow';
    g.tokens = {}; g.players.forEach(p => g.tokens[p.id] = [-1, -1, -1, -1]);
    g.turn = g.players[0].id; g.phase = 'roll'; g.dice = null; g.sixCount = 0; g.status = 'playing';
    g.lastAction = '¡A jugar! Tira ' + g.players[0].username;
  }
  function endTurn(g) { g.turn = gOther(g, g.turn); g.phase = 'roll'; g.dice = null; g.sixCount = 0; }

  // ---------- Estado UI ----------
  let CURRENT = null, GAMES = [], poll = null, lastSig = '';

  function toast(m) { const t = document.getElementById('toast'); t.textContent = m; t.classList.add('show'); clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 2200); }

  // Sonido del dado (sintetizado, sin archivo): varios "clacks" cortos.
  let AC = null;
  function diceSound() {
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)();
      if (AC.state === 'suspended') AC.resume();
      const now = AC.currentTime;
      for (let i = 0; i < 5; i++) {
        const tt = now + i * 0.085 + Math.random() * 0.02;
        const o = AC.createOscillator(), g = AC.createGain();
        o.type = 'triangle'; o.frequency.value = 160 + Math.random() * 160;
        g.gain.setValueAtTime(0.0001, tt); g.gain.exponentialRampToValueAtTime(0.22, tt + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.09);
        o.connect(g); g.connect(AC.destination); o.start(tt); o.stop(tt + 0.12);
      }
    } catch (e) {}
  }
  let lastShownDie = null;
  function animateDie(value, withSound) {
    if (!die || !clock) return;
    die.userData.roll = { start: clock.getElapsedTime(), target: DIE_TARGET[value] || { x: 0, y: 0, z: 0 } };
    if (withSound) diceSound();
  }

  // ============ THREE.JS ============
  let renderer, scene, camera, controls, raycaster, ndc, pawns = [], die, clock;
  const U = 1;
  function cellToWorld(r, c) { return { x: (c - 7) * U, z: (r - 7) * U }; }

  const PATH = 0x1b2334; // casilla del camino (oscuro moderno)
  function cellColor(r, c) {
    // Esquinas (yards) vivas — 4 colores aunque jueguen 2
    if (r < 6 && c < 6) return 0xff5a5a;            // rojo (arriba-izq)
    if (r < 6 && c > 8) return 0x35d07f;            // verde (arriba-der)
    if (r > 8 && c < 6) return 0x4aa8ff;            // azul (abajo-izq)
    if (r > 8 && c > 8) return 0xffd24d;            // amarillo (abajo-der)
    // Centro (meta) por cuadrante
    if (r >= 6 && r <= 8 && c >= 6 && c <= 8) {
      if (r === 7 && c === 7) return 0xa78bfa;
      if (r < 7 && c < 7) return 0xff5a5a; if (r < 7 && c > 7) return 0x35d07f;
      if (r > 7 && c < 7) return 0x4aa8ff; if (r > 7 && c > 7) return 0xffd24d;
      return 0x7c3aed;
    }
    // Pasillos de casa (coloridos hasta el centro)
    if (r === 7 && c >= 1 && c <= 5) return 0xff5a5a;
    if (r === 7 && c >= 9 && c <= 13) return 0xffd24d;
    if (c === 7 && r >= 1 && r <= 5) return 0x35d07f;
    if (c === 7 && r >= 9 && r <= 13) return 0x4aa8ff;
    // Casillas de salida
    if (r === 6 && c === 1) return 0xff5a5a;
    if (r === 1 && c === 8) return 0x35d07f;
    if (r === 8 && c === 13) return 0xffd24d;
    if (r === 13 && c === 6) return 0x4aa8ff;
    return PATH;
  }

  const NUMCOL = { 1: '#e23b3b', 2: '#f2811d', 3: '#1f9d4d', 4: '#2f86e0', 5: '#7c3aed', 6: '#e3168a' };
  function numTexture(n) {
    const S = 160, cv = document.createElement('canvas'); cv.width = cv.height = S;
    const x = cv.getContext('2d');
    x.fillStyle = '#fbfbfd'; x.fillRect(0, 0, S, S);
    x.strokeStyle = NUMCOL[n]; x.lineWidth = 11; x.strokeRect(6, 6, S - 12, S - 12);
    x.fillStyle = NUMCOL[n]; x.font = 'bold 108px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(String(n), S / 2, S / 2 + 8);
    return new THREE.CanvasTexture(cv);
  }
  // Caras del cubo en orden [+x,-x,+y,-y,+z,-z] => números [1,6,2,5,3,4].
  // Rotación destino para dejar cada número MIRANDO ARRIBA (+y):
  const DIE_TARGET = { 1: { x: 0, y: 0, z: Math.PI / 2 }, 6: { x: 0, y: 0, z: -Math.PI / 2 }, 2: { x: 0, y: 0, z: 0 }, 5: { x: Math.PI, y: 0, z: 0 }, 3: { x: -Math.PI / 2, y: 0, z: 0 }, 4: { x: Math.PI / 2, y: 0, z: 0 } };

  function initThree() {
    const host = document.getElementById('scene');
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    host.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0d14);
    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 15, 13);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.enableDamping = true; controls.dampingFactor = 0.08;
    controls.minDistance = 10; controls.maxDistance = 30;
    controls.maxPolarAngle = Math.PI * 0.46;
    controls.enablePan = false;

    scene.add(new THREE.AmbientLight(0xffffff, 0.65));
    const dir = new THREE.DirectionalLight(0xffffff, 0.8); dir.position.set(6, 14, 8); scene.add(dir);

    // Base del tablero
    const slab = new THREE.Mesh(new THREE.BoxGeometry(15.6, 0.6, 15.6), new THREE.MeshStandardMaterial({ color: 0x10151f, roughness: 0.9 }));
    slab.position.y = -0.35; scene.add(slab);

    // Casillas (15x15) — colores vivos con brillo (look moderno)
    const tileGeo = new THREE.BoxGeometry(0.94, 0.14, 0.94);
    for (let r = 0; r < 15; r++) for (let c = 0; c < 15; c++) {
      const col = cellColor(r, c);
      const mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.55, metalness: 0.12 });
      if (col !== PATH) mat.emissive = new THREE.Color(col).multiplyScalar(0.25);
      const li = LOOP.findIndex(L => L[0] === r && L[1] === c);
      if (SAFE.has(li) && col === PATH) { mat.color = new THREE.Color(0x33405c); mat.emissive = new THREE.Color(0x66b3ff).multiplyScalar(0.3); }
      const m = new THREE.Mesh(tileGeo, mat);
      const w = cellToWorld(r, c); m.position.set(w.x, 0, w.z); scene.add(m);
    }

    // Dado con números [+x,-x,+y,-y,+z,-z] = [1,6,2,5,3,4]
    const dmats = [1, 6, 2, 5, 3, 4].map(n => new THREE.MeshStandardMaterial({ map: numTexture(n), roughness: 0.35 }));
    die = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.3, 1.3), dmats);
    die.position.set(8.5, 1.4, 8.5); scene.add(die);
    die.userData.roll = null;

    raycaster = new THREE.Raycaster(); ndc = new THREE.Vector2();
    // Desbloquear el audio al primer toque (requisito de los navegadores)
    window.addEventListener('pointerdown', function () { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); } catch (e) {} });
    renderer.domElement.addEventListener('pointerdown', onPick);
    window.addEventListener('resize', onResize);
    clock = new THREE.Clock();
    animate();
  }

  function makePawn(hex) {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: hex, metalness: 0.25, roughness: 0.45, emissive: 0x000000 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.4, 0.18, 20), mat); base.position.y = 0.16;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.3, 0.5, 20), mat); body.position.y = 0.5;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 20, 16), mat); head.position.y = 0.86;
    g.add(base, body, head); g.userData.mat = mat;
    return g;
  }

  function buildPawns(g) {
    pawns.forEach(p => scene.remove(p.group)); pawns = [];
    g.players.forEach(p => {
      for (let i = 0; i < 4; i++) {
        const grp = makePawn(COLHEX[p.color]);
        grp.userData = Object.assign(grp.userData, { playerId: p.id, idx: i, color: p.color });
        scene.add(grp); pawns.push({ group: grp, playerId: p.id, idx: i, color: p.color });
      }
    });
  }

  function place(g) {
    const me = ME && ME.id;
    const mv = (g.status === 'playing' && g.turn === me && g.phase === 'move') ? movable(g.tokens[me] || [], g.dice) : [];
    // contar fichas por celda para repartir
    const onCell = {};
    pawns.forEach(p => {
      const pos = (g.tokens[p.playerId] || [])[p.idx];
      const cell = pos < 0 ? BASE[p.color][p.idx] : ROUTE[p.color][pos];
      const key = cell[0] + ',' + cell[1];
      (onCell[key] = onCell[key] || []).push(p);
    });
    Object.values(onCell).forEach(grp => {
      grp.forEach((p, gi) => {
        const pos = (g.tokens[p.playerId] || [])[p.idx];
        const cell = pos < 0 ? BASE[p.color][p.idx] : ROUTE[p.color][pos];
        const w = cellToWorld(cell[0], cell[1]);
        let ox = 0, oz = 0;
        if (grp.length > 1) { ox = (gi % 2 ? .18 : -.18); oz = (gi < 2 ? -.18 : .18); }
        p.group.position.set(w.x + ox, 0.06, w.z + oz);
        const can = p.playerId === me && mv.includes(p.idx);
        p.group.userData.movable = can;
        p.group.userData.mat.emissive.setHex(can ? 0x227722 : 0x000000);
      });
    });
  }

  function onResize() { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); }

  function onPick(ev) {
    if (!CURRENT) return;
    const g = GAMES.find(x => x.id === CURRENT); if (!g || g.status !== 'playing') return;
    const me = ME && ME.id;
    if (g.turn !== me || g.phase !== 'move') return;
    const rect = renderer.domElement.getBoundingClientRect();
    ndc.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(pawns.filter(p => p.userData ? false : true).map(p => p.group), true);
    const list = raycaster.intersectObjects(pawns.map(p => p.group), true);
    if (!list.length) return;
    let o = list[0].object; while (o && o.userData && o.userData.idx === undefined && o.parent) o = o.parent;
    if (o && o.userData && o.userData.movable && o.userData.playerId === me) play(o.userData.idx);
  }

  function animate() {
    requestAnimationFrame(animate);
    const t = clock ? clock.getElapsedTime() : 0;
    // bob de fichas movibles
    pawns.forEach(p => { if (p.group.userData.movable) p.group.position.y = 0.06 + Math.abs(Math.sin(t * 4)) * 0.25; else if (p.group.position.y !== 0.06) p.group.position.y = 0.06; });
    if (die) {
      const R = die.userData.roll;
      if (R) {
        const e = t - R.start;
        if (e < 0.55) { die.rotation.x += 0.5; die.rotation.y += 0.4; die.rotation.z += 0.32; die.position.y = 2.2 + Math.sin(e * 18) * 0.6; }
        else if (e < 1.05) { const g = R.target; die.rotation.x += (g.x - die.rotation.x) * 0.28; die.rotation.y += (g.y - die.rotation.y) * 0.28; die.rotation.z += (g.z - die.rotation.z) * 0.28; die.position.y = 1.4; }
        else { die.rotation.set(R.target.x, R.target.y, R.target.z); die.userData.roll = null; }
      } else { die.position.y = 1.4 + Math.sin(t * 1.5) * 0.1; }
    }
    if (controls) controls.update();
    renderer.render(scene, camera);
  }

  // ============ ACCIONES ============
  async function create() {
    if (!ME) { toast('Abre el Ludo desde la app'); return; }
    const games = await loadGames();
    const dup = games.find(g => g.type === 'ludo3d' && g.status === 'waiting' && g.createdBy === ME.id);
    if (dup) { enter(dup.id); return; }
    const g = { id: Date.now() % 1000000, type: 'ludo3d', status: 'waiting', players: [{ id: ME.id, username: ME.username, color: 'red' }], createdBy: ME.id, tokens: {}, turn: null, phase: 'roll', dice: null, sixCount: 0, winner: null, created_at: ts(), updated_at: ts(), lastAction: 'Mesa creada, esperando rival...' };
    games.push(g); await saveGames(games); GAMES = games; toast('Mesa creada'); enter(g.id);
  }
  LUDO.create = create;
  LUDO.join = async function (id) {
    if (!ME) { toast('Abre el Ludo desde la app'); return; }
    const games = await loadGames(); const g = games.find(x => x.id === id);
    if (!g) { toast('Mesa no disponible'); showLobby(); return; }
    if (g.players.some(p => p.id === ME.id)) { GAMES = games; enter(id); return; } // continuar mi partida
    if (g.status !== 'waiting' || g.players.length >= 2) { toast('Esa mesa ya está llena'); showLobby(); return; }
    g.players.push({ id: ME.id, username: ME.username, color: 'yellow' }); startGame(g); g.updated_at = ts();
    await saveGames(games); GAMES = games; enter(id);
  };
  LUDO.roll = async function () {
    const games = await loadGames(); const g = games.find(x => x.id === CURRENT);
    if (!g || g.status !== 'playing' || g.turn !== ME.id || g.phase !== 'roll') return;
    const d = Math.floor(Math.random() * 6) + 1; g.dice = d; g.sixCount = d === 6 ? (g.sixCount || 0) + 1 : 0;
    if (d === 6 && g.sixCount >= 3) { g.lastAction = gName(g, g.turn) + ' sacó tres 6 — pierde turno'; endTurn(g); }
    else { const mv = movable(g.tokens[g.turn], d); if (!mv.length) { g.lastAction = gName(g, g.turn) + ' sacó ' + d + ', sin jugada'; endTurn(g); } else { g.phase = 'move'; g.lastAction = gName(g, g.turn) + ' sacó ' + d; } }
    g.updated_at = ts(); await saveGames(games); GAMES = games; refresh(g);
  };
  async function play(idx) {
    const games = await loadGames(); const g = games.find(x => x.id === CURRENT);
    if (!g || g.status !== 'playing' || g.turn !== ME.id || g.phase !== 'move') return;
    const me = ME.id, d = g.dice, toks = g.tokens[me];
    if (!movable(toks, d).includes(idx)) return;
    if (toks[idx] === -1) toks[idx] = 0; else toks[idx] += d;
    let captured = false; const reached = toks[idx] === 55; const color = gColor(g, me), pos = toks[idx];
    if (pos <= 50) { const li = (START[color] + pos) % 52; if (!SAFE.has(li)) { const opp = gOther(g, me), oc = gColor(g, opp), ot = g.tokens[opp]; for (let j = 0; j < 4; j++) if (ot[j] >= 0 && ot[j] <= 50 && (START[oc] + ot[j]) % 52 === li) { ot[j] = -1; captured = true; } } }
    g.lastAction = gName(g, me) + ' movió' + (captured ? ' y capturó 🎯' : '') + (reached ? ' ¡a meta! 🏁' : '');
    if (g.tokens[me].every(p => p === 55)) { g.status = 'finished'; g.winner = me; g.winReason = '¡' + gName(g, me) + ' ganó!'; awardWin(g); }
    else { if (d === 6 || captured || reached) { g.phase = 'roll'; g.dice = null; } else endTurn(g); }
    g.updated_at = ts(); await saveGames(games); GAMES = games; refresh(g);
  }
  function awardWin(g) {
    try {
      const credited = readJSON('ludo_credited') || [];
      if (credited.includes(g.id)) return; credited.push(g.id); localStorage.setItem('ludo_credited', JSON.stringify(credited));
      toast('🏆 ¡Ganaste! (+50 pts al volver a la app)');
      // marca para que la app sume los puntos al volver
      const pend = readJSON('ludo_winpts') || 0; localStorage.setItem('ludo_winpts', JSON.stringify(pend + 50));
    } catch (e) {}
  }

  // ============ NAV / UI ============
  LUDO.exit = function () { window.location.href = '../'; };
  LUDO.toLobby = function () { CURRENT = null; showLobby(); };

  function enter(id) {
    CURRENT = id; lastSig = '';
    document.getElementById('overlay').classList.add('hidden');
    document.getElementById('game-ui').classList.remove('hidden');
    startPoll();
    const g = GAMES.find(x => x.id === id); if (g) refresh(g);
    loadGames().then(games => { GAMES = games; const fg = games.find(x => x.id === id); if (fg) refresh(fg); else LUDO.toLobby(); });
  }

  function refresh(g) {
    if (!g || g.id !== CURRENT) return;
    // (re)construir fichas si cambió de partida
    if (!pawns.length || pawns[0].playerId !== g.players[0].id) { if (g.status !== 'waiting') buildPawns(g); }
    if (g.status === 'waiting') { document.getElementById('turn').textContent = 'Esperando rival…'; document.getElementById('rollbtn').classList.add('hidden'); document.getElementById('dieval').textContent = '⏳'; return; }
    if (!pawns.length) buildPawns(g);
    place(g);
    const me = ME.id, opp = g.players.find(p => p.id !== me);
    const dv = document.getElementById('dieval'); dv.textContent = g.dice || '🎲';
    // Dado nuevo: gíralo en 3D hasta el número y suénalo (para ambos jugadores)
    if (g.dice && g.dice !== lastShownDie) { lastShownDie = g.dice; animateDie(g.dice, true); }
    if (!g.dice) lastShownDie = null;
    const turnEl = document.getElementById('turn'), rb = document.getElementById('rollbtn');
    if (g.status === 'finished') { turnEl.textContent = g.winner === me ? '🏆 ¡Ganaste!' : 'Ganó ' + gName(g, g.winner); rb.classList.add('hidden'); }
    else if (g.turn === me) {
      if (g.phase === 'roll') { turnEl.textContent = 'Tu turno — tira el dado'; rb.classList.remove('hidden'); }
      else { turnEl.textContent = 'Toca una ficha que brilla 👆'; rb.classList.add('hidden'); }
    } else { turnEl.textContent = 'Turno de ' + (opp ? opp.username : '?') + '…'; rb.classList.add('hidden'); }
  }

  function startPoll() {
    if (poll) clearInterval(poll);
    poll = setInterval(async () => {
      if (!CURRENT) return;
      const games = await loadGames(); GAMES = games; const g = games.find(x => x.id === CURRENT);
      if (g) { const sig = g.updated_at + '|' + g.status + '|' + g.turn + '|' + g.phase + '|' + g.dice + '|' + g.players.length; if (sig !== lastSig) { lastSig = sig; refresh(g); } }
    }, 2500);
  }

  async function showLobby() {
    document.getElementById('game-ui').classList.add('hidden');
    const ov = document.getElementById('overlay'), box = document.getElementById('overlay-content');
    ov.classList.remove('hidden');
    if (!HV || !ME) { box.innerHTML = '<h1>🎲 Ludo 3D</h1><div class="sub">Abre el Ludo desde la app Biker Society (iniciá sesión primero).</div><button class="btn cyan" onclick="LUDO.exit()">Volver a la app</button>'; return; }
    box.innerHTML = '<h1>🎲 Ludo 3D</h1><div class="sub">Cargando mesas…</div>';
    const games = await loadGames(); GAMES = games;
    const lu = games.filter(g => g.type === 'ludo3d');
    const mine = lu.filter(g => g.status !== 'finished' && g.players.some(p => p.id === ME.id));
    const open = lu.filter(g => g.status === 'waiting' && !g.players.some(p => p.id === ME.id));
    let h = '<h1>🎲 Ludo 3D</h1><div class="sub">Reta a otro rider · 2 jugadores</div>';
    h += '<button class="btn cyan" style="width:100%;margin-bottom:14px" onclick="LUDO.create()">+ Crear mesa nueva</button>';
    if (mine.length) { h += '<div class="muted" style="margin:6px 2px">TUS PARTIDAS</div>'; mine.forEach(g => { const o = g.players.find(p => p.id !== ME.id); const t = g.status === 'waiting' ? 'Esperando rival' : (g.turn === ME.id ? 'Tu turno' : 'Turno del rival'); h += '<div class="card row" style="cursor:pointer" onclick="LUDO.join(' + g.id + ')"><div><div style="font-weight:700">vs ' + (o ? o.username : '(esperando)') + '</div><div class="muted">' + t + '</div></div><span style="color:#00d4ff">▶</span></div>'; }); }
    h += '<div class="muted" style="margin:12px 2px 6px">MESAS ABIERTAS</div>';
    if (open.length) open.forEach(g => { h += '<div class="card row"><div><div style="font-weight:700">Mesa de ' + g.players[0].username + '</div><div class="muted">Esperando rival</div></div><button class="btn cyan" onclick="LUDO.join(' + g.id + ')">Unirse</button></div>'; });
    else h += '<div class="muted" style="text-align:center;padding:10px">No hay mesas. ¡Crea una!</div>';
    h += '<button class="btn" style="width:100%;margin-top:12px" onclick="LUDO.exit()">← Volver a la app</button>';
    box.innerHTML = h;
  }

  // ---------- Arranque ----------
  try { initThree(); } catch (e) { console.error('Three init', e); }
  showLobby();
  setInterval(() => { if (!CURRENT) showLobby(); }, 4000); // refresca el lobby
})();
