/**
 * Excel/CSV-Import Frontend
 * Wird in index.html als Modul geladen.
 */

let importVorschauDaten = null;

async function zeigeImportTab() {
  const container = document.getElementById('import-container');
  if (!container) return;
  container.innerHTML = renderImportUI();
  bindImportEvents();
}

function renderImportUI() {
  return `
    <div class="import-wrapper">
      <h2>📂 Bewerbungen importieren</h2>
      <p class="import-hint">Importiere deine bestehende Excel- oder CSV-Tabelle direkt in JobRadar.<br>
        Unterstützte Formate: <strong>.xlsx, .xls, .csv</strong> — max. 5 MB</p>

      <div class="import-dropzone" id="import-dropzone">
        <div class="dropzone-inner">
          <span class="dropzone-icon">📄</span>
          <p>Datei hier ablegen oder <label for="import-file-input" class="import-file-label">auswählen</label></p>
          <input type="file" id="import-file-input" accept=".xlsx,.xls,.csv" hidden />
          <p class="dropzone-hint">Excel (.xlsx, .xls) oder CSV</p>
        </div>
      </div>

      <div id="import-vorschau" class="import-vorschau hidden"></div>
      <div id="import-ergebnis" class="import-ergebnis hidden"></div>
    </div>
  `;
}

function bindImportEvents() {
  const dropzone = document.getElementById('import-dropzone');
  const fileInput = document.getElementById('import-file-input');

  // Datei-Picker
  dropzone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) ladeVorschau(fileInput.files[0]);
  });

  // Drag & Drop
  dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('dragover'); });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
  dropzone.addEventListener('drop', e => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) ladeVorschau(file);
  });
}

async function ladeVorschau(file) {
  const vorschauDiv = document.getElementById('import-vorschau');
  const ergebnisDiv = document.getElementById('import-ergebnis');
  ergebnisDiv.classList.add('hidden');
  vorschauDiv.innerHTML = '<p class="import-loading">⏳ Datei wird analysiert…</p>';
  vorschauDiv.classList.remove('hidden');

  const fd = new FormData();
  fd.append('datei', file);

  try {
    const res  = await fetch('/api/import/preview', { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Fehler beim Laden der Vorschau');
    importVorschauDaten = { file, data };
    renderVorschau(data);
  } catch (e) {
    vorschauDiv.innerHTML = `<div class="import-error">❌ ${e.message}</div>`;
  }
}

function renderVorschau(data) {
  const vorschauDiv = document.getElementById('import-vorschau');
  const erkannt = Object.entries(data.mapping)
    .map(([field, col]) => `<span class="mapping-chip"><b>${col}</b> → ${field}</span>`)
    .join('');

  const fehlend = ['titel','firma'].filter(f => !data.mapping[f]);
  const warnung = fehlend.length
    ? `<div class="import-warning">⚠️ Pflichtfelder nicht erkannt: <b>${fehlend.join(', ')}</b>. Bitte Spalten manuell zuordnen.</div>`
    : '';

  // Vorschau-Tabelle (erste 10 Zeilen)
  const cols = data.headers.slice(0, 8);
  const thRow = cols.map(c => `<th>${escHtml(c)}</th>`).join('');
  const tbRows = data.preview.map(row =>
    `<tr>${cols.map(c => `<td>${escHtml(String(row[c] ?? '').slice(0, 60))}</td>`).join('')}</tr>`
  ).join('');

  vorschauDiv.innerHTML = `
    <div class="vorschau-box">
      <div class="vorschau-meta">
        <span>📊 <b>${data.total}</b> Zeilen gefunden</span>
        <span>✅ Erkannte Spalten: ${erkannt || '–'}</span>
      </div>
      ${warnung}
      <div class="vorschau-tabelle-wrapper">
        <table class="vorschau-tabelle">
          <thead><tr>${thRow}</tr></thead>
          <tbody>${tbRows}</tbody>
        </table>
      </div>
      <div class="vorschau-actions">
        <button class="btn-import-start" onclick="starteImport()">📥 Import starten (${data.total} Zeilen)</button>
        <button class="btn-import-abbrechen" onclick="abbrechenImport()">Abbrechen</button>
      </div>
    </div>
  `;
}

async function starteImport() {
  if (!importVorschauDaten) return;
  const { file, data } = importVorschauDaten;
  const ergebnisDiv = document.getElementById('import-ergebnis');
  const vorschauDiv = document.getElementById('import-vorschau');

  vorschauDiv.innerHTML = '<p class="import-loading">⏳ Import läuft…</p>';
  ergebnisDiv.classList.add('hidden');

  const fd = new FormData();
  fd.append('datei', file);
  fd.append('mapping', JSON.stringify(data.mapping));

  try {
    const res    = await fetch('/api/import/excel', { method: 'POST', body: fd });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Import fehlgeschlagen');

    vorschauDiv.classList.add('hidden');
    ergebnisDiv.classList.remove('hidden');
    ergebnisDiv.innerHTML = renderErgebnis(result);
    importVorschauDaten = null;
  } catch (e) {
    vorschauDiv.innerHTML = `<div class="import-error">❌ ${e.message}</div>`;
  }
}

function renderErgebnis(r) {
  const fehlerHTML = r.fehler.length
    ? `<details class="import-fehler-details">
        <summary>⚠️ ${r.fehler.length} Zeile(n) übersprungen</summary>
        <ul>${r.fehler.map(f => `<li>Zeile ${f.zeile}: ${escHtml(f.grund)}</li>`).join('')}</ul>
       </details>`
    : '';
  return `
    <div class="ergebnis-box">
      <div class="ergebnis-icon">✅</div>
      <h3>Import abgeschlossen</h3>
      <div class="ergebnis-zahlen">
        <div class="ergebnis-zahl importiert"><span>${r.importiert}</span><label>Importiert</label></div>
        <div class="ergebnis-zahl uebersprungen"><span>${r.uebersprungen}</span><label>Duplikate übersprungen</label></div>
        <div class="ergebnis-zahl fehler"><span>${r.fehler.length}</span><label>Fehler</label></div>
      </div>
      ${fehlerHTML}
      <button class="btn-primary" onclick="showTab('bewerbungen'); ladeAlles()">
        📋 Bewerbungen ansehen
      </button>
    </div>
  `;
}

function abbrechenImport() {
  importVorschauDaten = null;
  document.getElementById('import-vorschau').classList.add('hidden');
  document.getElementById('import-ergebnis').classList.add('hidden');
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
