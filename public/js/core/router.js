'use strict';

/**
 * Hash-Router
 * Lauscht auf window.hashchange und ruft den passenden Handler auf.
 * Aktualisiert [data-nav] Elemente und blendet .tabpanel Panels ein.
 */
const router = (() => {
  const routes = new Map();
  let defaultRoute = 'dashboard';

  function register(hash, handler) {
    routes.set(hash, handler);
  }

  function navigate(hash, pushState = true) {
    if (pushState) window.location.hash = hash;
    // Panel-Sichtbarkeit
    document.querySelectorAll('.tabpanel').forEach(p => p.classList.remove('active'));
    const panel = document.getElementById(hash) || document.getElementById(_panelAlias(hash));
    if (panel) panel.classList.add('active');
    // Handler aufrufen
    const handler = routes.get(hash) || routes.get(defaultRoute);
    if (handler) handler(hash);
    _updateNavActive(hash);
  }

  function start(fallback = 'dashboard') {
    defaultRoute = fallback;
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.replace('#', '') || fallback;
      navigate(hash, false);
    });
    const initial = window.location.hash.replace('#', '') || fallback;
    navigate(initial, false);
  }

  function current() {
    return window.location.hash.replace('#', '') || defaultRoute;
  }

  function _updateNavActive(hash) {
    document.querySelectorAll('[data-nav]').forEach(el => {
      el.classList.toggle('active', el.dataset.nav === hash);
    });
  }

  // Routen-Alias: Route-Name → Panel-ID falls abweichend
  // Hinweis: 'ki' hat ein eigenes tabpanel (id='ki'), kein Alias nötig.
  function _panelAlias(hash) {
    const aliases = {
      'ki-verlauf': 'anschreiben-verlauf',
    };
    return aliases[hash] || hash;
  }

  return { register, navigate, start, current };
})();

window.router = router;
