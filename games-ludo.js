// ============================================================
// JUEGOS — LUDO 2 jugadores, por turnos vía nube (HeyValue, clave 'games')
// Reutiliza la "plomería" multijugador (mesas, lobby, sondeo, retomar).
// Tablero 15x15 estándar; 2 colores opuestos: rojo (creador) vs amarillo.
// ============================================================
let GAMES = [];
let CURRENT_GAME = null;
let GVIEW = 'lobby';          // 'lobby' | 'game'
let _gamesPoll = null;
let _lastGameSig = '';

// --- Geometría del tablero ---
// Bucle principal de 52 casillas (r,c) en sentido horario desde la salida roja.
const LOOP = [
  [6,1],[6,2],[6,3],[6,4],[6,5],
  [5,6],[4,6],[3,6],[2,6],[1,6],[0,6],
  [0,7],
  [0,8],[1,8],[2,8],[3,8],[4,8],[5,8],
  [6,9],[6,10],[6,11],[6,12],[6,13],[6,14],
  [7,14],
  [8,14],[8,13],[8,12],[8,11],[8,10],[8,9],
  [9,8],[10,8],[11,8],[12,8],[13,8],[14,8],
  [14,7],
  [14,6],[13,6],[12,6],[11,6],[10,6],[9,6],
  [8,5],[8,4],[8,3],[8,2],[8,1],[8,0],
  [7,0],
  [6,0]
];
const START = { red: 0, yellow: 26 };
const HOME = {
  red:    [[7,1],[7,2],[7,3],[7,4],[7,5]],
  yellow: [[7,13],[7,12],[7,11],[7,10],[7,9]]
};
const BASE = {
  red:    [[1,1],[1,4],[4,1],[4,4]],
  yellow: [[10,10],[10,13],[13,10],[13,13]]
};
const SAFE = new Set([0,13,26,39,8,21,34,47]); // salidas + estrellas
const COL = { red: '#e23b3b', yellow: '#f2b417' };

function ludoRoute(color) {
  const r = [];
  for (let i = 0; i < 51; i++) r.push(LOOP[(START[color] + i) % 52]);
  HOME[color].forEach(c => r.push(c));
  return r; // índices 0..55 (55 = meta)
}
function tokenCell(g, color, pos) {
  if (pos < 0) return null;              // en base (se dibuja aparte)
  return ludoRoute(color)[pos];
}
function gOther(g, pid) { const p = g.players.find(x => x.id !== pid); return p ? p.id : null; }
function gName(g, pid) { const p = g.players.find(x => x.id === pid); return p ? p.username : '?'; }
function gColor(g, pid) { const p = g.players.find(x => x.id === pid); return p ? p.color : 'red'; }
function ts() { return new Date().toISOString(); }

// --- Nube ---
async function loadGames() { const d = await loadFromHV('games'); return Array.isArray(d) ? d : []; }
function pruneGames(arr) {
  const now = Date.now();
  return arr.filter(g => {
    if (g.status !== 'finished') return true;
    const age = now - new Date(g.updated_at || g.created_at || now).getTime();
    return age < 2 * 24 * 3600 * 1000;
  }).slice(-60);
}
async function saveGames(arr) { return saveToHV('games', pruneGames(arr)); }

// --- Lógica ---
function ludoStart(g) {
  g.players[0].color = 'red';
  g.players[1].color = 'yellow';
  g.tokens = {};
  g.players.forEach(p => { g.tokens[p.id] = [-1, -1, -1, -1]; });
  g.turn = g.players[0].id;   // empieza el creador (rojo)
  g.phase = 'roll'; g.dice = null; g.sixCount = 0; g.status = 'playing';
  g.lastAction = '¡A jugar! Tira ' + g.players[0].username;
}
function ludoMovable(tokens, dice) {
  const res = [];
  tokens.forEach((pos, i) => {
    if (pos === -1) { if (dice === 6) res.push(i); }
    else if (pos < 55) { if (pos + dice <= 55) res.push(i); }
  });
  return res;
}
function endTurn(g) { g.turn = gOther(g, g.turn); g.phase = 'roll'; g.dice = null; g.sixCount = 0; }
function reroll(g) { g.phase = 'roll'; g.dice = null; } // mismo jugador (mantiene sixCount)

// --- Acciones ---
async function ludoCreate() {
  if (!STATE.user) { toast('Inicia sesión primero'); return; }
  const games = await loadGames();
  const dup = games.find(g => g.type === 'ludo' && g.status === 'waiting' && g.createdBy === STATE.user.id);
  if (dup) { openLudoGame(dup.id); return; }
  const g = {
    id: Date.now() % 1000000, type: 'ludo', status: 'waiting',
    players: [{ id: STATE.user.id, username: STATE.user.username, color: 'red' }],
    createdBy: STATE.user.id, tokens: {}, turn: null, phase: 'roll', dice: null, sixCount: 0,
    winner: null, winReason: '', created_at: ts(), updated_at: ts(),
    lastAction: 'Mesa creada, esperando rival...'
  };
  games.push(g); await saveGames(games); GAMES = games;
  toast('Mesa creada — espera a que un rider se una');
  openLudoGame(g.id);
}
async function ludoJoin(id) {
  if (!STATE.user) { toast('Inicia sesión primero'); return; }
  const games = await loadGames();
  const g = games.find(x => x.id === id);
  if (!g || g.status !== 'waiting') { toast('Esa mesa ya no está disponible'); renderJuegos(); return; }
  if (g.players.some(p => p.id === STATE.user.id)) { openLudoGame(id); return; }
  g.players.push({ id: STATE.user.id, username: STATE.user.username, color: 'yellow' });
  ludoStart(g); g.updated_at = ts();
  await saveGames(games); GAMES = games;
  openLudoGame(id);
}
async function ludoRoll() {
  const games = await loadGames();
  const g = games.find(x => x.id === CURRENT_GAME);
  if (!g || g.status !== 'playing' || g.turn !== STATE.user.id || g.phase !== 'roll') return;
  const d = Math.floor(Math.random() * 6) + 1;
  g.dice = d;
  g.sixCount = (d === 6) ? (g.sixCount || 0) + 1 : 0;
  if (d === 6 && g.sixCount >= 3) {
    g.lastAction = gName(g, g.turn) + ' sacó tres 6 — pierde el turno';
    endTurn(g);
  } else {
    const mv = ludoMovable(g.tokens[g.turn], d);
    if (mv.length === 0) {
      g.lastAction = gName(g, g.turn) + ' sacó ' + d + ', sin jugada';
      endTurn(g);
    } else {
      g.phase = 'move';
      g.lastAction = gName(g, g.turn) + ' sacó ' + d;
    }
  }
  g.updated_at = ts(); await saveGames(games); GAMES = games; paintLudo(g);
}
async function ludoPlay(idx) {
  const games = await loadGames();
  const g = games.find(x => x.id === CURRENT_GAME);
  if (!g || g.status !== 'playing' || g.turn !== STATE.user.id || g.phase !== 'move') return;
  const me = STATE.user.id, d = g.dice, toks = g.tokens[me];
  if (!ludoMovable(toks, d).includes(idx)) { toast('Esa ficha no se puede mover'); return; }
  if (toks[idx] === -1) toks[idx] = 0; else toks[idx] += d;
  let captured = false;
  const reachedHome = toks[idx] === 55;
  const color = gColor(g, me), pos = toks[idx];
  if (pos <= 50) {
    const li = (START[color] + pos) % 52;
    if (!SAFE.has(li)) {
      const opp = gOther(g, me), oc = gColor(g, opp), ot = g.tokens[opp];
      for (let j = 0; j < 4; j++) {
        if (ot[j] >= 0 && ot[j] <= 50 && (START[oc] + ot[j]) % 52 === li) { ot[j] = -1; captured = true; }
      }
    }
  }
  g.lastAction = gName(g, me) + ' movió' + (captured ? ' y capturó 🎯' : '') + (reachedHome ? ' ¡a meta! 🏁' : '');
  if (g.tokens[me].every(p => p === 55)) {
    g.status = 'finished'; g.winner = me; g.winReason = '¡' + gName(g, me) + ' llevó sus 4 fichas a la meta!';
  } else {
    if (d === 6 || captured || reachedHome) reroll(g); else endTurn(g);
  }
  g.updated_at = ts(); await saveGames(games); GAMES = games; paintLudo(g);
}
function ludoAwardIfWon(g) {
  if (!STATE.user || g.status !== 'finished' || g.winner !== STATE.user.id) return;
  const credited = ls('ludo_credited') || [];
  if (credited.includes(g.id)) return;
  credited.push(g.id); ls('ludo_credited', credited);
  const u = STATE.users.find(x => x.id === STATE.user.id);
  if (u) { u.points = (u.points || 0) + 50; STATE.user.points = u.points; }
  saveState(); toast('🏆 ¡Ganaste el Ludo! +50 puntos');
}

// --- Lobby ---
function renderJuegos() {
  if (GVIEW === 'game' && CURRENT_GAME != null) { openLudoGame(CURRENT_GAME); return; }
  GVIEW = 'lobby'; CURRENT_GAME = null;
  const el = document.getElementById('page-juegos'); if (!el) return;
  startGamesPoll();
  el.innerHTML = `<div style="padding:24px;text-align:center;color:var(--text2);font-size:13px">Cargando mesas...</div>`;
  loadGames().then(g => { GAMES = g; if (GVIEW === 'lobby') paintLobby(); });
}
function ludoToLobby() { GVIEW = 'lobby'; CURRENT_GAME = null; renderJuegos(); }

function paintLobby() {
  const el = document.getElementById('page-juegos'); if (!el) return;
  const me = STATE.user?.id;
  const lu = GAMES.filter(g => g.type === 'ludo');
  const mine = lu.filter(g => g.status !== 'finished' && g.players.some(p => p.id === me));
  const open = lu.filter(g => g.status === 'waiting' && !g.players.some(p => p.id === me));
  const fin = lu.filter(g => g.status === 'finished' && g.players.some(p => p.id === me)).slice(-6).reverse();
  const card = (inner, ex) => `<div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:12px 14px;margin-bottom:10px;${ex || ''}">${inner}</div>`;
  let html = `<div style="padding:14px 0">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
      <span style="font-size:26px">🎲</span>
      <div><div style="font-size:20px;font-weight:900">Ludo</div>
      <div style="font-size:12px;color:var(--text2)">Reta a otro rider · 2 jugadores</div></div>
    </div>
    <button onclick="ludoCreate()" style="width:100%;margin:14px 0;padding:14px;border:none;border-radius:14px;background:linear-gradient(135deg,#00d4ff,#0088cc);color:#06222c;font-size:15px;font-weight:900;cursor:pointer;box-shadow:0 4px 16px rgba(0,212,255,0.35)">+ Crear mesa nueva</button>`;
  if (mine.length) {
    html += `<div style="font-size:12px;font-weight:800;color:var(--text2);margin:8px 2px">TUS PARTIDAS</div>`;
    mine.forEach(g => {
      const opp = g.players.find(p => p.id !== me);
      const waiting = g.status === 'waiting';
      const myTurn = g.status === 'playing' && g.turn === me;
      const badge = waiting ? `<span style="color:#fbbf24">⏳ Esperando rival</span>`
        : myTurn ? `<span style="color:#22c55e;font-weight:800">● Tu turno</span>`
          : `<span style="color:var(--text2)">Turno de ${opp ? opp.username : '?'}</span>`;
      html += card(`<div onclick="openLudoGame(${g.id})" style="display:flex;justify-content:space-between;align-items:center;cursor:pointer">
        <div><div style="font-weight:700;font-size:14px">vs ${opp ? opp.username : '(esperando)'}</div>
        <div style="font-size:12px;margin-top:2px">${badge}</div></div>
        <span style="font-size:18px;color:var(--accent)">▶</span></div>`, myTurn ? 'border-color:rgba(34,197,94,0.4)' : '');
    });
  }
  html += `<div style="font-size:12px;font-weight:800;color:var(--text2);margin:14px 2px 8px">MESAS ABIERTAS</div>`;
  if (open.length) {
    open.forEach(g => {
      html += card(`<div style="display:flex;justify-content:space-between;align-items:center">
        <div><div style="font-weight:700;font-size:14px">Mesa de ${g.players[0].username}</div>
        <div style="font-size:11px;color:var(--text2);margin-top:2px">Esperando un rival</div></div>
        <button onclick="ludoJoin(${g.id})" style="padding:8px 18px;border:none;border-radius:20px;background:linear-gradient(135deg,#00d4ff,#0088cc);color:#06222c;font-weight:800;font-size:13px;cursor:pointer">Unirse</button></div>`);
    });
  } else {
    html += `<div style="text-align:center;color:var(--text3);font-size:12px;padding:14px">No hay mesas abiertas. ¡Crea una!</div>`;
  }
  if (fin.length) {
    html += `<div style="font-size:12px;font-weight:800;color:var(--text2);margin:14px 2px 8px">RECIENTES</div>`;
    fin.forEach(g => {
      const opp = g.players.find(p => p.id !== me);
      const won = g.winner === me;
      html += card(`<div style="display:flex;justify-content:space-between;align-items:center">
        <div style="font-size:13px">vs ${opp ? opp.username : '?'}</div>
        <span style="font-size:12px;font-weight:800;color:${won ? '#22c55e' : '#ff6b6b'}">${won ? '🏆 Ganaste' : 'Perdiste'}</span></div>`);
    });
  }
  html += `</div>`;
  el.innerHTML = html;
}

// --- Partida ---
function openLudoGame(id) {
  CURRENT_GAME = id; GVIEW = 'game'; _lastGameSig = '';
  startGamesPoll();
  const g = GAMES.find(x => x.id === id); if (g) paintLudo(g);
  loadGames().then(games => {
    GAMES = games; const fg = games.find(x => x.id === id);
    if (fg) { if (GVIEW === 'game') paintLudo(fg); } else { ludoToLobby(); }
  });
}
function ludoBoardHTML(g) {
  const me = STATE.user?.id;
  // Casillas
  let cells = '';
  for (let r = 0; r < 15; r++) for (let c = 0; c < 15; c++) {
    let bg = 'rgba(255,255,255,0.06)';
    if (r < 6 && c < 6) bg = 'rgba(226,59,59,0.18)';
    else if (r > 8 && c > 8) bg = 'rgba(242,180,23,0.18)';
    else if ((r < 6 && c > 8) || (r > 8 && c < 6)) bg = 'rgba(255,255,255,0.02)';
    else if (r >= 6 && r <= 8 && c >= 6 && c <= 8) bg = 'rgba(124,58,237,0.30)';
    else if (r === 7 && c >= 1 && c <= 5) bg = 'rgba(226,59,59,0.45)';
    else if (r === 7 && c >= 9 && c <= 13) bg = 'rgba(242,180,23,0.45)';
    else if (r === 6 && c === 1) bg = COL.red;
    else if (r === 8 && c === 13) bg = COL.yellow;
    cells += `<div style="background:${bg}"></div>`;
  }
  // Casillas seguras (estrella)
  let stars = '';
  SAFE.forEach(li => {
    const [r, c] = LOOP[li];
    stars += `<div style="position:absolute;top:${(r + 0.5) * 100 / 15}%;left:${(c + 0.5) * 100 / 15}%;transform:translate(-50%,-50%);font-size:8px;color:rgba(255,255,255,0.5);z-index:2">★</div>`;
  });
  // Fichas
  const movable = (g.status === 'playing' && g.turn === me && g.phase === 'move')
    ? ludoMovable(g.tokens[me] || [], g.dice) : [];
  let toks = '';
  g.players.forEach(p => {
    const color = p.color, arr = g.tokens[p.id] || [-1, -1, -1, -1];
    // agrupar por celda para repartir las que coinciden
    const byCell = {};
    arr.forEach((pos, i) => {
      const cell = pos < 0 ? BASE[color][i] : tokenCell(g, color, pos);
      const key = cell[0] + ',' + cell[1];
      (byCell[key] = byCell[key] || []).push({ i, cell, pos });
    });
    Object.values(byCell).forEach(group => {
      group.forEach((t, gi) => {
        const [r, c] = t.cell;
        let top = (r + 0.5) * 100 / 15, left = (c + 0.5) * 100 / 15;
        if (group.length > 1) { top += (gi % 2 ? 1.3 : -1.3); left += (gi < 2 ? -1.3 : 1.3); }
        const canMove = p.id === me && movable.includes(t.i);
        const ring = canMove ? 'box-shadow:0 0 0 2px #fff,0 0 10px #22c55e;animation:ludoPulse 1s infinite;' : 'box-shadow:0 1px 3px rgba(0,0,0,.6);';
        toks += `<div ${canMove ? `onclick="ludoPlay(${t.i})"` : ''} style="position:absolute;top:${top}%;left:${left}%;transform:translate(-50%,-50%);width:5.2%;height:5.2%;border-radius:50%;background:${COL[color]};border:2px solid #fff;${ring}z-index:5;${canMove ? 'cursor:pointer' : ''}"></div>`;
      });
    });
  });
  return `<div style="position:relative;width:100%;max-width:340px;margin:0 auto;aspect-ratio:1">
    <div style="display:grid;grid-template-columns:repeat(15,1fr);grid-template-rows:repeat(15,1fr);width:100%;height:100%;gap:1px;background:rgba(255,255,255,0.04);border-radius:8px;overflow:hidden">${cells}</div>
    ${stars}${toks}
  </div>`;
}
function paintLudo(g) {
  const el = document.getElementById('page-juegos');
  if (!el || GVIEW !== 'game' || !g) return;
  if (g.status === 'finished') ludoAwardIfWon(g);
  const me = STATE.user?.id;
  const opp = g.players.find(p => p.id !== me);
  const myColor = gColor(g, me);
  const myTurn = g.status === 'playing' && g.turn === me;

  let top = `<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);margin-bottom:10px">
    <button onclick="ludoToLobby()" style="background:rgba(255,255,255,0.06);border:1px solid var(--border);color:var(--text);border-radius:10px;padding:6px 12px;font-size:13px;font-weight:700;cursor:pointer">← Mesas</button>
    <div style="flex:1"><div style="font-weight:800;font-size:14px">vs ${opp ? opp.username : '(esperando rival)'}</div>
    <div style="font-size:11px;color:var(--text2)">Tú: <span style="color:${COL[myColor]};font-weight:800">●</span> ${myColor === 'red' ? 'Rojo' : 'Amarillo'}</div></div></div>`;

  if (g.status === 'waiting') {
    el.innerHTML = top + `<div style="text-align:center;padding:40px 20px;color:var(--text2)">
      <div style="font-size:40px;margin-bottom:12px">⏳</div>
      <div style="font-weight:700;margin-bottom:6px">Esperando que un rider se una</div>
      <div style="font-size:12px">Tu mesa ya aparece en "Mesas abiertas".</div></div>`;
    return;
  }

  const turnLabel = g.status === 'finished'
    ? `<span style="color:${g.winner === me ? '#22c55e' : '#ff6b6b'};font-weight:900">${g.winner === me ? '🏆 ¡Ganaste!' : 'Perdiste'}</span>`
    : (myTurn ? `<span style="color:#22c55e;font-weight:900">● Tu turno</span>` : `<span style="color:var(--text2)">Turno de ${opp ? opp.username : '?'}…</span>`);

  const board = ludoBoardHTML(g);

  // Controles
  let ctrl = '';
  if (g.status === 'finished') {
    ctrl = `<button onclick="ludoToLobby()" style="width:100%;padding:13px;border:none;border-radius:12px;background:linear-gradient(135deg,#00d4ff,#0088cc);color:#06222c;font-weight:900;font-size:15px;cursor:pointer;margin-top:12px">Volver a las mesas</button>`;
  } else {
    const dieFace = g.dice ? `<div style="width:48px;height:48px;border-radius:10px;background:#fff;color:#111;display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:900;box-shadow:0 2px 6px rgba(0,0,0,.5)">${g.dice}</div>` : `<div style="width:48px;height:48px;border-radius:10px;background:rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;font-size:22px">🎲</div>`;
    let action = '';
    if (myTurn && g.phase === 'roll') {
      action = `<button onclick="ludoRoll()" style="flex:1;padding:13px;border:none;border-radius:12px;background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;font-weight:900;font-size:15px;cursor:pointer">🎲 Tirar dado</button>`;
    } else if (myTurn && g.phase === 'move') {
      action = `<div style="flex:1;text-align:center;font-size:13px;color:#22c55e;font-weight:700">Toca una ficha resaltada 👆</div>`;
    } else {
      action = `<div style="flex:1;text-align:center;font-size:13px;color:var(--text2)">Esperando al rival…</div>`;
    }
    ctrl = `<div style="display:flex;align-items:center;gap:12px;margin-top:14px">${dieFace}${action}</div>`;
  }

  const status = `<div style="text-align:center;font-size:12px;color:var(--text2);margin:8px 0 4px">${g.status === 'finished' ? g.winReason : (g.lastAction || '')}</div>`;

  el.innerHTML = `<div style="padding-bottom:20px">${top}
    <div style="text-align:center;font-size:13px;margin-bottom:10px">${turnLabel}</div>
    ${board}${status}${ctrl}</div>`;
}

// --- Sondeo en vivo ---
function startGamesPoll() {
  if (_gamesPoll) clearInterval(_gamesPoll);
  _gamesPoll = setInterval(async () => {
    if (STATE.currentPage !== 'juegos') { clearInterval(_gamesPoll); _gamesPoll = null; return; }
    try {
      const games = await loadGames(); GAMES = games;
      if (GVIEW === 'game' && CURRENT_GAME != null) {
        const g = games.find(x => x.id === CURRENT_GAME);
        if (g) { const sig = g.updated_at + '|' + g.status + '|' + g.turn + '|' + g.phase + '|' + g.dice; if (sig !== _lastGameSig) { _lastGameSig = sig; paintLudo(g); } }
      } else if (GVIEW === 'lobby') { paintLobby(); }
    } catch (e) {}
  }, 2500);
}

// CSS del pulso de fichas movibles
(function () {
  if (document.getElementById('ludo-css')) return;
  const s = document.createElement('style'); s.id = 'ludo-css';
  s.textContent = `@keyframes ludoPulse{0%,100%{box-shadow:0 0 0 2px #fff,0 0 6px #22c55e}50%{box-shadow:0 0 0 2px #fff,0 0 14px #22c55e}}`;
  document.head.appendChild(s);
})();
