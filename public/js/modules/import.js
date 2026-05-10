'use strict';

const importModule = (() => {

  async function init() {
    _render();
    _bindEvents();
  }

  function _render() {
    document.getElementById('import').innerHTML = `
      <div class="import-page">
        <h1 class="page-title">\uD83D\uDCE5 Import</h1>

        <div class="card">
          <h2 class="card__title">Excel / CSV importieren</h2>
          <p class="text-muted">Unterstützte Formate: <code>.xlsx</code>, <code>.csv</code>, <code>.xls</code> &mdash; max. 5 MB</p>

          <div id="dropzone" class="dropzone">
            <span>\uD83D\uDCC2 Datei hierher ziehen oder klicken</span>
            <input type="file" id="import-file" accept=".xlsx,.csv,.xls" style="display:none">
          </div>

          <div id="import-vorschau" style="display:none">
            <h3>Vorschau (erste 10 Zeilen)</h3>
            <div id="vorschau-tabelle" class="overflow-x"></div>
            <div id="mapping-info" class="mapping-info"></div>
            <div class="form-actions">
              <button id="btn-import-starten" class="btn btn--primary">\uD83D\uDCE5 Import starten</button>
            </div>
          </div>

          <div id="import-ergebnis" style="display:none" class="import-ergebnis"></div>
        </div>
      </div>`;
  }

  function _bindEvents() {
    let _file = null;
    const dropzone  = document.getElementById('dropzone');
    const fileInput = document.getElementById('import-file');
    dropzone?.addEventListener('click', () => fileInput.click());
    dropzone?.addEventListener('dragover',  e => { e.preventDefault(); dropzone.classList.add('dropzone--over'); });
    dropzone?.addEventListener('dragleave', () => dropzone.classList.remove('dropzone--over'));
    dropzone?.addEventListener('drop', e => {
      e.preventDefault();
      dropzone.classList.remove('dropzone--over');
      const f = e.dataTransfer.files[0];
      if (f) { _file = f; _ladeVorschau(f); }
    });
    fileInput?.addEventListener('change', e => {
      const f = e.target.files[0];
      if (f) { _file = f; _ladeVorschau(f); }
    });
    document.getElementById('btn-import-starten')?.addEventListener('click', async () => {
      if (!_file) return;
      const fd = new FormData();
      fd.append('datei', _file);
      try {
        const result = await api.import.importieren(fd);
        document.getElementById('import-vorschau').style.display = 'none';
        document.getElementById('import-ergebnis').style.display = 'block';
        document.getElementById('import-ergebnis').innerHTML = `
          <p>\u2705 <strong>${result.importiert}</strong> Bewerbungen importiert</p>
          <p>\u23E9 <strong>${result.uebersprungen}</strong> bereits vorhanden (Duplikate)</p>
          ${result.fehler?.length ? `<p>\u26A0\uFE0F ${result.fehler.length} Fehler: <pre>${JSON.stringify(result.fehler, null, 2)}</pre></p>` : ''}`;
        ui.success(`Import abgeschlossen: ${result.importiert} importiert.`);
      } catch (err) { ui.error(err.message); }
    });
  }

  async function _ladeVorschau(file) {
    const fd = new FormData();
    fd.append('datei', file);
    try {
      const { vorschau, mapping, gesamt } = await api.import.vorschau(fd);
      document.getElementById('import-vorschau').style.display = 'block';
      const cols = Object.keys(vorschau[0] || {});
      document.getElementById('vorschau-tabelle').innerHTML = `
        <p>${gesamt} Zeilen gesamt</p>
        <table class="table">
          <thead><tr>${cols.map(c => `<th>${ui.escHtml(c)}</th>`).join('')}</tr></thead>
          <tbody>${vorschau.map(row =>
            `<tr>${cols.map(c => `<td>${ui.escHtml(String(row[c] ?? ''))}</td>`).join('')}</tr>`
          ).join('')}</tbody>
        </table>`;
      document.getElementById('mapping-info').innerHTML =
        '<p><strong>Erkannte Spalten:</strong> ' +
        Object.entries(mapping).map(([k, v]) => `<code>${k}</code> \u2192 <em>${v}</em>`).join(', ') + '</p>';
    } catch (err) { ui.error(err.message); }
  }

  return { init };
})();

window.importModule = importModule;
