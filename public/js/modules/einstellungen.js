'use strict';

const einstellungenModule = (() => {

  async function init() {
    const cfg = await api.einstellungen.get().catch(() => ({}));
    _render(cfg);
    _bindEvents();
  }

  function _render(cfg) {
    document.getElementById('main-content').innerHTML = `
      <div class="einstellungen-page">
        <h1 class="page-title">⚙️ Einstellungen</h1>

        <form id="settings-form" class="form">

          <div class="card">
            <h2 class="card__title">🤖 KI-Einstellungen</h2>
            <div class="form-row">
              <div class="form-group">
                <label>Stil</label>
                <select name="ki_stil" class="input">
                  <option value="formell"  ${cfg.ki_stil === 'formell'  ? 'selected' : ''}>Formell & professionell</option>
                  <option value="modern"   ${cfg.ki_stil === 'modern'   ? 'selected' : ''}>Modern & direkt</option>
                  <option value="kurz"     ${cfg.ki_stil === 'kurz'     ? 'selected' : ''}>Kurz & prägnant</option>
                </select>
              </div>
              <div class="form-group">
                <label>Sprache</label>
                <select name="ki_sprache" class="input">
                  <option value="deutsch" ${cfg.ki_sprache === 'deutsch'  ? 'selected' : ''}>Deutsch</option>
                  <option value="englisch" ${cfg.ki_sprache === 'englisch' ? 'selected' : ''}>Englisch</option>
                </select>
              </div>
              <div class="form-group">
                <label>Länge</label>
                <select name="ki_laenge" class="input">
                  <option value="kurz"   ${cfg.ki_laenge === 'kurz'   ? 'selected' : ''}>Kurz (~150 W.)</option>
                  <option value="mittel" ${cfg.ki_laenge === 'mittel' ? 'selected' : ''}>Mittel (~250 W.)</option>
                  <option value="lang"   ${cfg.ki_laenge === 'lang'   ? 'selected' : ''}>Lang (~400 W.)</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label>Zusätzliche Hinweise für die KI</label>
              <textarea name="ki_hinweise" class="input textarea" rows="3" maxlength="1000" placeholder="z.B. Erwähne immer meine Leidenschaft für Linux…">${ui.escHtml(cfg.ki_hinweise || '')}</textarea>
            </div>
          </div>

          <div class="card">
            <h2 class="card__title">🔔 Benachrichtigungen</h2>
            <div class="form-group">
              <label class="checkbox-label">
                <input type="checkbox" name="push_aktiv" ${cfg.push_aktiv ? 'checked' : ''}>
                Push-Benachrichtigungen aktivieren
              </label>
            </div>
            <div class="form-group">
              <label>Prüfintervall (Minuten)</label>
              <input name="push_intervall_min" type="number" class="input" value="${cfg.push_intervall_min || 30}" min="5" max="1440">
            </div>
          </div>

          <div class="card">
            <h2 class="card__title">🎭 Darstellung</h2>
            <div class="form-group">
              <label>Dark Mode</label>
              <select name="dark_mode" class="input">
                <option value="auto"  ${cfg.dark_mode === 'auto'  ? 'selected' : ''}>Systemeinstellung</option>
                <option value="dark"  ${cfg.dark_mode === 'dark'  ? 'selected' : ''}>Immer dunkel</option>
                <option value="light" ${cfg.dark_mode === 'light' ? 'selected' : ''}>Immer hell</option>
              </select>
            </div>
          </div>

          <div class="form-actions">
            <button type="submit" class="btn btn--primary btn--lg">💾 Einstellungen speichern</button>
          </div>
        </form>
      </div>`;
  }

  function _bindEvents() {
    document.getElementById('settings-form')?.addEventListener('submit', async e => {
      e.preventDefault();
      const fd   = new FormData(e.target);
      const data = Object.fromEntries(fd.entries());
      // Checkboxen korrekt mappen
      data.push_aktiv = fd.has('push_aktiv') ? true : false;
      // Zahlen
      data.push_intervall_min = +data.push_intervall_min;
      try {
        await api.einstellungen.update(data);
        ui.success('Einstellungen gespeichert!');
        _applyDarkMode(data.dark_mode);
      } catch (err) { ui.error(err.message); }
    });
  }

  function _applyDarkMode(mode) {
    const root = document.documentElement;
    if (mode === 'dark')  { root.setAttribute('data-theme', 'dark');  return; }
    if (mode === 'light') { root.setAttribute('data-theme', 'light'); return; }
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  }

  return { init };
})();

window.einstellungenModule = einstellungenModule;
