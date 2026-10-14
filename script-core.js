
// ============================================================
// STATE & CONFIG
// ============================================================
const HV = {
  url: location.origin,
  // Ya no hay Nextcloud: el backend es /api/nc en Vercel y no usa estas credenciales.
  user: 'bikersociety',
  pass: 'vercel',
  hvPath: '8202944a-6bb4-49f3-9e06-a4a5849813f2',
  syncKey: 'biker_v1',
  gramFolder: 'RuedeGram',
  connected: false
};

const STATE = {
  currentPage: 'inicio',
  user: null,
  users: [],
  routes: [],
  events: [],
  posts: [],
  badges: [],
  challenges: [],
  userChallenges: [],
  userBadges: [],
  chatChannels: [],
  chatMessages: [],
  notifications: [],
  attendance: [],
  news: [],
  selectedRider: null,
  map: null,
  routeMarkers: [],
  syncStatus: 'pending',
  selectedRoute: null,
  rutaWatchId: null,
  myLocationMarker: null,
  bikerMarkers: {},
  places: [],
  userStats: {},  // { userId: { rides, events, routes_created, photos, chat_messages, total_km, days_active, streak, last_active } }
  navStack: []    // breadcrumb history: [{page, pageId, label}]
};

// ============================================================
// PANAMA POIs DATABASE (loaded from data/panama_pois.json)
// ============================================================
let PANAMA_POIS = [];
let _poisLoaded = false;

async function loadPanamaPOIs() {
  if (_poisLoaded) return;
  try {
    const res = await fetch('data/panama_pois.json');
    if (res.ok) {
      PANAMA_POIS = await res.json();
      _poisLoaded = true;
      console.log('[BS] Panama POIs loaded:', PANAMA_POIS.length, 'places');
    }
  } catch(e) {
    console.warn('[BS] Could not load Panama POIs:', e.message);
  }
}

// ============================================================
// INITIAL DATA (from SQL dump)
// ============================================================
const SEED_USERS = [
  {id:1,username:'admin',email:'admin@ruede.app',is_admin:1,is_injured:0,injury_note:'',bike_model:'KTM DUKE 200',points:555,profile_pic:'',bio:'Creador de Biker Society',city:'Panama',experience_level:'experto'},
  {id:14,username:'Cafe con Leche',email:'sj23kolo@gmail.com',is_admin:1,is_injured:0,injury_note:'',bike_model:'DUKE 200',points:30,profile_pic:'',bio:'',city:'Panama',experience_level:'intermedio'},
  {id:15,username:'saverio',email:'saveriomanrri@gmail.com',is_admin:0,is_injured:0,injury_note:'',bike_model:'',points:20,profile_pic:'',bio:'',city:'Panama',experience_level:'intermedio'},
  {id:20,username:'Jorge',email:'jorge@biker.com',is_admin:0,is_injured:0,injury_note:'',bike_model:'Kawasaki Ninja',points:50,profile_pic:'',bio:'Amante de las dos ruedas',city:'Panama',experience_level:'intermedio'},
  {id:21,username:'Maria',email:'maria@biker.com',is_admin:0,is_injured:0,injury_note:'',bike_model:'Honda CB500F',points:50,profile_pic:'',bio:'',city:'Panama',experience_level:'intermedio'},
  {id:24,username:'Prueba3',email:'ksks@gamil.com',is_admin:0,is_injured:0,injury_note:'',bike_model:'',points:125,profile_pic:'',bio:'',city:'Panama',experience_level:'intermedio'},
  {id:25,username:'Daniel 4k',email:'luisdanielestremor6@gmail.com',is_admin:0,is_injured:1,injury_note:'LESIONADO (Alpha Strada 250)',bike_model:'Alpha Strada 250',points:125,profile_pic:'',bio:'',city:'Panama',experience_level:'intermedio'},
  {id:26,username:'Nathalia',email:'escarpetanathalia@gmail.com',is_admin:0,is_injured:0,injury_note:'',bike_model:'',points:50,profile_pic:'',bio:'',city:'Panama',experience_level:'novato'},
  {id:27,username:'Vanesa mo',email:'vanessamo688@gmail.com',is_admin:0,is_injured:0,injury_note:'',bike_model:'',points:50,profile_pic:'',bio:'',city:'Panama',experience_level:'novato'},
  {id:28,username:'Janriam',email:'janriam@gmail.com',is_admin:0,is_injured:0,injury_note:'',bike_model:'Keeway XRL 200',points:50,profile_pic:'',bio:'',city:'Panama',experience_level:'intermedio'},
  {id:29,username:'Rodolfo Stalin',email:'rodolfostalin17@gmail.com',is_admin:0,is_injured:0,injury_note:'',bike_model:'',points:50,profile_pic:'',bio:'',city:'Panama',experience_level:'novato'},
  {id:30,username:'Kenneth cortes',email:'riveracortesk@gmail.com',is_admin:0,is_injured:0,injury_note:'',bike_model:'',points:50,profile_pic:'',bio:'',city:'Panama',experience_level:'intermedio'},
  {id:31,username:'Francisco G.',email:'fg184600@gmail.com',is_admin:0,is_injured:0,injury_note:'',bike_model:'TX200 AZUL',points:50,profile_pic:'',bio:'',city:'Panama',experience_level:'intermedio'},
  {id:32,username:'Olivares',email:'jaog4086@gmail.com',is_admin:0,is_injured:0,injury_note:'',bike_model:'DRAGON OFF ROAD',points:50,profile_pic:'',bio:'',city:'Panama',experience_level:'intermedio'},
  {id:33,username:'Nightwolf',email:'nightwolf.biker@gmail.com',is_admin:0,is_injured:0,injury_note:'',bike_model:'Loncin CR250',points:50,profile_pic:'',bio:'',city:'Panama',experience_level:'intermedio'},
  {id:34,username:'Anthonininini',email:'joseanthony010203w@gmail.com',is_admin:0,is_injured:0,injury_note:'',bike_model:'KTM DUKE 250',points:125,profile_pic:'',bio:'',city:'Panama',experience_level:'intermedio'},
  {id:39,username:'pablop',email:'savesrique19@gmail.com',is_admin:0,is_injured:0,injury_note:'',bike_model:'',points:50,profile_pic:'',bio:'',city:'Panama',experience_level:'novato'},
];

// ============================================================
// BADGE DEFINITIONS (25 metal-bronze medals)
// ============================================================
const SEED_BADGES = [
  {id:1,name:'Primer Ruedo',description:'Completaste tu primera rodada',stat_type:'rides',threshold:1,category:'rodaje',rarity:'common',points_bonus:50,svgGradient:'#ff4444|#ff8800'},
  {id:2,name:'5 Ruedas',description:'5 rodadas completadas',stat_type:'rides',threshold:5,category:'rodaje',rarity:'common',points_bonus:150,svgGradient:'#ff6b35|#ffaa00'},
  {id:3,name:'10 Ruedas',description:'10 rodadas completadas',stat_type:'rides',threshold:10,category:'rodaje',rarity:'rare',points_bonus:300,svgGradient:'#ffd700|#ff8c00'},
  {id:4,name:'25 Ruedas',description:'25 rodadas - te encanta la carretera',stat_type:'rides',threshold:25,category:'rodaje',rarity:'rare',points_bonus:700,svgGradient:'#00bcd4|#006994'},
  {id:5,name:'50 Ruedas',description:'Medio centenario de rodadas',stat_type:'rides',threshold:50,category:'rodaje',rarity:'epic',points_bonus:1500,svgGradient:'#9c27b0|#e91e63'},
  {id:6,name:'100 Ruedas',description:'Leyenda del asfalto',stat_type:'rides',threshold:100,category:'rodaje',rarity:'legendary',points_bonus:3000,svgGradient:'#1a1a2e|#ff3b3b'},
  {id:7,name:'200 Ruedas',description:'Doble centenario - maestro del camino',stat_type:'rides',threshold:200,category:'rodaje',rarity:'legendary',points_bonus:5000,svgGradient:'#ff3b3b|#c62828'},
  {id:8,name:'500 Ruedas',description:'500 rodadas - mito viviente',stat_type:'rides',threshold:500,category:'rodaje',rarity:'legendary',points_bonus:10000,svgGradient:'#000000|#ff3b3b'},
  {id:9,name:'Login Diario',description:'Te conectaste hoy',stat_type:'days_active',threshold:1,category:'eventos',rarity:'common',points_bonus:50,svgGradient:'#4caf50|#2e7d32'},
  {id:10,name:'7 Días de Racha',description:'7 días seguidos activo',stat_type:'streak',threshold:7,category:'eventos',rarity:'rare',points_bonus:300,svgGradient:'#ff9800|#ff5722'},
  {id:11,name:'30 Días de Racha',description:'30 días seguidos activo',stat_type:'streak',threshold:30,category:'eventos',rarity:'epic',points_bonus:1000,svgGradient:'#ff5722|#bf360c'},
  {id:12,name:'100 Días',description:'100 días seguidos - imparable',stat_type:'streak',threshold:100,category:'eventos',rarity:'legendary',points_bonus:2500,svgGradient:'#d32f2f|#7f0000'},
  {id:13,name:'Foto del Día',description:'Subiste 1 foto hoy',stat_type:'photos',threshold:1,category:'fotos',rarity:'common',points_bonus:80,svgGradient:'#ffeb3b|#ff9800'},
  {id:14,name:'Publicador',description:'Hiciste 10 publicaciones',stat_type:'posts',threshold:10,category:'fotos',rarity:'rare',points_bonus:400,svgGradient:'#e91e63|#880e4f'},
  {id:15,name:'Conversador',description:'50+ comentarios en BikerGram',stat_type:'chat_messages',threshold:50,category:'social',rarity:'common',points_bonus:150,svgGradient:'#2196f3|#0d47a1'},
  {id:16,name:'Reaccionador',description:'100+ reacciones en posts',stat_type:'chat_messages',threshold:100,category:'social',rarity:'rare',points_bonus:400,svgGradient:'#7c4dff|#651fff'},
  {id:17,name:'Madrugador',description:'Activo antes de las 7am (10+ veces)',stat_type:'early_bird',threshold:10,category:'especial',rarity:'rare',points_bonus:500,svgGradient:'#ffc107|#ff6f00'},
  {id:18,name:'Noctámbulo',description:'Activo después de medianoche (10+ veces)',stat_type:'night_owl',threshold:10,category:'especial',rarity:'rare',points_bonus:500,svgGradient:'#3f51b5|#1a237e'},
  {id:19,name:'Pionero',description:'De los primeros 10 miembros del grupo',stat_type:'founding',threshold:1,category:'especial',rarity:'epic',points_bonus:800,svgGradient:'#795548|#3e2723'},
  {id:20,name:'Mentor',description:'Ayudaste a 5+ nuevos miembros',stat_type:'mentor',threshold:5,category:'especial',rarity:'epic',points_bonus:1200,svgGradient:'#009688|#004d40'},
  {id:21,name:'Veterano',description:'1 año activo en el grupo',stat_type:'days_active',threshold:365,category:'especial',rarity:'epic',points_bonus:2000,svgGradient:'#546e7a|#37474f'},
  {id:22,name:'Leyenda',description:'2 años activo - pilar del grupo',stat_type:'days_active',threshold:730,category:'especial',rarity:'legendary',points_bonus:5000,svgGradient:'#1a1a1a|#c62828'},
  {id:23,name:'Embajador',description:'Representante oficial del grupo',stat_type:'admin_award',threshold:1,category:'especial',rarity:'epic',points_bonus:1000,svgGradient:'#ffd700|#ff8c00'},
  {id:24,name:'Fundador',description:'Co-creador de Biker Society',stat_type:'founding',threshold:1,category:'especial',rarity:'legendary',points_bonus:10000,svgGradient:'#000000|#ffd700'},
  {id:25,name:'Élite',description:'Top 10 del ranking general',stat_type:'admin_award',threshold:1,category:'especial',rarity:'legendary',points_bonus:3000,svgGradient:'#1a1a2e|#ffd700'},
];

// Get badge image (metal-bronze medal from /badges.js)
// Locked = B&W, desaturated, no glow
// Earned = full color with glow effect
function getBadgeSvg(badge, earned) {
  const img = BADGE_IMAGES[badge.id];
  if (!img) return '';
  if (earned) {
    const [c1, c2] = (badge.svgGradient||'#ff4444|#ff8800').split('|');
    return `<div style="
      width:64px;height:64px;display:flex;align-items:center;justify-content:center;
      border-radius:50%;
      background:radial-gradient(circle, ${c1}33 0%, transparent 70%);
      box-shadow:0 0 12px ${c1}aa, 0 0 4px ${c2}aa, inset 0 0 6px rgba(255,255,255,0.1);
      animation:badgeEarned 0.5s ease-out;
    "><img src="${img.color}" loading="lazy" style="width:56px;height:56px;display:block;filter:drop-shadow(0 2px 3px rgba(0,0,0,0.4))" alt="${badge.name}"></div>`;
  } else {
    return `<div style="
      width:64px;height:64px;display:flex;align-items:center;justify-content:center;
      border-radius:50%;
      background:radial-gradient(circle, #1a1a1a 0%, transparent 70%);
      opacity:0.45;
    "><img src="${img.bw}" loading="lazy" style="width:56px;height:56px;display:block;filter:grayscale(100%) brightness(0.7);" alt="${badge.name}"></div>`;
  }
}

const SEED_CHALLENGES = [
  {id:1,title:'Rey de la Carretera',description:'Recorre 100 km en rutas grupales',category:'weekly',points:500,requirement_type:'distance',requirement_count:100,icon:'🛣️'},
  {id:2,title:'Fotógrafo Biker',description:'Sube 5 fotos a la nube',category:'weekly',points:300,requirement_type:'uploads',requirement_count:5,icon:'📷'},
  {id:3,title:'Social Rider',description:'Comenta en 10 publicaciones',category:'weekly',points:300,requirement_type:'comments',requirement_count:10,icon:'💬'},
  {id:4,title:'Alma de Fuego',description:'Conecta 7 días seguidos',category:'weekly',points:400,requirement_type:'daily_streak',requirement_count:7,icon:'🔥'},
  {id:5,title:'Influencer Biker',description:'Recibe 50 likes en tus publicaciones',category:'special',points:800,requirement_type:'likes_received',requirement_count:50,icon:'❤️'},
  {id:6,title:'Leyenda del Mes',description:'Top 3 del ranking mensual',category:'special',points:2000,requirement_type:'ranking',requirement_count:3,icon:'👑'},
];

const SEED_EVENTS = [
  {id:1,title:'Cerro azul prueba',description:'Ruta por Cerro Azul - Panama',date:'2026-05-28',time:'08:00',location:'Calle 50',difficulty:'intermedia',status:'activo',max_riders:10,latitude:8.9824,longitude:-79.5199},
  {id:2,title:'Ruede Amador',description:'Ruta para principiantes',date:'2026-05-29',time:'14:00',location:'Negocio del Turko',difficulty:'fácil',status:'activo',max_riders:0,latitude:8.9845,longitude:-79.5210},
];

const SEED_ROUTES = [];

const SEED_POSTS = [];

const SEED_CHANNELS = [
  {id:1,name:'General',description:'Charlas y presentaciones',icon:'💬',color:'#ff4444',type:'public'},
  {id:2,name:'Rutas',description:'Comparte y coordina rodadas',icon:'🏍️',color:'#22c55e',type:'public'},
  {id:3,name:'Mecánica',description:'Consejos técnicos y talleres',icon:'🔧',color:'#f59e0b',type:'public'},
  {id:4,name:'Eventos',description:'Quedadas y rodadas grupales',icon:'📅',color:'#3b82f6',type:'public'},
  {id:5,name:'Off-topic',description:'Lo que sea, menos motos',icon:'🎲',color:'#9c27b0',type:'public'},
];

const SEED_MESSAGES = [
  {id:1,channel_id:1,user_id:1,content:'¡Hola bikers! Bienvenidos a Biker Society 🏍️',image_url:'',created_at:'2026-05-28 22:46:28',recipient_id:null},
];

// ============================================================
// PLACES DATABASE (EVA Lube - Lugares de Panama)
// ============================================================
const SEED_PLACES = [
  // GASOLINERAS
  {id:1,name:'Petroautos Calle 50',category:'gasolinera',lat:8.9784,lng:-79.5180,address:'Calle 50, Panama',icon:'⛽'},
  {id:2,name:'Petroautos Transistmica',category:'gasolinera',lat:9.0103,lng:-79.4280,address:'Transistmica, Panama',icon:'⛽'},
  {id:3,name:'Petroautos Bethania',category:'gasolinera',lat:8.9890,lng:-79.5300,address:'Bethania, Panama',icon:'⛽'},
  {id:4,name:'Petroautos Obarrio',category:'gasolinera',lat:8.9830,lng:-79.5080,address:'Obarrio, Panama',icon:'⛽'},
  {id:5,name:'Petroautos Costa del Este',category:'gasolinera',lat:8.9850,lng:-79.4870,address:'Costa del Este, Panama',icon:'⛽'},
  {id:6,name:'Texaco El Dorado',category:'gasolinera',lat:9.0190,lng:-79.5150,address:'El Dorado, Panama',icon:'⛽'},
  {id:7,name:'Petroautos San Miguelito',category:'gasolinera',lat:9.0500,lng:-79.5200,address:'San Miguelito, Panama',icon:'⛽'},
  {id:8,name:'PetroautosVIA Argentina',category:'gasolinera',lat:8.9950,lng:-79.5190,address:'Via Argentina, Panama',icon:'⛽'},
  {id:9,name:'Petroautos Brisas',category:'gasolinera',lat:8.9700,lng:-79.5380,address:'Brisas del Golf, Panama',icon:'⛽'},
  {id:10,name:'Petroautos Veracruz',category:'gasolinera',lat:8.9550,lng:-79.5580,address:'Veracruz, Panama',icon:'⛽'},
  {id:11,name:'Petroautos Clayton',category:'gasolinera',lat:8.9750,lng:-79.5650,address:'Clayton, Panama',icon:'⛽'},
  {id:12,name:'Petroautos Panama Viejo',category:'gasolinera',lat:8.9600,lng:-79.5400,address:'Panama Viejo, Panama',icon:'⛽'},
  {id:13,name:'Petroautos El Chorrillo',category:'gasolinera',lat:8.9650,lng:-79.5500,address:'El Chorrillo, Panama',icon:'⛽'},
  {id:14,name:'Petroautos瓜',category:'gasolinera',lat:8.9900,lng:-79.4700,address:'Tocumen, Panama',icon:'⛽'},
  // CENTROS COMERCIALES
  {id:20,name:'Albrook Mall',category:'centro_comercial',lat:8.9740,lng:-79.5600,address:'Albrook, Panama',icon:'🛍️'},
  {id:21,name:'Multiplaza Pacific Mall',category:'centro_comercial',lat:8.9810,lng:-79.5070,address:'Costa del Este, Panama',icon:'🛍️'},
  {id:22,name:'Altaplaza Mall',category:'centro_comercial',lat:8.9780,lng:-79.5200,address:'Calle 50, Panama',icon:'🛍️'},
  {id:23,name:'Metropolitan Mall',category:'centro_comercial',lat:9.0100,lng:-79.5100,address:'El Dorado, Panama',icon:'🛍️'},
  {id:24,name:'Plaza Carolina',category:'centro_comercial',lat:8.9960,lng:-79.5250,address:'Via Argentina, Panama',icon:'🛍️'},
  {id:25,name:'SoHo Mall',category:'centro_comercial',lat:8.9850,lng:-79.5030,address:'Costa del Este, Panama',icon:'🛍️'},
  {id:26,name:'Pacific Center',category:'centro_comercial',lat:8.9830,lng:-79.5090,address:'Punta Pacifica, Panama',icon:'🛍️'},
  {id:27,name:'Nicanor Otero',category:'centro_comercial',lat:9.0020,lng:-79.4900,address:'San Francisco, Panama',icon:'🛍️'},
  // LUGARES FAMOSOS PANAMA
  {id:30,name:'Calle Uruguay',category:'lugar_famoso',lat:8.9820,lng:-79.5160,address:'Calle Uruguay, Panama',icon:'📍'},
  {id:31,name:'Casco Antiguo',category:'lugar_famoso',lat:8.9510,lng:-79.5370,address:'Casco Antiguo, Panama',icon:'📍'},
  {id:32,name:'Amador Causeway',category:'lugar_famoso',lat:8.9180,lng:-79.5530,address:'Causeway Amador, Panama',icon:'📍'},
  {id:33,name:' Biomuseo',category:'lugar_famoso',lat:8.9120,lng:-79.5570,address:'Amador, Panama',icon:'📍'},
  {id:34,name:' Cinta Costera',category:'lugar_famoso',lat:8.9650,lng:-79.5250,address:'Cinta Costera, Panama',icon:'📍'},
  {id:35,name:'Metromall Panama',category:'lugar_famoso',lat:9.0030,lng:-79.4700,address:'Tocumen, Panama',icon:'📍'},
  {id:36,name:'Brisas del Golf',category:'lugar_famoso',lat:8.9700,lng:-79.5400,address:'Brisas del Golf, Panama',icon:'📍'},
  // TALLERES Y SERVICIOS
  {id:40,name:'Lubricantes Venezuela',category:'taller',lat:8.9720,lng:-79.5200,address:'Venezuela, Panama',icon:'🔧'},
  {id:41,name:'Lubricantes Atlantico',category:'taller',lat:9.0100,lng:-79.4800,address:'Transistmica, Panama',icon:'🔧'},
  {id:42,name:'Moto Repuesto Panama',category:'repuesto',lat:8.9900,lng:-79.5300,address:'Bethania, Panama',icon:'🏍️'},
  {id:43,name:'Auto Partes 507',category:'repuesto',lat:9.0200,lng:-79.5100,address:'El Dorado, Panama',icon:'🏍️'},
];

// ============================================================
// PLACES SEARCH (Autocomplete)
// ============================================================
let _placeSearchTimeout = null;

// Promise-based: returns { local, online } directly — no callback needed
async function searchPlaces(query) {
  if (!query || query.length < 2) return { local: [], online: [] };
  const q = query.toLowerCase();

  // 1. Search local saved places first (instant)
  const local = STATE.places.filter(p =>
    p.name.toLowerCase().includes(q) ||
    (p.address && p.address.toLowerCase().includes(q)) ||
    p.category.toLowerCase().includes(q)
  ).slice(0, 5);

  // 2. Search Panama POIs database (local JSON, instant)
  let panamaPOIs = [];
  if (PANAMA_POIS.length) {
    panamaPOIs = PANAMA_POIS.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.address && p.address.toLowerCase().includes(q)) ||
      p.category.toLowerCase().includes(q) ||
      (p.subcategory && p.subcategory.toLowerCase().includes(q))
    ).slice(0, 8);
  }

  // 3. Nominatim API (online search)
  let online = [];
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ', Panama')}&limit=5&addressdetails=1`,
      { headers: { 'Accept-Language': 'es' } }
    );
    const data = await res.json();
    online = (data || []).map(item => ({
      id: 'online_' + item.place_id,
      name: item.display_name.split(',')[0],
      fullName: item.display_name,
      category: item.type || 'lugar',
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      address: item.display_name,
      icon: _categoryIcon(item.type || 'lugar'),
      isOnline: true
    }));
  } catch(e) {}
  return { local, panamaPOIs, online };
}

// Render results into a dropdown and handle selection
function showPlaceResults(dropdown, merged, { nameInput, latInput, lngInput, onSelect }) {
  dropdown.innerHTML = '';
  if (!merged.length) {
    dropdown.innerHTML = '<div style="padding:10px 12px;font-size:12px;color:var(--text3);text-align:center">Sin resultados</div>';
    dropdown.style.display = 'block';
    return;
  }
  merged.forEach(p => {
    const div = document.createElement('div');
    div.style.cssText = 'padding:9px 12px;cursor:pointer;font-size:12px;display:flex;align-items:center;gap:8px;border-bottom:1px solid var(--border);transition:background 0.15s';
    const sub = p.subcategory ? ` · ${p.subcategory}` : '';
    const addr = p.address ? ` · ${p.address.slice(0, 40)}` : '';
    div.innerHTML = `<span style="font-size:14px">${p.icon || '📍'}</span><div style="flex:1;min-width:0"><div style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(p.name)}</div><div style="color:var(--text3);font-size:10px">${escHtml(p.category)}${sub}${addr}${p.isPOI ? ' · DB' : ''}</div></div>`;
    div.addEventListener('mouseover', () => div.style.background = 'var(--surface3)');
    div.addEventListener('mouseout', () => div.style.background = '');
    div.addEventListener('click', () => {
      if (nameInput) nameInput.value = p.name;
      if (latInput) latInput.value = p.lat;
      if (lngInput) lngInput.value = p.lng;
      savePlace(p);
      dropdown.style.display = 'none';
      if (onSelect) onSelect(p);
    });
    dropdown.appendChild(div);
  });
  dropdown.style.display = 'block';
}

function _categoryIcon(type) {
  const map = {
    fuel:'⛽', gas_station:'⛽', supermarket:'🏪', mall:'🛍️',
    commercial:'🛍️', restaurant:'🍽️', cafe:'☕', bar:'🍺',
    hotel:'🏨', hospital:'🏥', pharmacy:'💊', parking:'🅿️',
    atm:'🏧', bank:'🏦', place_of_worship:'⛪', school:'🏫',
    university:'🎓', park:'🌳', beach:'🏖️', stadium:'🏟️',
    theatre:'🎭', museum:'🏛️', highway:'🛣️', residential:'🏠',
    service:'🔧', tyre:'🔧', 'motorcycle_shop':'🏍️', shop:'🏪',
    default:'📍'
  };
  return map[type] || map.default || '📍';
}

function savePlace(place) {
  // Avoid duplicates by lat/lng proximity
  const exists = STATE.places.find(p =>
    Math.abs(p.lat - place.lat) < 0.0005 &&
    Math.abs(p.lng - place.lng) < 0.0005
  );
  if (!exists) {
    place.id = Date.now() % 1000000;
    STATE.places.push(place);
    ls('bs_places', STATE.places);
  }
}

function loadPlaces() {
  STATE.places = ls('bs_places') || [...SEED_PLACES];
}

// ============================================================
// BADGE SYSTEM — stats-based evaluation
// ============================================================
function getUserStats(userId) {
  if (!userId) return {};
  if (STATE.userStats[userId]) return STATE.userStats[userId];

  const u = STATE.users.find(x => x.id === userId);
  const rides = STATE.attendance.filter(a => a.user_id === userId).length;
  const routes_created = STATE.routes.filter(r => r.created_by === userId).length;
  const photos = STATE.posts.filter(p => p.user_id === userId && p.image_url).length;
  const chat_messages = STATE.chatMessages.filter(m => m.user_id === userId).length;
  const posts = STATE.posts.filter(p => p.user_id === userId).length;
  const photos_total = photos + posts; // approximation
  const total_km = STATE.routes.filter(r => r.created_by === userId).reduce((acc, r) => {
    // Estimate km: Haversine distance start-end
    if (!r.start_lat || !r.end_lat) return acc;
    const R = 6371;
    const dLat = (r.end_lat - r.start_lat) * Math.PI / 180;
    const dLng = (r.end_lng - r.start_lng) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(r.start_lat*Math.PI/180)*Math.cos(r.end_lat*Math.PI/180)*Math.sin(dLng/2)**2;
    const c = 2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
    return acc + R * c;
  }, 0);

  // Streak: consecutive days with any activity
  const allDates = new Set();
  STATE.attendance.filter(a => a.user_id === userId).forEach(a => allDates.add(a.date));
  STATE.chatMessages.filter(m => m.user_id === userId).forEach(m => allDates.add(m.created_at ? m.created_at.split(' ')[0] : null));
  STATE.posts.filter(p => p.user_id === userId).forEach(p => allDates.add(p.created_at ? p.created_at.split(' ')[0] : null));
  allDates.delete(null);
  const sortedDates = [...allDates].sort();
  let streak = 0, streakCount = 0;
  const today = new Date().toISOString().split('T')[0];
  if (sortedDates.length > 0) {
    const lastDate = new Date(sortedDates[sortedDates.length - 1]);
    const diff = (new Date(today) - lastDate) / 86400000;
    if (diff <= 1) {
      streakCount = 1;
      for (let i = sortedDates.length - 2; i >= 0; i--) {
        const d = new Date(sortedDates[i]);
        const diff2 = (new Date(sortedDates[i+1]) - d) / 86400000;
        if (diff2 === 1) streakCount++;
        else break;
      }
      streak = streakCount;
    }
  }

  const joinDate = u?.created_at ? new Date(u.created_at) : new Date();
  const daysActive = Math.floor((new Date() - joinDate) / 86400000);

  const stats = {
    rides, routes_created, photos: photos_total, chat_messages,
    total_km: Math.round(total_km),
    days_active: daysActive,
    streak,
    events: rides,
    posts: STATE.posts.filter(p => p.user_id === userId).length,
    // New stats — track via user record (admin can set), default 0
    early_bird: u?.stats?.early_bird || 0,
    night_owl: u?.stats?.night_owl || 0,
    founding: u?.stats?.founding || 0,
    mentor: u?.stats?.mentor || 0,
  };
  STATE.userStats[userId] = stats;
  return stats;
}

// ============================================================
// WEEKLY WALL OF FAME
// ============================================================
function getWeekStart() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? 6 : day - 1; // Monday = start of week
  const mon = new Date(now);
  mon.setDate(now.getDate() - diff);
  mon.setHours(0,0,0,0);
  return mon;
}

function getWeeklyRankings() {
  const weekStart = getWeekStart();
  const weekStartStr = weekStart.toISOString().slice(0,10);

  // Accumulators: userId -> { km, likes, photos }
  const acc = {};

  // Posts likes received this week
  STATE.posts.forEach(p => {
    if (!p.created_at) return;
    const postDate = p.created_at.slice(0,10);
    if (postDate < weekStartStr) return;
    const likeCount = (p.likes || []).length;
    if (likeCount === 0) return;
    if (!acc[p.user_id]) acc[p.user_id] = { km:0, likes:0, photos:0 };
    acc[p.user_id].likes += likeCount;
  });

  // Posts with photos this week
  STATE.posts.forEach(p => {
    if (!p.created_at) return;
    const postDate = p.created_at.slice(0,10);
    if (postDate < weekStartStr) return;
    if (!p.image_url) return;
    if (!acc[p.user_id]) acc[p.user_id] = { km:0, likes:0, photos:0 };
    acc[p.user_id].photos++;
  });

  // Build rankings
  const kmRanking = Object.entries(acc)
    .map(([uid, data]) => ({ user_id: parseInt(uid), km: data.km }))
    .sort((a,b) => b.km - a.km);
  const likesRanking = Object.entries(acc)
    .map(([uid, data]) => ({ user_id: parseInt(uid), likes: data.likes }))
    .sort((a,b) => b.likes - a.likes);
  const photosRanking = Object.entries(acc)
    .map(([uid, data]) => ({ user_id: parseInt(uid), photos: data.photos }))
    .sort((a,b) => b.photos - a.photos);

  return {
    km: kmRanking[0] || null,
    likes: likesRanking[0] || null,
    photos: photosRanking[0] || null
  };
}

function evaluateUserBadges(userId) {
  if (!userId) return;
  const stats = getUserStats(userId);
  const newBadges = [];

  STATE.badges.forEach(badge => {
    const current = STATE.userBadges.find(ub => ub.user_id === userId && ub.badge_id === badge.id);
    let value = stats[badge.stat_type] || 0;

    if (badge.stat_type === 'admin_award') {
      value = STATE.users.find(u => u.id === userId)?.is_distinguished ? 1 : 0;
    }

    const earned = value >= badge.threshold;

    if (earned && !current) {
      STATE.userBadges.push({
        user_id: userId,
        badge_id: badge.id,
        earned_at: new Date().toISOString(),
        stat_value: value
      });
      newBadges.push(badge);
    } else if (earned && current) {
      // Update stat value
      current.stat_value = value;
    } else if (!earned && current) {
      // Remove if no longer qualifies
      STATE.userBadges = STATE.userBadges.filter(ub => !(ub.user_id === userId && ub.badge_id === badge.id));
    }
  });

  if (newBadges.length > 0) {
    const totalBonus = newBadges.reduce((acc, b) => acc + b.points_bonus, 0);
    const u = STATE.users.find(u => u.id === userId);
    if (u) {
      const oldLevel = levelNum(u.points || 0);
      u.points = (u.points || 0) + totalBonus;
      const newLevel = levelNum(u.points);
      saveState();
      if (userId === STATE.user?.id) {
        toast(`🏅 +${newBadges.length} insignia(s)! +${totalBonus} pts`);
        newBadges.forEach(b => bsNotifyMe('🏅 ¡Insignia ganada!', b.name + ' · +' + b.points_bonus + ' pts'));
        if (newLevel > oldLevel) {
          bsNotifyMe('⬆️ ¡Subiste de nivel!', '¡Ahora eres ' + levelOf(u.points).name + '! 🎉');
        }
      }
    }
  }
}

function evaluateAllBadges() {
  STATE.users.forEach(u => evaluateUserBadges(u.id));
}

function recalculateUserStats(userId) {
  delete STATE.userStats[userId];
  getUserStats(userId);
  evaluateUserBadges(userId);
}

function renderPlaceDropdown(results, containerId, onSelect) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  if (!results || results.length === 0) {
    container.style.display = 'none';
    return;
  }
  results.forEach(p => {
    const div = document.createElement('div');
    div.style.cssText = 'padding:8px 12px;cursor:pointer;font-size:12px;display:flex;align-items:center;gap:8px;border-bottom:1px solid var(--border);transition:background 0.15s';
    const sub = p.subcategory ? ` · ${p.subcategory}` : '';
    const addr = p.address ? ` · ${p.address.slice(0, 35)}` : '';
    div.innerHTML = `<span style="font-size:14px">${p.icon || '📍'}</span><div style="flex:1;min-width:0"><div style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(p.name)}</div><div style="color:var(--text3);font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(p.category)}${sub}${addr}</div></div>`;
    div.addEventListener('mouseover', () => div.style.background = 'var(--surface3)');
    div.addEventListener('mouseout', () => div.style.background = '');
    div.addEventListener('click', () => { onSelect(p); container.style.display = 'none'; });
    container.appendChild(div);
  });
  container.style.display = 'block';
}

function hidePlaceDropdown(containerId) {
  const container = document.getElementById(containerId);
  if (container) container.style.display = 'none';
}

function setupPlaceSearch(inputId, containerId, onSelect) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.addEventListener('input', function() {
    clearTimeout(_placeSearchTimeout);
    const val = this.value.trim();
    if (val.length < 2) { hidePlaceDropdown(containerId); return; }
    _placeSearchTimeout = setTimeout(async () => {
      const { local, panamaPOIs, online } = await searchPlaces(val);
      const all = [...local, ...panamaPOIs, ...online.filter(o => !local.find(l => Math.abs(l.lat - o.lat) < 0.001 && Math.abs(l.lng - o.lng) < 0.001))];
      renderPlaceDropdown(all.slice(0, 8), containerId, p => {
        input.value = p.name;
        onSelect(p);
      });
    }, 100);
  });
  input.addEventListener('blur', () => setTimeout(() => hidePlaceDropdown(containerId), 200));
  input.addEventListener('focus', () => { if (input.value.trim().length >= 2) input.dispatchEvent(new Event('input')); });
}

function setupPlaceSearchOnModal(container) {
  container.querySelectorAll('[data-place-search]').forEach(function(input) {
    const id = input.id;
    const containerId = id + '-dropdown';
    // Create dropdown on body so it's never clipped by modal overflow
    const dropdown = document.createElement('div');
    dropdown.id = containerId;
    dropdown.style.cssText = 'position:fixed;background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);z-index:99999;max-height:200px;overflow-y:auto;box-shadow:0 8px 24px rgba(0,0,0,0.4);display:none;width:300px';
    document.body.appendChild(dropdown);

    // Position dropdown below input on input/focus/scroll
    function positionDropdown() {
      const rect = input.getBoundingClientRect();
      dropdown.style.left = rect.left + 'px';
      dropdown.style.top = rect.bottom + 2 + 'px';
      dropdown.style.width = Math.max(rect.width, 250) + 'px';
    }
    input.addEventListener('focus', positionDropdown);
    input.addEventListener('input', positionDropdown);
    window.addEventListener('scroll', positionDropdown, true);
    window.addEventListener('resize', positionDropdown);

    const stopPrefix = id.replace('ps-', '');
    setupPlaceSearch(id, containerId, function(place) {
      // Fill coords
      const latInput = document.getElementById(stopPrefix + '-lat');
      const lngInput = document.getElementById(stopPrefix + '-lng');
      if (latInput) latInput.value = place.lat;
      if (lngInput) lngInput.value = place.lng;
      // Save to local DB
      savePlace(place);
      toast(place.isOnline ? 'Lugar guardado en EVA Lube 📍' : 'Lugar seleccionado');
    });
  });
}

function closeAllPlaceDropdowns() {
  document.querySelectorAll('[id$="-dropdown"]').forEach(el => el.style.display = 'none');
}


function ls(key, val) {
  try {
    if (val === undefined) return JSON.parse(localStorage.getItem(key) || 'null');
    localStorage.setItem(key, JSON.stringify(val));
  } catch(e) {
    console.warn('[BS] localStorage error for key:', key, e.message);
  }
  return val;
}

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

function avatarColor(id) {
  const colors = ['#ff4444','#ff8800','#22c55e','#3b82f6','#a855f7','#ec4899','#14b8a6','#f59e0b'];
  return colors[(id || 0) % colors.length];
}

function avatarText(name) {
  return (name || '?').charAt(0).toUpperCase();
}

// Render user avatar HTML — checks dedicated bs_avatar key first, then user object
// Fallback del avatar cuando la imagen falla: dibuja las iniciales. Se llama
// desde el onerror del <img>. Antes el onerror incrustaba HTML con comillas
// dobles dentro de un atributo de comillas dobles, lo que rompía el HTML y
// dejaba basura visible (el '"> que aparecía junto al nombre en el perfil).
function avatarFallback(img, userId) {
  try {
    const u = (STATE.users || []).find(x => x.id === userId) || { username: '?' };
    const c1 = avatarColor(userId), c2 = avatarColor((userId || 0) + 1);
    const sz = img.parentElement.offsetWidth || 38;
    img.parentElement.innerHTML = `<div style="width:100%;height:100%;border-radius:50%;background:linear-gradient(135deg,${c1},${c2});display:flex;align-items:center;justify-content:center;font-weight:900;color:#fff;font-size:${Math.round(sz * 0.38)}px;overflow:hidden">${avatarText(u.username)}</div>`;
  } catch (e) {}
}

function renderAvatar(user, size, style, clickable) {
  const c1 = avatarColor(user.id);
  const c2 = avatarColor((user.id || 0) + 1);
  style = style || '';
  // Priority: HV cache > localStorage (current user) > user object > initials
  const hvPic = _hvAvatarCache[user.id];
  const savedAvatar = (user.id === STATE.user?.id) ? getAvatar() : null;
  const pic = hvPic || savedAvatar || user.avatar || user.profile_pic;
  const clickStyle = clickable && pic ? 'cursor:zoom-in;' : '';
  const clickAttr  = clickable && pic ? `onclick="openLightbox(this.querySelector('img').src)" title="Ver foto"` : '';
  if (pic) {
    const src = pic.startsWith('data:') ? pic : (pic + '?t=' + Date.now());
    return `<div style="width:${size}px;height:${size}px;border-radius:50%;overflow:hidden;flex-shrink:0;${clickStyle}${style}" ${clickAttr}><img src="${src}" style="width:100%;height:100%;object-fit:cover;display:block" onerror="avatarFallback(this,${user.id||0})"></div>`;
  }
  // Kick off async HeyValue fetch for next render (non-blocking)
  if (user.id && HV.user && HV.pass && !_hvAvatarCache[user.id]) {
    loadAvatarFromHV(user.id).then(url => {
      if (url) applyAvatarToUI(url, user.id);
    }).catch(() => {});
  }
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:linear-gradient(135deg,${c1},${c2});display:flex;align-items:center;justify-content:center;font-weight:900;color:#fff;font-size:${Math.round(size*0.38)}px;overflow:hidden;flex-shrink:0;${style}">${avatarText(user.username)}</div>`;
}

// Read a File object and return data URL via Promise
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

// Read a Blob/File and return data URL via Promise
function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

// Dedicated avatar storage — separate from STATE to avoid localStorage quota issues
function saveAvatar(dataUrl) {
  try { localStorage.setItem('bs_avatar', dataUrl); } catch(e) { /* quota full — ignore */ }
}
function getAvatar() {
  try { return localStorage.getItem('bs_avatar') || null; } catch(e) { return null; }
}

// ── Avatar cloud sync — load profile photos from HeyValue (like Gram feed) ──────
const _hvAvatarCache = {};
async function loadAvatarFromHV(userId) {
  if (_hvAvatarCache[userId]) return _hvAvatarCache[userId];
  if (!HV.user || !HV.pass) return null;
  const path = '/BikerApp/profiles/' + userId + '/avatar.jpg';
  const url = HV.url + '/nc' + path;
  try {
    const res = await fetch(url, { headers: { Authorization: 'Basic ' + btoa(HV.user + ':' + HV.pass) } });
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = e => { _hvAvatarCache[userId] = e.target.result; resolve(e.target.result); };
      reader.readAsDataURL(blob);
    });
  } catch(e) { return null; }
}

// Sube el avatar a la nube CREANDO antes las carpetas. WebDAV exige que el
// directorio exista; sin el MKCOL de la carpeta del usuario, el PUT daba 404 y
// por eso la foto no se guardaba en la nube ni la veían los demás miembros.
async function uploadAvatarToHV(userId, dataUrl) {
  if (!HV.user || !HV.pass || !userId || !dataUrl) return false;
  try {
    await hvRequest('MKCOL', '/BikerApp');
    await hvRequest('MKCOL', '/BikerApp/profiles');
    await hvRequest('MKCOL', '/BikerApp/profiles/' + userId);
    const blob = dataURLtoBlob(dataUrl);
    const res = await fetch(HV.url + '/nc/BikerApp/profiles/' + userId + '/avatar.jpg', {
      method: 'PUT',
      headers: { Authorization: 'Basic ' + btoa(HV.user + ':' + HV.pass), 'Content-Type': blob.type || 'image/jpeg' },
      body: blob
    });
    const ok = res.ok || res.status === 201 || res.status === 204;
    if (ok) _hvAvatarCache[userId] = dataUrl;
    return ok;
  } catch (e) { console.warn('[BS] subida de avatar falló:', e); return false; }
}

// Auto-reparación: si tengo avatar guardado localmente pero en la nube falta
// (subida previa fallida por el bug de la carpeta), lo sube ahora.
async function healMyAvatar() {
  try {
    if (!STATE.user || !HV.user || !HV.pass) return;
    const local = getAvatar();
    if (!local) return;
    const res = await fetch(HV.url + '/nc/BikerApp/profiles/' + STATE.user.id + '/avatar.jpg',
      { method: 'HEAD', headers: { Authorization: 'Basic ' + btoa(HV.user + ':' + HV.pass) }, cache: 'no-store' });
    if (res.ok) return; // ya está en la nube
    const ok = await uploadAvatarToHV(STATE.user.id, local);
    if (ok) console.log('[BS] avatar re-subido a la nube (auto-reparación)');
  } catch (e) {}
}

// ── Profile picture: 2-step (preview → confirm save) ─────────────────────────
// Stash the picked file in a module-level var; only persists when user taps "Guardar sí"
var _pendingProfilePic = null; // { dataUrl, rawFile }

async function previewProfilePic(e) {
  const file = e.target.files[0];
  if (!file || !file.type.startsWith('image/')) return;
  e.target.value = '';
  const sizeMB = (file.size / 1024 / 1024).toFixed(1);
  toast(`Procesando foto (${sizeMB}MB)...`);
  try {
    let dataUrl = await compressImage(file, 256, 0.7);
    if (!dataUrl) dataUrl = await fileToDataUrl(file);
    if (dataUrl.length > 800 * 1024) dataUrl = await compressImage(file, 200, 0.6) || dataUrl;
    if (dataUrl.length > 800 * 1024) dataUrl = await compressImage(file, 150, 0.5) || dataUrl;

    _pendingProfilePic = { dataUrl, rawFile: file };

    // Show preview + reveal Save/Cancel buttons
    const display = document.getElementById('profile-pic-display');
    if (display) {
      display.innerHTML = `<img src="${dataUrl}" style="width:96px;height:96px;border-radius:50%;object-fit:cover;display:block;border:3px solid #ff4444">`;
    }
    const actions = document.getElementById('profile-pic-actions');
    if (actions) actions.style.display = 'flex';
    toast('Foto lista — toca Guardar sí para confirmar');
  } catch(err) {
    console.error('[BS] Preview failed:', err);
    toast('❌ Error al procesar foto: ' + err.message);
  }
}

async function confirmSaveProfilePic() {
  if (!_pendingProfilePic) {
    toast('No hay foto pendiente');
    return;
  }
  const { dataUrl } = _pendingProfilePic;
  toast('💾 Guardando foto...');
  try {
    // 1. Save to dedicated localStorage key (the source of truth)
    saveAvatar(dataUrl);
    // 2. Update STATE so any current renders show it
    applyAvatarToUI(dataUrl);
    // 3. Persist the session so the avatar survives a refresh
    try {
      const session = ls('bs_session');
      if (session && session.id === STATE.user.id) {
        session.avatar = dataUrl;
        session.profile_pic = dataUrl;
        ls('bs_session', session);
      }
    } catch(e) { /* ignore */ }
    // 4. Save user data (avatar) to localStorage so it loads on next visit
    try {
      const idx = STATE.users.findIndex(u => u.id === STATE.user.id);
      if (idx >= 0) {
        STATE.users[idx].avatar = dataUrl;
        STATE.users[idx].profile_pic = dataUrl;
        STATE.user.avatar = dataUrl;
        STATE.user.profile_pic = dataUrl;
        ls('bs_users', STATE.users);
      }
    } catch(e) { console.warn('[BS] Could not save users list:', e); }
    // 5. Push to EC2 so other members see the photo immediately
    _ec2Push().catch(() => {});
    // 6. Subir a la nube creando la carpeta del usuario (antes fallaba con 404
    //    porque no se creaba /BikerApp/profiles/<id>/ antes del PUT).
    let cloudOk = false;
    if (HV.user && HV.pass) {
      cloudOk = await uploadAvatarToHV(STATE.user.id, dataUrl);
      if (!cloudOk) console.warn('[BS] avatar no subió a la nube; queda local y se reintenta luego');
    }
    _pendingProfilePic = null;
    // Hide buttons, restore normal display
    const actions = document.getElementById('profile-pic-actions');
    if (actions) actions.style.display = 'none';
    const display = document.getElementById('profile-pic-display');
    if (display) {
      const u = STATE.user;
      display.innerHTML = renderAvatar(u, 96);
    }
    toast(cloudOk ? '✅ Foto de perfil actualizada' : '✅ Guardada (se sincronizará al reconectar)');
    // Re-render profile to make sure all references are fresh
    if (typeof renderProfile === 'function') renderProfile();
  } catch(err) {
    console.error('[BS] Save failed:', err);
    toast('❌ Error al guardar: ' + err.message);
  }
}

function cancelProfilePic() {
  _pendingProfilePic = null;
  const actions = document.getElementById('profile-pic-actions');
  if (actions) actions.style.display = 'none';
  const display = document.getElementById('profile-pic-display');
  if (display) {
    display.innerHTML = renderAvatar(STATE.user, 96);
  }
  // Reset file input so picking the same file again triggers change
  const input = document.getElementById('profile-pic-input');
  if (input) input.value = '';
  toast('Cancelado');
}

// Backwards compat: keep old name as a wrapper that just previews (no auto-save)
async function handleProfilePicChange(e) {
  return previewProfilePic(e);
}

// Apply avatar URL to all visible avatar elements without re-rendering the whole page
function applyAvatarToUI(avatarUrl, forUserId) {
  const uid = forUserId || STATE.user?.id;
  if (!uid) return;
  // Update STATE so any future renderProfile() etc. pick it up
  if (uid === STATE.user?.id) {
    STATE.user.avatar = avatarUrl;
    STATE.user.profile_pic = avatarUrl;
  }
  const idx = STATE.users.findIndex(u => u.id === uid);
  if (idx >= 0) { STATE.users[idx].avatar = avatarUrl; STATE.users[idx].profile_pic = avatarUrl; }

  // Patch every avatar img on screen immediately (no re-render needed)
  // We try multiple selectors to cover all possible avatar containers
  const updateSrc = (img) => {
    const src = avatarUrl.startsWith('data:') ? avatarUrl : (avatarUrl + '?t=' + Date.now());
    img.src = src;
    img.onerror = null; // clear old error handler
  };
  document.querySelectorAll('img').forEach(img => {
    // Heuristic: small square images with no alt or with "avatar" context
    const isAvatar = (
      img.closest('[class*="avatar"]') ||
      img.closest('[data-avatar-user]') ||
      (img.style.borderRadius === '50%') ||
      (img.width && img.width <= 80 && img.height && img.height <= 80) ||
      img.parentElement?.style?.borderRadius === '50%' ||
      (img.className && img.className.includes('avatar'))
    );
    if (isAvatar) updateSrc(img);
  });

  // If profile page is visible, re-render it — but NOT while the user is mid-edit
  const profilePage = document.getElementById('page-profile');
  if (profilePage && profilePage.style.display !== 'none' && !_pendingProfilePic) {
    renderProfile();
  }
}

function dataURLtoBlob(dataUrl) {
  const [header, data] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)[1];
  const bytes = atob(data);
  const buf = new ArrayBuffer(bytes.length);
  const arr = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([buf], { type: mime });
}

// ¿El navegador puede codificar WebP? (Android WebView y Chrome modernos sí).
// WebP pesa ~25-35% menos que JPEG a igual calidad => las fotos cargan más
// rápido. Se detecta una sola vez y se cachea.
let _webpSupported = null;
function supportsWebp() {
  if (_webpSupported !== null) return _webpSupported;
  try {
    const c = document.createElement('canvas');
    c.width = c.height = 1;
    _webpSupported = c.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  } catch (e) { _webpSupported = false; }
  return _webpSupported;
}

// Comprime una imagen a una dimensión máxima y la recodifica en el formato más
// ligero disponible (WebP > JPEG). Devuelve un data URL, o null si no es imagen.
async function compressImage(file, maxDim = 800, quality = 0.82) {
  if (!file.type.startsWith('image/')) return null;
  const dataUrl = await fileToDataUrl(file);
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      let w = img.width, h = img.height;
      if (w > maxDim || h > maxDim) {
        const scale = Math.min(maxDim / w, maxDim / h);
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      // WebP cuando se pueda (más ligero y conserva transparencia); si no,
      // PNG para imágenes con transparencia y JPEG para el resto.
      const fmt = supportsWebp()
        ? 'image/webp'
        : (file.type === 'image/png' ? 'image/png' : 'image/jpeg');
      const out = canvas.toDataURL(fmt, quality);
      resolve(out);
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts.includes(' ') ? ts.replace(' ','T') : ts);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'ahora';
  if (diff < 3600) return Math.floor(diff/60)+'m';
  if (diff < 86400) return Math.floor(diff/3600)+'h';
  return Math.floor(diff/86400)+'d';
}

function levelOf(points) {
  if (points >= 100000) return {name:'Maestro',min:100000,color:'#a855f7',n:5};
  if (points >= 30000) return {name:'Leyenda',min:30000,color:'#f59e0b',n:4};
  if (points >= 10000) return {name:'Avanzado',min:10000,color:'#3b82f6',n:3};
  if (points >= 2000) return {name:'Intermedio',min:2000,color:'#22c55e',n:2};
  return {name:'Novato',min:0,color:'#888',n:1};
}

function levelNum(points) {
  if (points >= 100000) return 5;
  if (points >= 30000) return 4;
  if (points >= 10000) return 3;
  if (points >= 2000) return 2;
  return 1;
}

function nextLevel(points) {
  const lv = levelOf(points);
  const next = [2000,10000,30000,100000,Infinity].find(n => n > points) || Infinity;
  return next;
}

function levelProgress(points) {
  const lv = levelOf(points);
  const next = nextLevel(points);
  if (next === Infinity) return 100;
  return ((points - lv.min) / (next - lv.min)) * 100;
}

function initials(name) {
  return (name || '').split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase();
}

function timeAgo(ts) {
  if (!ts) return '';
  const d = new Date(ts.replace(' ','T'));
  const now = new Date();
  const s = Math.floor((now - d) / 1000);
  if (s < 60) return 'hace ' + s + 's';
  if (s < 3600) return 'hace ' + Math.floor(s/60) + 'm';
  if (s < 86400) return 'hace ' + Math.floor(s/3600) + 'h';
  return 'hace ' + Math.floor(s/86400) + 'd';
}

