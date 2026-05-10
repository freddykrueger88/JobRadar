'use strict';

document.addEventListener('DOMContentLoaded', async () => {

  try {
    const cfg = await api.einstellungen.get();
    state.set('einstellungen', cfg);
    _applyDarkMode(cfg.dark_mode || 'auto');
  } catch (_) {}

  // Haupt-Routen
  router.register('dashboard',     () => dashboard.init());
  router.register('suche',         () => sucheModule.init());
  router.register('bewerbungen',   () => bewerbungenModule.init());
  router.register('kanban',        () => kanbanModule ? kanbanModule.init() : _legacyInit('kanban'));
  router.register('ki',            () => kiModule.init());
  router.register('ki-verlauf',    () => _legacyInit('ki-verlauf'));
  router.register('vorlagen',      () => _legacyInit('vorlagen'));
  router.register('erfahrungen',   () => _legacyInit('erfahrungen'));
  router.register('vault',         () => _legacyInit('vault'));
  router.register('einstellungen', () => einstellungenModule.init());
  router.register('import',        () => importModule.init());

  router.register('profil', async () => {
    const [profil, erf] = await Promise.all([api.profil.get(), api.erfahrungen.get()]);
    state.set('profil', profil);
    state.set('erfahrungen', erf);
    if (window.erfahrungenModule) erfahrungenModule.init(profil, erf);
  });

  setInterval(() => {
    if (router.current() === 'dashboard') dashboard.init();
  }, 5 * 60 * 1000);

  router.start('dashboard');
});

/**
 * Legacy-Panels ohne eigenes Modul.
 * Das Ein-/Ausblenden übernimmt bereits router.navigate() —
 * hier nur noch zusätzliche Initialisierung falls nötig.
 */
function _legacyInit(panelId) {
  if (panelId === 'vault'        && window._vaultInit)              window._vaultInit();
  if (panelId === 'ki-verlauf'   && window.ladeAnschreibenVerlauf)  window.ladeAnschreibenVerlauf();
}

function _applyDarkMode(mode) {
  const root = document.documentElement;
  if (mode === 'dark')  { root.setAttribute('data-theme', 'dark');  return; }
  if (mode === 'light') { root.setAttribute('data-theme', 'light'); return; }
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
}
