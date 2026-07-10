(() => {
  'use strict';

  const toArray = value => Array.isArray(value) ? value : [];
  const number = value => Number.isFinite(Number(value)) ? Number(value) : 0;

  const injectHomeStats = () => {
    if (typeof STATE === 'undefined') return;
    const page = document.getElementById('page-inicio');
    if (!page || !page.innerHTML.trim() || page.querySelector('#bs-home-stats')) return;

    const user = STATE.user || {};
    const attendance = toArray(STATE.attendance).filter(item => item.user_id === user.id).length;
    const routes = toArray(STATE.routes).filter(item => item.created_by === user.id).length;
    const badges = toArray(STATE.userBadges).filter(item => item.user_id === user.id).length;
    const posts = toArray(STATE.posts).filter(item => item.user_id === user.id).length;
    const points = number(user.points);
    const nextGoal = Math.ceil((points + 1) / 100) * 100;
    const progress = Math.min(100, Math.max(4, Math.round((points / nextGoal) * 100)));

    const dashboard = document.createElement('section');
    dashboard.id = 'bs-home-stats';
    dashboard.className = 'bs-home-stats vanish';
    dashboard.innerHTML = `
      <div class="bs-home-stats-head"><div><span>MI ACTIVIDAD</span><strong>${user.username || 'Biker'}</strong></div><div class="bs-home-level">${points} pts</div></div>
      <div class="bs-home-progress"><i style="width:${progress}%"></i></div>
      <div class="bs-home-goal">Siguiente meta: ${nextGoal} puntos</div>
      <div class="bs-home-grid">
        <div><b data-bs-count="${routes}">0</b><span>Rutas</span></div>
        <div><b data-bs-count="${attendance}">0</b><span>Eventos</span></div>
        <div><b data-bs-count="${badges}">0</b><span>Insignias</span></div>
        <div><b data-bs-count="${posts}">0</b><span>Posts</span></div>
      </div>`;

    const banner = page.querySelector('#welcome-banner');
    if (banner) banner.insertAdjacentElement('afterend', dashboard);
    else page.prepend(dashboard);

    dashboard.querySelectorAll('[data-bs-count]').forEach(element => {
      const end = number(element.dataset.bsCount);
      const started = performance.now();
      const tick = now => {
        const ratio = Math.min(1, (now - started) / 520);
        element.textContent = Math.round(end * (1 - Math.pow(1 - ratio, 3)));
        if (ratio < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  };

  const styles = document.createElement('style');
  styles.textContent = `
    .bs-home-stats{margin:0 0 16px;padding:15px;border:1px solid rgba(139,92,246,.28);border-radius:18px;background:linear-gradient(135deg,rgba(139,92,246,.17),rgba(255,90,61,.12));box-shadow:0 14px 30px rgba(0,0,0,.22);overflow:hidden}.bs-home-stats-head{display:flex;align-items:center;justify-content:space-between}.bs-home-stats-head span{display:block;font-size:10px;letter-spacing:1.4px;font-weight:800;color:#b6a8ff}.bs-home-stats-head strong{display:block;margin-top:3px;font-size:17px}.bs-home-level{padding:7px 10px;border-radius:999px;background:rgba(255,255,255,.1);font-size:12px;font-weight:800;color:#ffae9d}.bs-home-progress{height:7px;overflow:hidden;margin:13px 0 6px;border-radius:99px;background:rgba(0,0,0,.28)}.bs-home-progress i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#ff5a3d,#8b5cf6);box-shadow:0 0 14px rgba(139,92,246,.65);transition:width .8s cubic-bezier(.2,.8,.2,1)}.bs-home-goal{font-size:11px;color:#b6c0d0}.bs-home-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:14px}.bs-home-grid div{padding:10px 5px;border-radius:12px;text-align:center;background:rgba(9,12,19,.32)}.bs-home-grid b{display:block;font-size:20px;color:#fff}.bs-home-grid span{display:block;margin-top:2px;font-size:10px;color:#aeb8c9}@media(max-width:370px){.bs-home-grid b{font-size:17px}.bs-home-grid span{font-size:9px}}
  `;
  document.head.appendChild(styles);

  const patchRender = () => {
    if (typeof window.renderInicio !== 'function' || window.renderInicio.__bsHomePatched) return false;
    const original = window.renderInicio;
    const enhanced = function (...args) {
      if (typeof STATE !== 'undefined') {
        STATE.attendance = toArray(STATE.attendance);
        STATE.routes = toArray(STATE.routes);
        STATE.userBadges = toArray(STATE.userBadges);
        STATE.posts = toArray(STATE.posts);
      }
      const result = original.apply(this, args);
      requestAnimationFrame(injectHomeStats);
      return result;
    };
    enhanced.__bsHomePatched = true;
    window.renderInicio = enhanced;
    return true;
  };

  new MutationObserver(injectHomeStats).observe(document.documentElement, { childList: true, subtree: true });
  const timer = setInterval(() => {
    if (patchRender()) clearInterval(timer);
    injectHomeStats();
  }, 100);
})();
