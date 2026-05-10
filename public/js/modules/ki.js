'use strict';

const kiModule = (() => {

  async function init() {
    _renderShell();
    await Promise.all([_ladeModelle(), _ladeVerlauf()]);
    _bindEvents();
  }

  function _renderShell() {
    document.getElementById('main-content').innerHTML = `
      <div class="ki-page">
        <h1 class="page-title">🤖 KI-Anschreiben</h1>

        <div class="card ki-form-card">
          <div class="form-row">
            <div class="form-group">
              <label>Stelle *</label>
              <input id="ki-titel" class="input" placeholder="z.B. IT-Systemadministrator" required>
            </div>
            <div class="form-group">
              <label>Firma *</label>
              <input id="ki-firma" class="input" placeholder="z.B. Acme GmbH" required>
            </div>
          </div>
          <div class="form-group">
            <label>Stellenbeschreibung <small>(optional, verbessert das Ergebnis)</small></label>
            <textarea id="ki-beschreibung" class="input textarea" rows="5" placeholder="Stellenbeschreibung einfügen…"></textarea>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Modell</label>
              <select id="ki-modell" class="input">
                <option value="">Wird geladen…</option>
              </select>
            </div>
          </div>
          <div id="ki-status-info" class="ki-status-info"></div>
          <button id="btn-ki-generieren" class="btn btn--primary btn--lg">✨ Anschreiben generieren</button>
        </div>

        <div id="ki-ergebnis" class="card ki-ergebnis" style="display:none">
          <div class="ki-ergebnis__header">
            <h2>Generiertes Anschreiben</h2>
            <div class="ki-ergebnis__actions">
              <button id="btn-ki-kopieren" class="btn btn--sm">📋 Kopieren</button>
              <button id="btn-ki-pdf"      class="btn btn--sm">📄 PDF</button>
            </div>
          </div>
          <textarea id="ki-text" class="input textarea" rows="15"></textarea>
        </div>

        <div class="card">
          <h2 class="card__title">Verlauf</h2>
          <ul id="ki-verlauf" class="ki-verlauf"></ul>
        </div>
      </div>`;
  }

  async function _ladeModelle() {
    const select = document.getElementById('ki-modell');
    const info   = document.getElementById('ki-status-info');
    try {
      const modelle = await api.ki.modelle();
      const cfg     = await api.einstellungen.get();
      select.innerHTML = modelle.map(m =>
        `<option value="${ui.escHtml(m)}" ${m === cfg.ki_modell ? 'selected' : ''}>${ui.escHtml(m)}</option>`
      ).join('');
      info.innerHTML = `<span class="badge badge--success">✅ Ollama verbunden — ${modelle.length} Modell(e)</span>`;
    } catch (e) {
      select.innerHTML = '<option value="">Ollama nicht erreichbar</option>';
      info.innerHTML   = `<span class="badge badge--error">❌ ${ui.escHtml(e.message)}</span>`;
    }
  }

  async function _ladeVerlauf() {
    const list = document.getElementById('ki-verlauf');
    try {
      const verlauf = await api.ki.verlauf(10);
      if (!verlauf.length) { list.innerHTML = '<li class="empty">Noch kein Verlauf.</li>'; return; }
      list.innerHTML = verlauf.map(v => `
        <li class="ki-verlauf-item">
          <span class="ki-verlauf-item__date">${ui.formatDate(v.erstellt_am)}</span>
          <strong>${ui.escHtml(v.firma)} — ${ui.escHtml(v.titel)}</strong>
          <span class="badge">${ui.escHtml(v.model)}</span>
          <button class="btn btn--xs" data-action="verlauf-laden" data-text="${ui.escHtml(v.text)}">🗂 Laden</button>
        </li>`).join('');
    } catch (_) {}
  }

  function _bindEvents() {
    document.getElementById('btn-ki-generieren')?.addEventListener('click', async () => {
      const titel       = document.getElementById('ki-titel').value.trim();
      const firma       = document.getElementById('ki-firma').value.trim();
      const beschreibung = document.getElementById('ki-beschreibung').value.trim();
      const modell      = document.getElementById('ki-modell').value;

      if (!titel || !firma) { ui.warning('Stelle und Firma sind Pflichtfelder.'); return; }

      // Gewähltes Modell in Einstellungen speichern
      if (modell) await api.einstellungen.update({ ki_modell: modell }).catch(() => {});

      const btn = document.getElementById('btn-ki-generieren');
      btn.disabled    = true;
      btn.textContent = '⏳ Generiere…';

      try {
        const { text } = await api.ki.generieren({ titel, firma, stellenbeschreibung: beschreibung });
        document.getElementById('ki-text').value = text;
        document.getElementById('ki-ergebnis').style.display = 'block';
        document.getElementById('ki-ergebnis').scrollIntoView({ behavior: 'smooth' });
        ui.success('Anschreiben generiert!');
        _ladeVerlauf();
      } catch (e) {
        ui.error('Fehler: ' + e.message);
      } finally {
        btn.disabled    = false;
        btn.textContent = '✨ Anschreiben generieren';
      }
    });

    document.getElementById('btn-ki-kopieren')?.addEventListener('click', async () => {
      const text = document.getElementById('ki-text').value;
      await navigator.clipboard.writeText(text).catch(() => {});
      ui.success('Kopiert!');
    });

    document.getElementById('btn-ki-pdf')?.addEventListener('click', () => {
      const text = document.getElementById('ki-text').value;
      const win  = window.open('', '_blank');
      win.document.write(`<pre style="font-family:serif;font-size:14px;line-height:1.6;padding:2cm">${ui.escHtml(text)}</pre>`);
      win.print();
    });

    // Verlauf-Eintrag laden
    document.getElementById('ki-verlauf')?.addEventListener('click', e => {
      const btn = e.target.closest('[data-action="verlauf-laden"]');
      if (!btn) return;
      document.getElementById('ki-text').value = btn.dataset.text;
      document.getElementById('ki-ergebnis').style.display = 'block';
    });
  }

  return { init };
})();

window.kiModule = kiModule;
