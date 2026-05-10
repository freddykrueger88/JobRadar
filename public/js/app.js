'use strict';

document.addEventListener('DOMContentLoaded', async () => {

  try {
    const cfg = await api.einstellungen.get();
    state.set('einstellungen', cfg);
    
    // Verbessertes Theme-Handling: Unterstützt nun alle Themen-Varianten
    const theme = cfg.dark_mode || 'auto';
    _applyTheme(theme);
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
 */
function _legacyInit(panelId) {
  if (panelId === 'vault'        && window._vaultInit)              window._vaultInit();
  if (panelId === 'ki-verlauf'   && window.ladeAnschreibenVerlauf)  window.ladeAnschreibenVerlauf();
}

/**
 * Wendet das gewählte Theme auf das Dokument an.
 * Unterstützt explizite Themen (dark, light, blue, green, purple, server)
 * sowie den 'auto' Modus basierend auf Systemeinstellungen.
 */
function _applyTheme(mode) {
  const root = document.documentElement;
  
  if (mode === 'auto') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  } else {
    // Validiert, ob das Theme existiert, ansonsten Fallback auf dark
    const validThemes = ['dark', 'light', 'blue', 'green', 'purple', 'server'];
    const theme = validThemes.includes(mode) ? mode : 'dark';
    root.setAttribute('data-theme', theme);
  }
}

// Global verfügbar machen, damit Module es nutzen können
window._applyTheme = _applyTheme;
