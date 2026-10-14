// ============================================================
// FULL-SCREEN ROUTE MAP PICKER
// ============================================================
var _pickerPoints = []; // {lat, lng, name, type: 'start'|'stop'|'end'}
var _pickerMode = 'start'; // 'start' | 'stop' | 'end'
var _pickerMap = null;
var _pickerMarkers = [];

function openRouteMapPicker(existing) {
  // existing: optional {start, end, stops} to pre-fill
  _pickerPoints = [];
  if (existing) {
    if (existing.start) _pickerPoints.push({ lat: existing.start.lat, lng: existing.start.lng, name: existing.start.name || '', type: 'start' });
    if (existing.stops) existing.stops.forEach(s => _pickerPoints.push({ lat: s.lat, lng: s.lng, name: s.name || '', type: 'stop' }));
    if (existing.end) _pickerPoints.push({ lat: existing.end.lat, lng: existing.end.lng, name: existing.end.name || '', type: 'end' });
  }
  _pickerMode = _pickerPoints.length === 0 ? 'start' : 'stop';

  // Build overlay
  var overlay = document.createElement('div');
  overlay.id = 'route-picker-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:99998;background:var(--bg,#0d0d1a);display:flex;flex-direction:column';
  document.body.appendChild(overlay);

  // Top bar
  var topBar = document.createElement('div');
  topBar.style.cssText = 'flex-shrink:0;display:flex;align-items:center;gap:8px;padding:12px 16px;background:var(--surface,#1a1a2e);border-bottom:1px solid var(--border,rgba(255,255,255,0.1))';
  topBar.innerHTML = `
    <button onclick="closeRouteMapPicker()" style="background:none;border:none;color:var(--text2);cursor:pointer;font-size:18px;padding:4px;line-height:1">✕</button>
    <span style="font-size:15px;font-weight:700;flex:1;text-align:center">Elegir puntos de ruta</span>
    <div style="width:32px"></div>
  `;
  overlay.appendChild(topBar);

  // Instructions
  var instr = document.createElement('div');
  instr.id = 'picker-instr';
  instr.style.cssText = 'flex-shrink:0;padding:8px 16px;background:rgba(255,68,68,0.08);font-size:12px;color:#ff6666;text-align:center';
  overlay.appendChild(instr);

  // Search bar
  var searchBar = document.createElement('div');
  searchBar.style.cssText = 'flex-shrink:0;padding:8px 12px;background:var(--surface,#1a1a2e);border-bottom:1px solid var(--border,rgba(255,255,255,0.06))';
  searchBar.innerHTML = `
    <input id="picker-search" type="text" placeholder="🔍 Buscar gasolinera, restaurante, taller..." style="width:100%;background:var(--card,#252540);border:1px solid var(--border,rgba(255,255,255,0.1));color:var(--text,#e2e2f0);padding:10px 14px;border-radius:10px;font-size:13px;outline:none;box-sizing:border-box">
    <div id="picker-search-results" style="display:none;max-height:180px;overflow-y:auto;margin-top:6px;border-radius:10px;background:var(--card,#252540);border:1px solid var(--border,rgba(255,255,255,0.1))"></div>
  `;
  overlay.appendChild(searchBar);

  // Map container
  var mapDiv = document.createElement('div');
  mapDiv.id = 'picker-map';
  mapDiv.style.cssText = 'flex:1;min-height:0;z-index:1';
  overlay.appendChild(mapDiv);

  // Bottom panel
  var bottom = document.createElement('div');
  bottom.style.cssText = 'flex-shrink:0;padding:12px 16px;background:var(--surface,#1a1a2e);border-top:1px solid var(--border,rgba(255,255,255,0.1))';
  bottom.id = 'picker-bottom';
  overlay.appendChild(bottom);

  document.body.style.overflow = 'hidden';

  // Init map after DOM is ready
  setTimeout(() => {
    if (!window.L) { toast('Error: mapa no disponible'); closeRouteMapPicker(); return; }
    _pickerMap = L.map('picker-map', {zoomControl:true, attributionControl:false}).setView([8.9824, -79.5199], 12);
    _mapTile().addTo(_pickerMap);

    // Existing point markers
    _pickerPoints.forEach((p, i) => _addPickerMarker(p, i));

    // Tap on map to add point
    _pickerMap.on('click', function(e) {
      _handlePickerTap(e.latlng);
    });

    // POI layer: lugares de la base de datos visibles en el mapa
    loadPanamaPOIs().then(function() { _renderPickerPOIs(); });
    _pickerMap.on('moveend zoomend', _renderPickerPOIs);

    // Setup search
    setupPickerSearch();

    _updatePickerUI();
  }, 50);
}

function _handlePickerTap(latlng) {
  if (_pickerMode === 'done') return;
  var type = _pickerMode;
  var label = type === 'start' ? 'SALIDA' : type === 'stop' ? 'PARADA ' + (_pickerPoints.filter(p=>p.type==='stop').length + 1) : 'DESTINO';
  var color = type === 'start' ? '#22c55e' : type === 'stop' ? '#ff8800' : '#ef4444';
  var icon = type === 'start' ? '🟢' : type === 'stop' ? '🟠' : '🔴';

  var pt = { lat: latlng.lat, lng: latlng.lng, name: '', type: type };

  // Reverse-geocode approximate name
  fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}`)
    .then(r => r.json())
    .then(d => { pt.name = (d.address?.road || d.address?.neighbourhood || d.address?.suburb || 'Punto ' + _pickerPoints.length); _updatePickerUI(); })
    .catch(() => {});

  _pickerPoints.push(pt);
  _addPickerMarker(pt, _pickerPoints.length - 1);

  if (type === 'start') _pickerMode = 'stop';
  else if (type === 'stop') { /* stay in stop mode */ }
  else if (type === 'end') _pickerMode = 'done';

  _updatePickerUI();
}

function _addPickerMarker(p, idx) {
  var color = p.type === 'start' ? '#22c55e' : p.type === 'stop' ? '#ff8800' : '#ef4444';
  var icon = p.type === 'start' ? 'SALIDA' : p.type === 'stop' ? 'P' + (idx + 1) : 'DEST';
  var label = p.type === 'start' ? 'SALIDA' : p.type === 'stop' ? 'PARADA' : 'DESTINO';
  var div = L.divIcon({className:'', html:`<div style="background:${color};color:#fff;font-size:9px;font-weight:700;padding:3px 7px;border-radius:20px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.5)">${icon}</div>`});
  var m = L.marker([p.lat, p.lng], {icon:div}).addTo(_pickerMap).bindPopup(label);
  _pickerMarkers.push(m);
}

function _updatePickerUI() {
  var instr = document.getElementById('picker-instr');
  var bottom = document.getElementById('picker-bottom');
  if (!instr || !bottom) return;

  var stops = _pickerPoints.filter(p => p.type === 'stop');
  var hasStart = _pickerPoints.some(p => p.type === 'start');
  var hasEnd = _pickerPoints.some(p => p.type === 'end');
  var canFinish = hasStart && hasEnd;

  // Instruction
  if (_pickerMode === 'start') {
    instr.textContent = '👆 Tocá en el mapa para marcar la SALIDA';
  } else if (_pickerMode === 'stop') {
    instr.textContent = '👆 Tocá para agregar PARADAS (opcional) · Tocá DESTINO cuando termines';
  } else {
    instr.textContent = '✅ Ruta completa — usá los botones de abajo';
  }

  // Bottom panel
  bottom.innerHTML = `
    <div style="margin-bottom:10px;display:flex;gap:6px;flex-wrap:wrap">
      ${_pickerPoints.map((p, i) => `
        <div style="display:flex;align-items:center;gap:4px;padding:4px 8px;border-radius:20px;font-size:11px;font-weight:600;background:${p.type==='start'?'rgba(34,197,94,0.15)':p.type==='stop'?'rgba(255,136,0,0.15)':'rgba(239,68,68,0.15)'};border:1px solid ${p.type==='start'?'rgba(34,197,94,0.4)':p.type==='stop'?'rgba(255,136,0,0.4)':'rgba(239,68,68,0.4)'};color:${p.type==='start'?'#22c55e':p.type==='stop'?'#ff8800':'#ef4444'}">
          ${p.type==='start'?'🟢':p.type==='stop'?'🟠':'🔴'} ${p.name || p.type.toUpperCase()}
          <button onclick="_removePickerPoint(${i})" style="background:none;border:none;color:inherit;cursor:pointer;font-size:13px;padding:0;margin-left:2px;opacity:0.7">✕</button>
        </div>
      `).join('')}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      ${_pickerMode !== 'done' ? `
        ${_pickerMode === 'stop' && !hasEnd ? `<button onclick="_setPickerModeEnd()" style="padding:10px;border-radius:10px;border:1px solid rgba(239,68,68,0.4);background:rgba(239,68,68,0.1);color:#ef4444;font-size:13px;font-weight:700;cursor:pointer">🔴 Marcar DESTINO</button>` : ''}
        ${_pickerMode === 'stop' ? `<button onclick="_addStopMode()" style="padding:10px;border-radius:10px;border:1px solid rgba(255,136,0,0.4);background:rgba(255,136,0,0.1);color:#ff8800;font-size:13px;font-weight:700;cursor:pointer">🟠 + Parada</button>` : ''}
      ` : ''}
      <button onclick="_undoLastPoint()" style="padding:10px;border-radius:10px;border:1px solid var(--border,rgba(255,255,255,0.1));background:var(--surface2,#252540);color:var(--text2);font-size:13px;font-weight:600;cursor:pointer" ${_pickerPoints.length === 0 ? 'disabled style="opacity:0.4"' : ''}>↩ Deshacer</button>
      <button onclick="_confirmPicker()" style="padding:10px;border-radius:10px;border:none;background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;font-size:14px;font-weight:700;cursor:pointer" ${!canFinish ? 'disabled style="opacity:0.4"' : ''}>✅ Listo</button>
    </div>
  `;
}

function _removePickerPoint(idx) {
  var p = _pickerPoints[idx];
  if (_pickerMarkers[idx]) { _pickerMap.removeLayer(_pickerMarkers[idx]); _pickerMarkers[idx] = null; }
  _pickerPoints.splice(idx, 1);
  // Recalculate mode
  var hasStart = _pickerPoints.some(p => p.type === 'start');
  var hasEnd = _pickerPoints.some(p => p.type === 'end');
  _pickerMode = !hasStart ? 'start' : !hasEnd ? 'stop' : 'done';
  // Remove all markers and re-add
  _pickerMarkers.forEach(m => { if (m) _pickerMap.removeLayer(m); });
  _pickerMarkers = [];
  _pickerPoints.forEach((pt, i) => _addPickerMarker(pt, i));
  _updatePickerUI();
}

function _undoLastPoint() {
  if (_pickerPoints.length === 0) return;
  _removePickerPoint(_pickerPoints.length - 1);
}

function _setPickerModeEnd() {
  _pickerMode = 'end';
  _updatePickerUI();
}

function _addStopMode() {
  _pickerMode = 'stop';
  _updatePickerUI();
}

function _confirmPicker() {
  var start = _pickerPoints.find(p => p.type === 'start');
  var end = _pickerPoints.find(p => p.type === 'end');
  var stops = _pickerPoints.filter(p => p.type === 'stop');
  if (!start || !end) { toast('Marcá SALIDA y DESTINO'); return; }
  closeRouteMapPicker();

  // Detect form mode: 'rt-' = create, 'ert-' = edit
  var prefix = document.getElementById('rt-start-lat') ? 'rt' : document.getElementById('ert-start-lat') ? 'ert' : 'rt';

  // Fill start
  var startNameEl = document.getElementById(prefix + '-start-name') || document.getElementById(prefix + '-start-selected-name');
  if (startNameEl) startNameEl.textContent = start.name;
  var startLatEl = document.getElementById(prefix + '-start-lat');
  var startLngEl = document.getElementById(prefix + '-start-lng');
  if (startLatEl) startLatEl.value = start.lat.toFixed(6);
  if (startLngEl) startLngEl.value = start.lng.toFixed(6);
  var startSel = document.getElementById(prefix + '-start-selected');
  if (startSel) startSel.style.display = 'flex';
  var startBtn = document.getElementById(prefix + '-start-map-btn');
  if (startBtn) startBtn.style.display = 'none';

  // Fill end
  var endNameEl = document.getElementById(prefix + '-end-name') || document.getElementById(prefix + '-end-selected-name');
  if (endNameEl) endNameEl.textContent = end.name;
  var endLatEl = document.getElementById(prefix + '-end-lat');
  var endLngEl = document.getElementById(prefix + '-end-lng');
  if (endLatEl) endLatEl.value = end.lat.toFixed(6);
  if (endLngEl) endLngEl.value = end.lng.toFixed(6);
  var endSel = document.getElementById(prefix + '-end-selected');
  if (endSel) endSel.style.display = 'flex';
  var endBtn = document.getElementById(prefix + '-end-map-btn');
  if (endBtn) endBtn.style.display = 'none';

  // Fill stops
  var stopsCont = document.getElementById(prefix + '-stops-container');
  if (stopsCont) {
    stopsCont.innerHTML = '';
    stops.forEach((s) => {
      if (prefix === 'rt') addStopField(s.lat, s.lng, s.name);
      else addEditStopField(s.lat, s.lng, s.name);
    });
  }

  toast('✅ Puntos cargados — ' + (stops.length > 0 ? stops.length + ' parada(s)' : 'sin paradas'));
}

function closeRouteMapPicker() {
  if (_pickerMap) { _pickerMap.remove(); _pickerMap = null; }
  var overlay = document.getElementById('route-picker-overlay');
  if (overlay) overlay.remove();
  _pickerMarkers = [];
  _pickerPoints = [];
  _pickerMode = 'start';
  _pickerPOILayer = null;
  _pickerPOIRenderer = null;
  document.body.style.overflow = '';
}

// ============================================================
// POI LAYER — lugares de la DB visibles en el mapa del picker
// (solo agrega una capa de marcadores; no toca los tiles oscuros)
// ============================================================
var _pickerPOILayer = null;
var _pickerPOIRenderer = null;

function _poiCatColor(cat) {
  var m = {
    'Gasolinera':'#ff8800','Restaurante':'#22c55e','Comida rápida':'#facc15',
    'Hospedaje':'#3b82f6','Servicio':'#a855f7','Taller':'#a855f7',
    'Supermercado':'#f97316','Farmacia':'#06b6d4','Tienda':'#f59e0b',
    'Cafeteria':'#d97706','Banco':'#10b981','ATM':'#10b981',
    'Estacionamiento':'#64748b','Parqueo':'#64748b','Policia':'#3b82f6',
    'Hospital':'#ef4444','Centro comercial':'#ec4899','Entretenimiento':'#ec4899',
    'Mirador':'#84cc16'
  };
  return m[cat] || '#94a3b8';
}

function _renderPickerPOIs() {
  if (!_pickerMap || !PANAMA_POIS.length) return;
  if (_pickerPOILayer) { _pickerMap.removeLayer(_pickerPOILayer); _pickerPOILayer = null; }
  var zoom = _pickerMap.getZoom();
  if (zoom < 12) return; // muy alejado: ocultar para no saturar
  var bounds = _pickerMap.getBounds().pad(0.1);
  if (!_pickerPOIRenderer) _pickerPOIRenderer = L.canvas({ padding: 0.3 });
  var layer = L.layerGroup();
  var count = 0, MAX = 400;
  for (var i = 0; i < PANAMA_POIS.length && count < MAX; i++) {
    var p = PANAMA_POIS[i];
    if (!bounds.contains([p.lat, p.lng])) continue;
    var color = _poiCatColor(p.category);
    var mk = L.circleMarker([p.lat, p.lng], {
      renderer: _pickerPOIRenderer,
      radius: zoom >= 15 ? 7 : zoom >= 13 ? 5 : 4,
      fillColor: color, color: 'rgba(255,255,255,0.85)',
      weight: 1, fillOpacity: 0.85
    });
    mk.bindPopup(
      '<div style="min-width:160px;font-size:12px;line-height:1.5">' +
        '<b>' + (p.icon || '📍') + ' ' + escHtml(p.name || 'Lugar') + '</b><br>' +
        '<span style="color:#888">' + escHtml(p.subcategory || p.category || '') + '</span><br>' +
        '<button onclick="_pickerUsePOIIdx(' + i + ')" style="margin-top:6px;width:100%;padding:6px;border:none;border-radius:8px;background:linear-gradient(135deg,#ff4444,#ff8800);color:#fff;font-size:12px;font-weight:700;cursor:pointer">➕ Usar como punto</button>' +
      '</div>'
    );
    layer.addLayer(mk);
    count++;
  }
  _pickerPOILayer = layer.addTo(_pickerMap);
}

function _pickerUsePOIIdx(i) {
  var p = PANAMA_POIS[i];
  if (!p || !_pickerMap) return;
  _pickerMap.closePopup();
  _pickerGoToPOI(p.lat, p.lng, p.name);
}

function setupPickerSearch() {
  var searchInput = document.getElementById('picker-search');
  var resultsDiv = document.getElementById('picker-search-results');
  if (!searchInput || !resultsDiv) return;

  var _searchTimeout = null;
  var _poiMarkers = null;

  searchInput.addEventListener('input', function() {
    clearTimeout(_searchTimeout);
    var original = this.value.trim();
    var q = original.toLowerCase();
    _searchTimeout = setTimeout(function() {
      if (q.length < 2) {
        resultsDiv.style.display = 'none';
        if (_poiMarkers && _pickerMap) { _pickerMap.removeLayer(_poiMarkers); _poiMarkers = null; }
        return;
      }
      // Detectar coordenadas raw tipo "8.993, -79.519"
      var coords = parseRawCoords(original);
      if (coords) {
        if (_pickerMap) _pickerMap.setView([coords.lat, coords.lng], 16);
        if (_poiMarkers && _pickerMap) { _pickerMap.removeLayer(_poiMarkers); _poiMarkers = null; }
        resultsDiv.innerHTML = '<div onclick="_pickerGoToPOICoords(' + coords.lat + ',' + coords.lng + ')" style="display:flex;align-items:center;gap:10px;padding:10px 12px;cursor:pointer;border-bottom:1px solid rgba(255,255,255,0.05);transition:background 0.15s" onmouseover="this.style.background=\'rgba(255,68,68,0.08)\'" onmouseout="this.style.background=\'\'">' +
          '<div style="width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;background:#ff444422;border:1px solid #ff444455;font-size:14px">\ud83d\udccd</div>' +
          '<div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:600">Usar estas coordenadas</div>' +
          '<div style="font-size:11px;color:var(--text3)">' + coords.lat.toFixed(5) + ', ' + coords.lng.toFixed(5) + ' \u2014 luego escribe el nombre</div></div>' +
          '<div style="flex-shrink:0;font-size:11px;color:var(--text2);background:var(--surface2);padding:3px 8px;border-radius:20px;border:1px solid var(--border)">Tocar para marcar</div>' +
        '</div>';
        resultsDiv.style.display = 'block';
        return;
      }
      var norm = function(s) { return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); };
      var nq = norm(q);
      var matches = (PANAMA_POIS || []).filter(function(p) {
        return norm(p.name).indexOf(nq) !== -1 ||
               norm(p.subcategory).indexOf(nq) !== -1 ||
               norm(p.category).indexOf(nq) !== -1 ||
               norm(p.address).indexOf(nq) !== -1;
      });
      // Prioridad: nombre que empieza con lo escrito > nombre que lo contiene > resto
      matches.sort(function(a, b) {
        var rank = function(p) {
          var n = norm(p.name);
          return n.indexOf(nq) === 0 ? 0 : n.indexOf(nq) !== -1 ? 1 : 2;
        };
        return rank(a) - rank(b);
      });
      var pois = matches.slice(0, 10);

      if (!pois.length) {
        resultsDiv.innerHTML = '<div style="padding:12px;text-align:center;color:var(--text3);font-size:12px">Sin resultados</div>';
        resultsDiv.style.display = 'block';
        return;
      }

      // Color por categoría (mismas que la capa del mapa)
      var catColor = _poiCatColor;

      resultsDiv.innerHTML = pois.map(function(p) {
        return '<div onclick="_pickerGoToPOI(' + p.lat + ',' + p.lng + ',\'' + escHtml(p.name || 'Lugar').replace(/'/g, "\\'") + '\')" style="display:flex;align-items:center;gap:10px;padding:10px 12px;cursor:pointer;border-bottom:1px solid rgba(255,255,255,0.05);transition:background 0.15s" onmouseover="this.style.background=\'rgba(255,68,68,0.08)\'" onmouseout="this.style.background=\'\'">' +
          '<div style="width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;background:' + catColor(p.category) + '22;border:1px solid ' + catColor(p.category) + '55;font-size:14px">' + (p.icon || '📍') + '</div>' +
          '<div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + escHtml(p.name || 'Lugar') + '</div>' +
          '<div style="font-size:11px;color:var(--text3)">' + escHtml(p.subcategory || p.category || '') + '</div></div>' +
          '<div style="flex-shrink:0;font-size:11px;color:var(--text2);background:var(--surface2);padding:3px 8px;border-radius:20px;border:1px solid var(--border)">Tocar para marcar</div>' +
        '</div>';
      }).join('');

      resultsDiv.style.display = 'block';

      // Show markers on map
      if (_poiMarkers && _pickerMap) { _pickerMap.removeLayer(_poiMarkers); }
      _poiMarkers = L.featureGroup();
      pois.forEach(function(p) {
        var icon = L.circleMarker([p.lat, p.lng], {
          radius: 7, fillColor: catColor(p.category), color: '#fff', weight: 1.5, fillOpacity: 0.9
        });
        icon.bindPopup('<div style="min-width:150px;font-size:12px"><b>' + (p.icon||'📍') + ' ' + escHtml(p.name||'Lugar') + '</b><br><span style="color:#888">' + escHtml(p.subcategory||p.category||'') + '</span></div>');
        _poiMarkers.addLayer(icon);
      });
      _pickerMap.addLayer(_poiMarkers);
      if (pois.length === 1) {
        _pickerMap.setView([pois[0].lat, pois[0].lng], 15);
      } else {
        var group = L.featureGroup(_poiMarkers.getLayers());
        _pickerMap.fitBounds(group.getBounds().pad(0.2), {maxZoom: 14});
      }
    }, 150);
  });

  searchInput.addEventListener('focus', function() {
    if (this.value.trim().length >= 2) {
      this.dispatchEvent(new Event('input'));
    }
  });
}

function _pickerGoToPOICoords(lat, lng) {
  var name = prompt('Nombre del lugar:') || '';
  _pickerGoToPOI(lat, lng, name || (lat.toFixed(4) + ', ' + lng.toFixed(4)));
}

function _pickerGoToPOI(lat, lng, name) {
  // Add as next point in sequence
  _handlePickerTap({ lat: lat, lng: lng });
  // Override name after reverse geocode (or set directly)
  if (_pickerPoints.length > 0) {
    var last = _pickerPoints[_pickerPoints.length - 1];
    last.name = name;
  }
  document.getElementById('picker-search-results').style.display = 'none';
  document.getElementById('picker-search').value = '';
  _updatePickerUI();
}

// ============================================================
// PWA INSTALL
// ============================================================
window.addEventListener('beforeinstallprompt', function(e) {
  e.preventDefault(); // suppress browser mini-infobar
});

// ============================================================
// MAP TILE HELPER — auto dark/light based on hour
// CARTO exige API key desde 2026 (solo por ?key=); sin ella sale "API KEY REQUIRED"
const CARTO_KEY = 'cb1_4kqs_1_22592a7bf3e402f50e250d1a';
function _mapTile() {
  const h = new Date().getHours();
  const isNight = h < 6 || h >= 19; // 7pm – 6am = night
  if (isNight) {
    return L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=' + CARTO_KEY,
      {subdomains:'abcd', maxZoom:19, attribution:''});
  } else {
    return L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?key=' + CARTO_KEY,
      {subdomains:'abcd', maxZoom:19, attribution:''});
  }
}


// ============================================================
// MAPAS + EN RUTA EN VIVO
// ============================================================
const EN_RUTA = {
  active: false, watchId: null, pollInterval: null,
  map: null, myMarker: null, myAccCircle: null,
  riderMarkers: {}, lastPos: null, mySpeed: 0
};

function _enRutaCSS() {
  if (document.getElementById('er-style')) return;
  const s = document.createElement('style');
  s.id = 'er-style';
  s.textContent = `
    @keyframes erPulse{0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,.5)}50%{box-shadow:0 0 0 14px rgba(34,197,94,0)}}
    @keyframes erBlink{0%,100%{opacity:1}50%{opacity:.5}}
    #enruta-indicator.er-on{display:inline-flex!important;animation:erBlink 1.5s infinite}
    .er-panel{background:var(--card);padding:14px 16px 16px}
    .er-row{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)}
    .er-av{width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;color:#fff;flex-shrink:0}
  `;
  document.head.appendChild(s);
}

/* ── MAPAS page ── */
function renderMapas() {
  _enRutaCSS();
  const page = document.getElementById('page-mapas');
  if (!page) return;

  const today = new Date().toISOString().slice(0,10);
  const routes = (STATE.routes||[]).filter(rt=>rt.start_lat&&rt.end_lat&&(!rt.date||rt.date>=today));
  const hasRoutes = routes.length > 0;
  const mapH = window.innerHeight;

  const pillsHTML = hasRoutes ? `
    <div id="mapas-filter" style="position:absolute;top:64px;left:0;right:0;z-index:1000;display:flex;gap:8px;overflow-x:auto;padding:0 12px;scrollbar-width:none;-webkit-overflow-scrolling:touch">
      ${routes.map((rt,i)=>`<button onclick="_mapaSelectRoute(${i})" id="mapas-pill-${i}" style="flex-shrink:0;padding:8px 18px;border-radius:22px;border:none;background:${i===0?'#ff4444':'rgba(0,0,0,.65)'};backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);color:#fff;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;box-shadow:0 2px 12px rgba(0,0,0,.4)">${rt.name}</button>`).join('')}
    </div>` : '';

  const btnLabel = EN_RUTA.active ? '🏍️ EN RUTA · '+EN_RUTA.mySpeed+' km/h → ver mapa' : '🏍️ Iniciar En Ruta';
  const btnGrad  = EN_RUTA.active ? '#22c55e,#16a34a' : '#ff2020,#ff6600';

  page.innerHTML = `
    <div style="position:relative;width:100%;height:${mapH}px">
      <div id="mapas-map" style="width:100%;height:${mapH}px"></div>
      ${pillsHTML}
      <button id="mapas-locate-btn" onclick="_mapaLocateMe()" title="Mi ubicación"
        style="position:absolute;bottom:calc(72px + env(safe-area-inset-bottom) + 80px);right:14px;z-index:1200;width:44px;height:44px;border-radius:12px;border:none;background:rgba(20,20,30,.85);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);box-shadow:0 2px 12px rgba(0,0,0,.5);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:transform .15s">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" stroke-width="2.5" stroke-linecap="round">
          <circle cx="12" cy="12" r="3.5"/><line x1="12" y1="2" x2="12" y2="6.5"/><line x1="12" y1="17.5" x2="12" y2="22"/>
          <line x1="2" y1="12" x2="6.5" y2="12"/><line x1="17.5" y1="12" x2="22" y2="12"/>
        </svg>
      </button>
      <div id="mapas-start-btn" style="position:fixed;bottom:calc(72px + env(safe-area-inset-bottom) + 10px);left:12px;right:12px;z-index:1500">
        <div id="mapas-riders" style="font-size:11px;color:rgba(255,255,255,.75);text-align:center;margin-bottom:8px;text-shadow:0 1px 4px rgba(0,0,0,.8)">Cargando riders...</div>
        <button onclick="${EN_RUTA.active?"navigate('en-ruta')":'startEnRuta()'}"
          style="width:100%;background:linear-gradient(135deg,${btnGrad});color:#fff;border:none;border-radius:16px;padding:16px;font-size:16px;font-weight:800;cursor:pointer;box-shadow:0 4px 24px rgba(255,32,32,.45);letter-spacing:.3px">
          ${btnLabel}
        </button>
      </div>
    </div>`;

  window._mapaRoutes      = routes;
  window._mapaMap         = null;
  window._mapaSelectedIdx = 0;

  setTimeout(() => {
    if (!document.getElementById('mapas-map')) return;
    // Centrar en la primera ruta directamente para evitar re-posicionamientos visibles
    const rt0 = hasRoutes ? routes[0] : null;
    const initC = rt0
      ? [(parseFloat(rt0.start_lat)+parseFloat(rt0.end_lat))/2,
         (parseFloat(rt0.start_lng)+parseFloat(rt0.end_lng))/2]
      : [8.9824,-79.5199];
    const map = L.map('mapas-map',{zoomControl:false,attributionControl:false}).setView(initC,13);
    _mapTile().addTo(map);
    L.control.zoom({position:'topright'}).addTo(map);
    setTimeout(()=>map.invalidateSize(),300);
    window._mapaMap = map;
    if (hasRoutes) {
      _mapaDrawRoute(0);
    } else {
      navigator.geolocation&&navigator.geolocation.getCurrentPosition(pos=>{
        map.setView([pos.coords.latitude,pos.coords.longitude],13);
      },()=>{},{timeout:6000});
    }
  },150);

  fetch('/api/live-riders').then(r=>r.json()).then(riders=>{
    const el=document.getElementById('mapas-riders');
    if(!el) return;
    const list=Object.entries(riders);
    el.textContent = list.length===0 ? 'Ningún rider en ruta ahora'
      : list.map(([,d])=>`${d.username} ${d.speed}km/h`).join(' · ');
  }).catch(()=>{});
}

function _mapaLocateMe() {
  const map = window._mapaMap;
  if (!map) return;
  const btn = document.getElementById('mapas-locate-btn');
  if (btn) btn.style.transform = 'scale(.9)';
  navigator.geolocation.getCurrentPosition(pos => {
    map.setView([pos.coords.latitude, pos.coords.longitude], 15, {animate:true});
    if (btn) { btn.style.transform = ''; btn.querySelector('circle').setAttribute('fill','rgba(0,212,255,.25)'); }
  }, () => {
    if (btn) btn.style.transform = '';
    toast('No se pudo obtener tu ubicación');
  }, {enableHighAccuracy:true, timeout:8000, maximumAge:10000});
}

function _mapaSelectRoute(idx) {
  window._mapaSelectedIdx = idx;
  const routes=window._mapaRoutes||[];
  routes.forEach((_,i)=>{
    const p=document.getElementById(`mapas-pill-${i}`);
    if(!p) return;
    p.style.background=i===idx?'#ff4444':'rgba(0,0,0,.65)';
    p.style.color='#fff';
  });
  _mapaDrawRoute(idx);
}

function _mapaDrawRoute(idx) {
  const map=window._mapaMap;
  const rt=(window._mapaRoutes||[])[idx];
  if(!map||!rt) return;

  // Cancelar petición OSRM anterior si sigue pendiente
  if(window._mapaAbort) { try{window._mapaAbort.abort();}catch(e){} }
  window._mapaAbort = new AbortController();

  map.eachLayer(layer=>{ if(!(layer instanceof L.TileLayer)) map.removeLayer(layer); });

  const pts=[[parseFloat(rt.start_lat),parseFloat(rt.start_lng)]];
  let stops=[];
  try{stops=JSON.parse(rt.stops||'[]');}catch(e){}
  stops.forEach(s=>{ if(s.lat&&s.lng) pts.push([parseFloat(s.lat),parseFloat(s.lng)]); });
  pts.push([parseFloat(rt.end_lat),parseFloat(rt.end_lng)]);

  const pill=(bg,lbl)=>`<div style="background:${bg};color:#fff;font-size:10px;font-weight:700;padding:3px 8px;border-radius:20px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.5)">${lbl}</div>`;
  L.marker(pts[0],{icon:L.divIcon({className:'',html:pill('#22c55e','SALIDA'),iconAnchor:[20,10]})}).addTo(map);
  stops.forEach(s=>{ if(s.lat&&s.lng) L.marker([parseFloat(s.lat),parseFloat(s.lng)],{icon:L.divIcon({className:'',html:pill('#ff8800','PARADA'),iconAnchor:[24,10]})}).addTo(map); });
  L.marker(pts[pts.length-1],{icon:L.divIcon({className:'',html:pill('#ef4444','DESTINO'),iconAnchor:[26,10]})}).addTo(map);

  // Posicionar la vista SIN animación — un solo salto instantáneo, sin flash visible
  map.fitBounds(L.latLngBounds(pts),{padding:[40,40],animate:false});

  const coords=pts.map(p=>`${p[1]},${p[0]}`).join(';');
  fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`,
    {signal:window._mapaAbort.signal})
    .then(r=>r.json())
    .then(data=>{
      if(data.code!=='Ok'||!data.routes?.[0]) return;
      // La ruta aparece sobre el mapa ya posicionado — sin ningún re-pan ni zoom
      L.geoJSON(data.routes[0].geometry,{style:{color:'#ff4444',weight:5,opacity:1}})
        .addTo(map).bindTooltip(rt.name,{sticky:true});
    }).catch(()=>{});
}

/* ── EN RUTA page (GPS en vivo) ── */
function renderEnRuta() {
  _enRutaCSS();
  const page = document.getElementById('page-en-ruta');
  if (!page) return;

  // Ocultar topbar y bottomnav — pantalla completa para navegación
  const topbar = document.getElementById('topbar');
  const bottomnav = document.getElementById('bottomnav');
  if (topbar) topbar.style.display = 'none';
  if (bottomnav) bottomnav.style.display = 'none';

  // Fijar touch-action en html/body para que el browser no interfiera
  document.body.style.touchAction = 'none';
  document.documentElement.style.touchAction = 'none';

  // Already rendered — don't destroy the live map
  if (EN_RUTA.map && document.getElementById('er-map')) {
    setTimeout(() => EN_RUTA.map.invalidateSize(), 100);
    return;
  }

  // Usar 100dvh para cubrir la pantalla real en móviles (dynamic viewport height)
  const mapH = window.innerHeight;

  page.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;overflow:hidden;padding:0;touch-action:none;-webkit-user-select:none;user-select:none';

  page.innerHTML = `
    <div style="position:absolute;inset:0;touch-action:none">
      <div id="er-map" style="width:100%;height:100%;touch-action:none;-webkit-overflow-scrolling:none"></div>

      <!-- Stop button top-left -->
      <button onclick="stopEnRuta()" style="position:absolute;top:env(safe-area-inset-top,14px);left:14px;margin-top:14px;z-index:1000;background:rgba(220,30,30,.92);color:#fff;border:none;border-radius:14px;padding:10px 16px;font-size:13px;font-weight:800;cursor:pointer;box-shadow:0 4px 16px rgba(255,32,32,.5);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)">⏹ DETENER</button>

      <!-- Riders floating panel top-right -->
      <div id="er-riders-panel" style="position:absolute;top:14px;right:10px;margin-top:env(safe-area-inset-top,0px);z-index:1000;width:152px;max-height:55vh;overflow-y:auto;background:rgba(0,0,0,.78);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-radius:16px;padding:8px 8px 6px;box-shadow:0 4px 20px rgba(0,0,0,.5);scrollbar-width:none">
        <div style="font-size:10px;font-weight:800;color:rgba(255,255,255,.5);letter-spacing:.5px;margin-bottom:6px;padding:0 2px">🏍️ EN RUTA</div>
        <div id="er-list"><div style="font-size:11px;color:rgba(255,255,255,.4);padding:4px 2px">Localizando...</div></div>
      </div>

      <!-- Speed HUD bottom-left — respeta safe area inferior -->
      <div id="er-speed" style="position:absolute;bottom:calc(env(safe-area-inset-bottom,0px) + 90px);left:16px;z-index:1000;background:rgba(0,0,0,.78);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border-radius:20px;padding:10px 22px;display:flex;align-items:baseline;gap:5px;pointer-events:none;box-shadow:0 4px 24px rgba(0,0,0,.45)">
        <span id="er-spd-val" style="font-size:52px;font-weight:900;color:#fff;line-height:1">${EN_RUTA.mySpeed}</span>
        <span style="font-size:15px;font-weight:700;color:rgba(255,255,255,.5)">km/h</span>
      </div>

      <!-- Locate / follow button — encima del HUD de velocidad -->
      <button id="er-locate-btn" onclick="_erLocateMe()" title="Centrar en mi posición"
        style="position:absolute;bottom:calc(env(safe-area-inset-bottom,0px) + 40px);left:16px;z-index:1000;width:44px;height:44px;border-radius:12px;border:none;background:rgba(20,20,30,.88);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);box-shadow:0 2px 12px rgba(0,0,0,.5);cursor:pointer;display:flex;align-items:center;justify-content:center">
        <svg id="er-locate-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round">
          <circle cx="12" cy="12" r="3.5" fill="rgba(34,197,94,.25)"/><line x1="12" y1="2" x2="12" y2="6.5"/><line x1="12" y1="17.5" x2="12" y2="22"/>
          <line x1="2" y1="12" x2="6.5" y2="12"/><line x1="17.5" y1="12" x2="22" y2="12"/>
        </svg>
      </button>
    </div>`;

  if (EN_RUTA.map) { EN_RUTA.map.remove(); EN_RUTA.map=null; EN_RUTA.myMarker=null; EN_RUTA.myAccCircle=null; }

  setTimeout(() => {
    if (!document.getElementById('er-map')) return;
    const center = EN_RUTA.lastPos
      ? [EN_RUTA.lastPos.coords.latitude, EN_RUTA.lastPos.coords.longitude]
      : [8.9824,-79.5199];
    const map = L.map('er-map',{
      zoomControl:false, attributionControl:false,
      tap:false, dragging:true, touchZoom:true,
      bounceAtZoomLimits:false
    }).setView(center,15);
    _mapTile().addTo(map);
    L.control.zoom({position:'bottomright'}).addTo(map);
    setTimeout(() => map.invalidateSize(), 300);

    // iOS fix: el browser decide en touchstart si el gesto es scroll.
    // Prevenir en el contenedor directamente evita que capture gestos verticales.
    const mc = map.getContainer();
    mc.addEventListener('touchstart', e => { if(e.cancelable) e.preventDefault(); }, {passive:false});
    mc.addEventListener('touchmove',  e => { if(e.cancelable) e.preventDefault(); }, {passive:false});

    EN_RUTA.map = map;
    EN_RUTA._follow = true;
    map.on('dragstart', () => {
      EN_RUTA._follow = false;
      const icon = document.getElementById('er-locate-icon');
      if (icon) { icon.setAttribute('stroke','rgba(255,255,255,.45)'); icon.querySelector('circle').setAttribute('fill','transparent'); }
    });
    if (EN_RUTA.lastPos) _erMyMarker(EN_RUTA.lastPos);
    _erFetch();
    _erDrawRoute();
  }, 150);
}

function _erLocateMe() {
  if (!EN_RUTA.map) return;
  EN_RUTA._follow = true;
  const icon = document.getElementById('er-locate-icon');
  if (icon) { icon.setAttribute('stroke','#22c55e'); icon.querySelector('circle').setAttribute('fill','rgba(34,197,94,.25)'); }
  if (EN_RUTA.lastPos) {
    const ll = [EN_RUTA.lastPos.coords.latitude, EN_RUTA.lastPos.coords.longitude];
    EN_RUTA.map.setView(ll, EN_RUTA.map.getZoom(), {animate:true});
  } else {
    navigator.geolocation.getCurrentPosition(pos => {
      EN_RUTA.lastPos = pos;
      EN_RUTA.map.setView([pos.coords.latitude, pos.coords.longitude], 16, {animate:true});
    }, ()=>{}, {enableHighAccuracy:true, timeout:6000, maximumAge:10000});
  }
}

function _erDrawRoute() {
  const map=EN_RUTA.map;
  const rt=EN_RUTA.mapaRoute;
  if(!map||!rt||!rt.start_lat||!rt.end_lat) return;

  const pill=(bg,lbl)=>`<div style="background:${bg};color:#fff;font-size:10px;font-weight:700;padding:3px 8px;border-radius:20px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.5)">${lbl}</div>`;

  // Waypoints for the main route
  const rtPts=[[rt.start_lat,rt.start_lng]];
  let stops=[];
  try{stops=JSON.parse(rt.stops||'[]');}catch(e){}
  stops.forEach(s=>{if(s.lat&&s.lng)rtPts.push([parseFloat(s.lat),parseFloat(s.lng)]);});
  rtPts.push([rt.end_lat,rt.end_lng]);

  // Pills
  L.marker([rt.start_lat,rt.start_lng],{icon:L.divIcon({className:'',html:pill('#22c55e','SALIDA'),iconAnchor:[20,10]})}).addTo(map);
  stops.forEach(s=>{if(s.lat&&s.lng)L.marker([parseFloat(s.lat),parseFloat(s.lng)],{icon:L.divIcon({className:'',html:pill('#ff8800','PARADA'),iconAnchor:[24,10]})}).addTo(map);});
  L.marker([rt.end_lat,rt.end_lng],{icon:L.divIcon({className:'',html:pill('#ef4444','DESTINO'),iconAnchor:[26,10]})}).addTo(map);

  // Draw main route via OSRM
  const rtCoords=rtPts.map(p=>`${p[1]},${p[0]}`).join(';');
  const rtPlaceholder=L.polyline(rtPts,{color:'#ff4444',weight:4,opacity:.35,dashArray:'10,8'}).addTo(map);
  fetch(`https://router.project-osrm.org/route/v1/driving/${rtCoords}?overview=full&geometries=geojson`)
    .then(r=>r.json()).then(data=>{
      if(data.code!=='Ok'||!data.routes?.[0]) return;
      rtPlaceholder.remove();
      L.geoJSON(data.routes[0].geometry,{style:{color:'#ff4444',weight:5,opacity:.9}}).addTo(map);
    }).catch(()=>{});

  // Dibujar la línea azul (posición actual → SALIDA)
  const _drawBlue = pos => {
    if(!EN_RUTA.map) return; // mapa ya fue destruido
    const myLat=pos.coords.latitude, myLng=pos.coords.longitude;
    const prePts=[[myLat,myLng],[parseFloat(rt.start_lat),parseFloat(rt.start_lng)]];
    const prePlaceholder=L.polyline(prePts,{color:'#3b82f6',weight:3,opacity:.5,dashArray:'8,6'}).addTo(map);
    fetch(`https://router.project-osrm.org/route/v1/driving/${myLng},${myLat};${rt.start_lng},${rt.start_lat}?overview=full&geometries=geojson`)
      .then(r=>r.json()).then(data=>{
        if(data.code!=='Ok'||!data.routes?.[0]) return;
        prePlaceholder.remove();
        L.geoJSON(data.routes[0].geometry,{style:{color:'#3b82f6',weight:4,opacity:.85,dashArray:'10,6'}}).addTo(map);
      }).catch(()=>{});
    const allPts=[[myLat,myLng],...rtPts];
    map.fitBounds(L.latLngBounds(allPts),{padding:[60,60],animate:false});
  };

  if(EN_RUTA.lastPos){
    _drawBlue(EN_RUTA.lastPos);
  } else {
    // Sin posición aún: posicionar en la ruta y esperar el primer fix de GPS
    map.fitBounds(L.latLngBounds(rtPts),{padding:[60,60],animate:false});
    navigator.geolocation.getCurrentPosition(
      pos=>{ EN_RUTA.lastPos=pos; _erMyMarker(pos); _drawBlue(pos); },
      ()=>{},
      {enableHighAccuracy:true, timeout:12000, maximumAge:5000}
    );
  }
}

// ── Barra de sin conexión ──────────────────────────────────────
function _erNetBar(show) {
  let bar = document.getElementById('er-net-bar');
  if (!show) { if (bar) bar.remove(); return; }
  if (bar) return;
  bar = document.createElement('div');
  bar.id = 'er-net-bar';
  bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#ef4444;color:#fff;text-align:center;font-size:13px;font-weight:600;padding:6px 12px;letter-spacing:.3px';
  bar.textContent = '⚠️ Sin conexión — ubicación pausada';
  document.body.appendChild(bar);
}

// ── Voz femenina en español ───────────────────────────────────
let _erVoice = null;

function _erSpeak(text) {
  if (!window.speechSynthesis) return;
  speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = 'es-ES';
  utt.rate = 0.88;
  utt.pitch = 1.15;

  const doSpeak = () => {
    if (!_erVoice) {
      const voices = speechSynthesis.getVoices();
      const esVoices = voices.filter(v => v.lang.startsWith('es'));
      // Nombres comunes de voces femeninas en español
      const femaleNames = /mónica|monica|paulina|elena|lucía|lucia|maría|maria|isabella|camila|valeria|sabina|helena|laura|conchita|esperanza|marisol|penelope|francisca|soledad|ximena/i;
      _erVoice =
        esVoices.find(v => femaleNames.test(v.name)) ||      // nombre conocido femenino
        esVoices.find(v => !/male|hombre|jorge|miguel|carlos|juan|pablo|antonio|diego|rafael|agustín/i.test(v.name)) || // sin nombre masculino
        esVoices[0] || null;
    }
    if (_erVoice) utt.voice = _erVoice;
    speechSynthesis.speak(utt);
  };

  if (speechSynthesis.getVoices().length > 0) {
    doSpeak();
  } else {
    speechSynthesis.addEventListener('voiceschanged', function once() {
      speechSynthesis.removeEventListener('voiceschanged', once);
      doSpeak();
    });
  }
}

// ── Distancia entre dos coordenadas (metros) ─────────────────
function _erDist(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 +
    Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ── Verificar cercanía a puntos de la ruta y anunciar ────────
function _erCheckWaypoints(pos) {
  const rt = EN_RUTA.mapaRoute;
  if (!rt || !rt.start_lat) return;
  const lat = pos.coords.latitude, lng = pos.coords.longitude;
  const announced = EN_RUTA._announced;
  const NEAR = 150; // metros para activar el anuncio

  if (!announced.has('salida') && _erDist(lat, lng, rt.start_lat, rt.start_lng) <= NEAR) {
    announced.add('salida');
    _erSpeak('Has llegado al punto de salida');
  }

  let stops = [];
  try { stops = JSON.parse(rt.stops || '[]'); } catch(e) {}
  stops.forEach((s, i) => {
    if (!s.lat || !s.lng) return;
    const key = 'parada_' + i;
    if (!announced.has(key) && _erDist(lat, lng, parseFloat(s.lat), parseFloat(s.lng)) <= NEAR) {
      announced.add(key);
      const nombre = s.name ? `la parada ${s.name}` : 'tu parada';
      _erSpeak(`Has llegado a ${nombre}`);
    }
  });

  if (!announced.has('destino') && _erDist(lat, lng, rt.end_lat, rt.end_lng) <= NEAR) {
    announced.add('destino');
    _erSpeak('Has llegado a tu destino. ¡Buen viaje!');
  }
}

async function startEnRuta() {
  if (!STATE.user) { toast('Inicia sesión primero'); return; }
  if (!navigator.geolocation) { toast('Tu dispositivo no tiene GPS'); return; }
  if (EN_RUTA.active) { navigate('en-ruta'); return; }
  _enRutaCSS();
  EN_RUTA.active=true; EN_RUTA.riderMarkers={}; EN_RUTA.mySpeed=0;
  EN_RUTA.mapaRoute=(window._mapaRoutes||[])[window._mapaSelectedIdx||0]||null;
  if ('wakeLock' in navigator) {
    try {
      EN_RUTA.wakeLock = await navigator.wakeLock.request('screen');
      EN_RUTA.wakeLock.addEventListener('release', () => {
        if (EN_RUTA.active && 'wakeLock' in navigator)
          navigator.wakeLock.request('screen').then(wl=>{EN_RUTA.wakeLock=wl;}).catch(()=>{});
      });
    } catch(e) {}
  }
  const ind=document.getElementById('enruta-indicator');
  if(ind) ind.classList.add('er-on');
  navigate('en-ruta');

  const _geoOpts={enableHighAccuracy:true,maximumAge:10000,timeout:30000};

  EN_RUTA._announced=new Set();

  const _onPos=pos=>{
    EN_RUTA.lastPos=pos;
    EN_RUTA.mySpeed=pos.coords.speed!=null?Math.round(pos.coords.speed*3.6):EN_RUTA.mySpeed;
    const el=document.getElementById('er-spd-val');
    if(el) el.textContent=EN_RUTA.mySpeed;
    _erPublish(pos,true);
    _erMyMarker(pos);
    _erCheckWaypoints(pos);
  };

  // Solo mostrar error si es permiso denegado; los timeouts por throttling del browser se ignoran
  const _onErr=err=>{
    if(err.code===1) toast('GPS: Permiso denegado');
    else if(EN_RUTA.lastPos) _erPublish(EN_RUTA.lastPos,true); // re-publicar última posición conocida
  };

  EN_RUTA.watchId=navigator.geolocation.watchPosition(_onPos,_onErr,_geoOpts);

  // Heartbeat cada 20s: fuerza getCurrentPosition para combatir el throttling de pestañas en background
  EN_RUTA.heartbeatInterval=setInterval(()=>{
    if(!EN_RUTA.active) return;
    navigator.geolocation.getCurrentPosition(
      pos=>{EN_RUTA.lastPos=pos;_erPublish(pos,true);_erMyMarker(pos);},
      ()=>{if(EN_RUTA.lastPos)_erPublish(EN_RUTA.lastPos,true);},
      {enableHighAccuracy:true,maximumAge:15000,timeout:10000}
    );
  },20000);

  // Cuando la pestaña vuelve a estar activa, publicar inmediatamente
  EN_RUTA._visHandler=()=>{
    if(!document.hidden&&EN_RUTA.active){
      navigator.geolocation.getCurrentPosition(
        pos=>{EN_RUTA.lastPos=pos;_erPublish(pos,true);_erMyMarker(pos);},
        ()=>{if(EN_RUTA.lastPos)_erPublish(EN_RUTA.lastPos,true);},
        {enableHighAccuracy:true,maximumAge:15000,timeout:10000}
      );
    }
  };
  document.addEventListener('visibilitychange',EN_RUTA._visHandler);

  EN_RUTA.pollInterval=setInterval(_erFetch,5000);

  // ── Detección de conexión: republicar inmediato al recuperar internet ──
  EN_RUTA._onOnline = () => {
    _erNetBar(false);
    if(EN_RUTA.lastPos) _erPublish(EN_RUTA.lastPos, true);
    toast('📶 Conexión restaurada');
  };
  EN_RUTA._onOffline = () => _erNetBar(true);
  window.addEventListener('online',  EN_RUTA._onOnline);
  window.addEventListener('offline', EN_RUTA._onOffline);
  if(!navigator.onLine) _erNetBar(true); // ya estaba offline al arrancar
}

async function stopEnRuta() {
  EN_RUTA.active=false;
  if(EN_RUTA.wakeLock){try{await EN_RUTA.wakeLock.release();}catch(e){} EN_RUTA.wakeLock=null;}
  if(EN_RUTA.watchId!==null){navigator.geolocation.clearWatch(EN_RUTA.watchId);EN_RUTA.watchId=null;}
  clearInterval(EN_RUTA.pollInterval); EN_RUTA.pollInterval=null;
  clearInterval(EN_RUTA.heartbeatInterval); EN_RUTA.heartbeatInterval=null;
  if(EN_RUTA._visHandler){document.removeEventListener('visibilitychange',EN_RUTA._visHandler);EN_RUTA._visHandler=null;}
  if(EN_RUTA._onOnline){window.removeEventListener('online',EN_RUTA._onOnline);EN_RUTA._onOnline=null;}
  if(EN_RUTA._onOffline){window.removeEventListener('offline',EN_RUTA._onOffline);EN_RUTA._onOffline=null;}
  _erNetBar(false);
  if(EN_RUTA.lastPos) _erPublish(EN_RUTA.lastPos,false);
  const ind=document.getElementById('enruta-indicator');
  if(ind) ind.classList.remove('er-on');
  if(EN_RUTA.map){EN_RUTA.map.remove();EN_RUTA.map=null;}
  EN_RUTA.myMarker=null; EN_RUTA.myAccCircle=null; EN_RUTA.riderMarkers={};
  // Restaurar topbar, bottomnav, scroll y estilos de la página
  const topbar=document.getElementById('topbar');
  const bottomnav=document.getElementById('bottomnav');
  if(topbar) topbar.style.display='flex';
  if(bottomnav) bottomnav.style.display='flex';
  document.body.style.touchAction='';
  document.documentElement.style.touchAction='';
  const erPage=document.getElementById('page-en-ruta');
  if(erPage) erPage.style.cssText='position:relative;overflow:hidden;padding:0';
  navigate('mapas');
  toast('En Ruta detenido');
}

async function _erPublish(pos,active) {
  const u=STATE.user;
  try { await fetch('/api/live-location',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({user_id:u.id,lat:pos.coords.latitude,lng:pos.coords.longitude,
      speed:pos.coords.speed!=null?pos.coords.speed*3.6:0,heading:pos.coords.heading||0,
      username:u.username,bike:u.bike_model||'',active})}); } catch(e){}
}

async function _erFetch() {
  try {
    const riders = await fetch('/api/live-riders').then(r=>r.json());
    if(EN_RUTA.map) _erMarkers(riders);
    _erList(riders);
  } catch(e){}
}

function _erMyMarker(pos) {
  if(!EN_RUTA.map) return;
  const ll=[pos.coords.latitude,pos.coords.longitude];
  const acc=pos.coords.accuracy||10;
  const hdg=pos.coords.heading;
  const rot=Math.round((Number.isFinite(hdg)&&hdg>=0)?hdg:(EN_RUTA._lastHdg||0));
  if(Number.isFinite(hdg)&&hdg>=0) EN_RUTA._lastHdg=hdg;
  const icon=L.divIcon({className:'',
    html:`<div style="position:relative;width:40px;height:50px;transform:rotate(${rot}deg)"><div style="position:absolute;width:26px;height:26px;border-radius:50%;background:rgba(34,197,94,.25);left:7px;top:21px;animation:erPulse 2s infinite"></div><svg viewBox="0 0 40 50" width="40" height="50" style="position:absolute;top:0;left:0;filter:drop-shadow(0 2px 5px rgba(0,0,0,.45))"><path d="M20 2 L36 40 Q20 48 4 40 Z" fill="#22c55e" stroke="white" stroke-width="2.5" stroke-linejoin="round"/><circle cx="20" cy="34" r="13" fill="#22c55e" stroke="white" stroke-width="2"/></svg><span style="position:absolute;left:50%;top:22px;transform:translateX(-50%) rotate(${-rot}deg);font-size:16px;line-height:1">🏍️</span></div>`,
    iconSize:[40,50],iconAnchor:[20,34]});
  if(EN_RUTA.myMarker){
    EN_RUTA.myMarker.setLatLng(ll).setIcon(icon);
    if(EN_RUTA.myAccCircle) EN_RUTA.myAccCircle.setLatLng(ll).setRadius(acc);
    if(EN_RUTA._follow !== false) EN_RUTA.map.panTo(ll,{animate:true,duration:0.8});
  } else {
    EN_RUTA.myMarker=L.marker(ll,{icon,zIndexOffset:1000}).addTo(EN_RUTA.map);
    EN_RUTA.myAccCircle=L.circle(ll,{radius:acc,color:'#22c55e',fillColor:'#22c55e',fillOpacity:.1,weight:1}).addTo(EN_RUTA.map);
    EN_RUTA.map.setView(ll,17);
  }
}

function _erMarkers(riders) {
  const myId=String(STATE.user.id);
  for(const [uid,d] of Object.entries(riders)) {
    if(uid===myId) continue;
    const ll=[d.lat,d.lng];
    const color=d.age>60?'#777':'#ff8800';
    const rot=Math.round((Number.isFinite(d.heading)&&d.heading>=0)?d.heading:0);
    const shortName=(d.username||'?').split(' ')[0].substring(0,10);
    const icon=L.divIcon({className:'',
      html:`<div style="display:flex;flex-direction:column;align-items:center;gap:2px">
        <div style="position:relative;width:40px;height:50px;transform:rotate(${rot}deg)">
          <svg viewBox="0 0 40 50" width="40" height="50" style="position:absolute;top:0;left:0;filter:drop-shadow(0 2px 5px rgba(0,0,0,.4))"><path d="M20 2 L36 40 Q20 48 4 40 Z" fill="${color}" stroke="white" stroke-width="2.5" stroke-linejoin="round"/><circle cx="20" cy="34" r="13" fill="${color}" stroke="white" stroke-width="2"/></svg>
          <span style="position:absolute;left:50%;top:22px;transform:translateX(-50%) rotate(${-rot}deg);font-size:16px;line-height:1">🏍️</span>
        </div>
        <div style="background:rgba(0,0,0,.75);backdrop-filter:blur(6px);color:#fff;font-size:10px;font-weight:800;padding:2px 7px;border-radius:10px;white-space:nowrap;border:1px solid ${color};line-height:1.4">${shortName} · ${d.speed}km/h</div>
      </div>`,
      iconSize:[80,70],iconAnchor:[40,50]});
    if(EN_RUTA.riderMarkers[uid]) EN_RUTA.riderMarkers[uid].setLatLng(ll).setIcon(icon);
    else EN_RUTA.riderMarkers[uid]=L.marker(ll,{icon}).addTo(EN_RUTA.map);
  }
  for(const uid of Object.keys(EN_RUTA.riderMarkers)) {
    if(!riders[uid]){if(EN_RUTA.map&&EN_RUTA.riderMarkers[uid])EN_RUTA.map.removeLayer(EN_RUTA.riderMarkers[uid]);delete EN_RUTA.riderMarkers[uid];}
  }
}

function _erList(riders) {
  const el=document.getElementById('er-list');
  if(!el) return;
  const myId=String(STATE.user.id);
  const me=riders[myId];
  const others=Object.entries(riders).filter(([uid])=>uid!==myId);

  // My own entry at top
  const myRow=`<div style="display:flex;align-items:center;gap:6px;padding:5px 4px;border-radius:10px;background:rgba(34,197,94,.15);margin-bottom:4px">
    <div style="width:28px;height:28px;border-radius:50%;background:#22c55e;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:#fff;flex-shrink:0">${initials(STATE.user.username||'Tú')}</div>
    <div style="flex:1;min-width:0">
      <div style="font-size:11px;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${(STATE.user.username||'Tú').split(' ')[0]}</div>
      <div style="font-size:10px;color:#4ade80">${EN_RUTA.mySpeed} km/h</div>
    </div>
    <span style="font-size:9px;color:#4ade80;font-weight:700">TÚ</span>
  </div>`;

  const otherRows = others.length===0
    ? `<div style="font-size:10px;color:rgba(255,255,255,.35);padding:4px 2px;text-align:center">Solo tú</div>`
    : others.map(([,d])=>`
      <div style="display:flex;align-items:center;gap:6px;padding:5px 4px;border-radius:10px;background:rgba(255,255,255,.06);margin-bottom:3px">
        <div style="width:28px;height:28px;border-radius:50%;background:${d.age>60?'#555':'#ff8800'};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:#fff;flex-shrink:0">${initials(d.username)}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:11px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${d.username.split(' ')[0]}</div>
          <div style="font-size:10px;color:${d.age>60?'#f87171':'rgba(255,255,255,.5)'}">${d.age>60?'⚠️ sin señal':d.speed+' km/h'}</div>
        </div>
      </div>`).join('');

  el.innerHTML = myRow + otherRows;
}
