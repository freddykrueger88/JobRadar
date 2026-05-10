'use strict';

/**
 * Hash-Router
 * Lauscht auf window.hashchange und ruft den passenden Handler auf.
 * Verwendung:
 *   router.register('suche', () => suchModule.init());
 *   router.start('dashboard'); // Standard-Route
 */
const router = (() => {
  const routes = new Map();
  let defaultRoute = 'dashboard';

  function register(hash, handler) {
    routes.set(hash, handler);
  }

  function navigate(hash, pushState = true) {
    if (pushState) window.location.hash = hash;
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
    // Initiale Route
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

  return { register, navigate, start, current };
})();

window.router = router;
