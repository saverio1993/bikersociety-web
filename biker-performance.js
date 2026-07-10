(() => {
  'use strict';

  const cache = new Map();
  const CACHE_LIMIT = 24;
  const CACHE_TTL = 15 * 60 * 1000;
  const originalFetch = window.fetch.bind(window);

  const jsonResponse = payload => new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });

  const fallbackRoute = url => {
    const match = url.match(/\/driving\/([^?]+)/);
    if (!match) return { code: 'NoRoute', routes: [] };
    const coordinates = match[1].split(';').map(pair => pair.split(',').map(Number)).filter(pair => pair.length === 2 && pair.every(Number.isFinite));
    return coordinates.length > 1
      ? { code: 'Ok', routes: [{ geometry: { type: 'LineString', coordinates } }] }
      : { code: 'NoRoute', routes: [] };
  };

  window.fetch = async (resource, init) => {
    const url = typeof resource === 'string' ? resource : resource?.url || '';
    const isRoute = url.includes('router.project-osrm.org/route/v1/driving/');
    const isLiveRiders = url.includes('/api/live-riders');

    if (isRoute) {
      const hit = cache.get(url);
      if (hit && Date.now() - hit.at < CACHE_TTL) return jsonResponse(hit.data);
      try {
        const response = await originalFetch(resource, init);
        if (!response.ok) return jsonResponse(fallbackRoute(url));
        const data = await response.clone().json();
        cache.set(url, { at: Date.now(), data });
        if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value);
        return response;
      } catch (error) {
        if (error?.name === 'AbortError') throw error;
        return jsonResponse(fallbackRoute(url));
      }
    }

    if (isLiveRiders) {
      try {
        const response = await originalFetch(resource, init);
        return response.ok ? response : jsonResponse({});
      } catch {
        return jsonResponse({});
      }
    }

    return originalFetch(resource, init);
  };

  const style = document.createElement('style');
  style.id = 'bs-performance-theme';
  style.textContent = `
    :root{--bg:#080b12;--surface:#111722;--surface2:#171f2d;--surface3:#202a3a;--border:rgba(132,151,180,.18);--accent:#ff5a3d;--accent2:#8b5cf6;--glow:rgba(255,90,61,.35)}
    #page-mapas,#page-rutas{background:radial-gradient(circle at 88% 6%,rgba(139,92,246,.16),transparent 26%),radial-gradient(circle at 8% 82%,rgba(255,90,61,.12),transparent 28%),var(--bg)}
    #page-mapas::before,#page-rutas::before{content:'';position:fixed;width:220px;height:220px;right:-90px;top:80px;border-radius:50%;background:rgba(139,92,246,.12);filter:blur(42px);pointer-events:none;animation:bsMapGlow 7s ease-in-out infinite}
    .leaflet-container{background:#101722!important;font-family:Inter,system-ui,sans-serif}.leaflet-control-zoom a{background:#151c28!important;color:#dce6f7!important;border-color:rgba(255,255,255,.1)!important;transition:transform .18s,background .18s}.leaflet-control-zoom a:hover{background:#263247!important;transform:scale(1.07)}
    .route-animated{stroke-dasharray:18 12;animation:bsRouteFlow 1.2s linear infinite;filter:drop-shadow(0 0 5px rgba(255,90,61,.58))}
    #mapas-filter button{border:1px solid rgba(255,255,255,.13)!important;transition:transform .18s,box-shadow .18s,background .18s!important}#mapas-filter button:active{transform:scale(.95)}
    .route-card{border-color:rgba(139,92,246,.22)!important;box-shadow:0 12px 28px rgba(0,0,0,.2)!important;transition:transform .2s,box-shadow .2s,border-color .2s!important}.route-card:hover{transform:translateY(-2px);border-color:rgba(255,90,61,.55)!important;box-shadow:0 16px 34px rgba(0,0,0,.3),0 0 22px rgba(255,90,61,.12)!important}
    @keyframes bsRouteFlow{to{stroke-dashoffset:-30}}@keyframes bsMapGlow{0%,100%{transform:translate3d(0,0,0) scale(1)}50%{transform:translate3d(-26px,24px,0) scale(1.15)}}
    @media (prefers-reduced-motion:reduce){#page-mapas::before,#page-rutas::before,.route-animated{animation:none!important}}
  `;
  document.head.appendChild(style);

  const prepareLeaflet = () => {
    if (!window.L || window.L.__bsFastMap) return;
    const createMap = window.L.map;
    window.L.map = (element, options = {}) => createMap.call(window.L, element, {
      preferCanvas: true,
      updateWhenIdle: true,
      updateWhenZooming: false,
      keepBuffer: 2,
      fadeAnimation: true,
      markerZoomAnimation: true,
      ...options
    });
    window.L.__bsFastMap = true;
  };

  prepareLeaflet();
  const watchedVideos = new WeakSet();
  const videoObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const video = entry.target;
      if (entry.isIntersecting && entry.intersectionRatio >= 0.92) video.play().catch(() => {});
      else video.pause();
    });
  }, { threshold: [0, 0.35, 0.92] });

  const prepareVideo = video => {
    if (watchedVideos.has(video)) return;
    watchedVideos.add(video);
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.loop = true;
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('preload', 'metadata');
    videoObserver.observe(video);
  };

  const scanVideos = root => {
    if (root instanceof HTMLVideoElement) prepareVideo(root);
    root.querySelectorAll?.('video').forEach(prepareVideo);
  };

  scanVideos(document);
  new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(scanVideos)))
    .observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener('resize', () => {
    clearTimeout(window.__bsMapResize);
    window.__bsMapResize = setTimeout(() => {
      [window._mapaMap, window.STATE?.map, window.EN_RUTA?.map].forEach(map => map?.invalidateSize?.({ pan: false }));
    }, 140);
  }, { passive: true });
})();
