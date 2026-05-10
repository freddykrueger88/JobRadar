'use strict';

/**
 * App-Einstiegspunkt
 * Registriert alle Routen und startet den Router.
 */
document.addEventListener('DOMContentLoaded', async () => {

  // Einstellungen & Dark-Mode so früh wie möglich laden
  try {
    const cfg = await api.einstellungen.get();
    state.set('einstellungen', cfg);
    _applyDarkMode(cfg.dark_mode || 'auto');
  } catch (_) {}

  // Routen registrieren
  router.register('dashboard',    () => dashboard.init());
  router.register('bewerbungen',  () => bewerbungenModule.init());
  router.register('suche',        () => sucheModule.init());
  router.register('ki',           () => kiModule.init());
  router.register('einstellungen',() => einstellungenModule.init());
  router.register('import',       () => importModule.init());

  // Profilseite (einfach, kein eigenes Modul nötig)
  router.register('profil', async () => {
    const [profil, erf] = await Promise.all([api.profil.get(), api.erfahrungen.get()]);
    state.set('profil', profil);
    state.set('erfahrungen', erf);
    // Profil-HTML wird vom bestehenden erfahrungen.js gerendert
    if (window.erfahrungenModule) erfahrungenModule.init(profil, erf);
  });

  // Auto-Refresh alle 5 Minuten für das Dashboard
  setInterval(() => {
    if (router.current() === 'dashboard') dashboard.init();
  }, 5 * 60 * 1000);

  // Router starten
  router.start('dashboard');
});

function _applyDarkMode(mode) {
  const root = document.documentElement;
  if (mode === 'dark')  { root.setAttribute('data-theme', 'dark');  return; }
  if (mode === 'light') { root.setAttribute('data-theme', 'light'); return; }
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
}
