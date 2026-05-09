/**
 * POST /api/import/excel
 * Importiert Bewerbungen aus einer .xlsx oder .csv Datei.
 */
const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const XLSX     = require('xlsx');
const path     = require('path');
const fs       = require('fs');
const db       = require('../db/database');

const UPLOAD_DIR = path.resolve(process.env.IMPORT_TMP || path.join(__dirname, '../../data/import_tmp'));
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const VALID_STATUS = ['beworben', 'interview', 'angenommen', 'abgelehnt'];

// Status-Mapping: gängige Bezeichnungen → interne Status
const STATUS_MAP = {
  'applied':      'beworben',
  'beworben':     'beworben',
  'neu':          'beworben',
  'new':          'beworben',
  'offen':        'beworben',
  'open':         'beworben',
  'interview':    'interview',
  'gespräch':     'interview',
  'vorstellungsgespräch': 'interview',
  'angenommen':   'angenommen',
  'accepted':     'angenommen',
  'hired':        'angenommen',
  'zusage':       'angenommen',
  'abgelehnt':    'abgelehnt',
  'rejected':     'abgelehnt',
  'absage':       'abgelehnt',
  'declined':     'abgelehnt',
};

// Spalten-Mapping: mögliche Excel-Spaltennamen → internes Feld
const COLUMN_MAP = {
  titel:        ['titel', 'title', 'position', 'stelle', 'job title', 'jobtitel', 'bezeichnung'],
  firma:        ['firma', 'unternehmen', 'company', 'arbeitgeber', 'employer'],
  ort:          ['ort', 'standort', 'location', 'city', 'stadt'],
  status:       ['status', 'stand', 'state', 'bewerbungsstatus'],
  beworben_am:  ['datum', 'beworben am', 'beworben_am', 'applied', 'date', 'bewerbungsdatum'],
  url:          ['url', 'link', 'stellenlink', 'job url', 'anzeige'],
  notizen:      ['notizen', 'notiz', 'anmerkungen', 'notes', 'kommentar', 'kommentare'],
  quelle:       ['quelle', 'portal', 'source', 'plattform', 'jobbörse'],
  followup_datum: ['followup', 'follow-up', 'follow up', 'wiedervorlage', 'followup_datum'],
};

const upload = multer({
  dest: UPLOAD_DIR,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const ok  = ['.xlsx', '.xls', '.csv'].includes(ext);
    cb(ok ? null : new Error('Nur .xlsx, .xls oder .csv erlaubt'), ok);
  }
});

/** Normalisiert einen Spaltennamen für den Vergleich */
function normalizeKey(k) {
  return String(k).toLowerCase().trim().replace(/\s+/g, ' ');
}

/** Mappt Spaltenheader aus der Datei auf interne Felder */
function buildMapping(headers) {
  const map = {};
  for (const header of headers) {
    const norm = normalizeKey(header);
    for (const [field, aliases] of Object.entries(COLUMN_MAP)) {
      if (aliases.includes(norm) && !map[field]) {
        map[field] = header;
      }
    }
  }
  return map;
}

/** Normalisiert einen Status-String auf interne Werte */
function mapStatus(raw) {
  if (!raw) return 'beworben';
  const norm = String(raw).toLowerCase().trim();
  return STATUS_MAP[norm] || (VALID_STATUS.includes(norm) ? norm : 'beworben');
}

/** Wandelt Excel-Datumszahl oder String in ISO-Datum um */
function parseDate(val) {
  if (!val) return '';
  if (typeof val === 'number') {
    // Excel-Seriennummer → JS-Datum
    const date = XLSX.SSF.parse_date_code(val);
    if (date) return `${date.y}-${String(date.m).padStart(2,'0')}-${String(date.d).padStart(2,'0')}`;
  }
  const s = String(val).trim();
  // ISO oder DD.MM.YYYY
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[0];
  const de = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (de) return `${de[3]}-${de[2].padStart(2,'0')}-${de[1].padStart(2,'0')}`;
  return '';
}

// ── POST /api/import/preview ─────────────────────────────────────────────────
// Gibt die ersten 10 Zeilen + erkanntes Spalten-Mapping zurück (ohne zu importieren)
router.post('/preview', upload.single('datei'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Keine Datei.' });
  try {
    const wb      = XLSX.readFile(req.file.path);
    const sheet   = wb.Sheets[wb.SheetNames[0]];
    const rows    = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
    const mapping = buildMapping(headers);
    const preview = rows.slice(0, 10);
    fs.unlinkSync(req.file.path);
    res.json({
      headers,
      mapping,
      preview,
      total: rows.length,
    });
  } catch (e) {
    try { fs.unlinkSync(req.file.path); } catch {}
    res.status(422).json({ error: 'Datei konnte nicht gelesen werden: ' + e.message });
  }
});

// ── POST /api/import/excel ───────────────────────────────────────────────────
// Führt den tatsächlichen Import durch.
// Body (optional): { mapping: { titel: "Spalte A", firma: "Spalte B", ... } }
router.post('/excel', upload.single('datei'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Keine Datei.' });

  // Benutzerdefiniertes Mapping aus dem Request-Body (optional)
  let customMapping = {};
  try { customMapping = req.body.mapping ? JSON.parse(req.body.mapping) : {}; } catch {}

  try {
    const wb    = XLSX.readFile(req.file.path);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows  = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    fs.unlinkSync(req.file.path);

    if (!rows.length) return res.json({ importiert: 0, uebersprungen: 0, fehler: [] });

    const headers = Object.keys(rows[0]);
    const autoMap = buildMapping(headers);
    // Custom-Mapping überschreibt Auto-Mapping
    const mapping = { ...autoMap, ...customMapping };

    let importiert  = 0;
    let uebersprungen = 0;
    const fehler    = [];

    const insertStmt = db.prepare(
      `INSERT INTO bewerbungen (titel,firma,ort,quelle,url,status,beworben_am,followup_datum,notizen)
       VALUES (?,?,?,?,?,?,?,?,?)`
    );
    const dupCheck = db.prepare(
      'SELECT id FROM bewerbungen WHERE LOWER(TRIM(titel))=LOWER(TRIM(?)) AND LOWER(TRIM(firma))=LOWER(TRIM(?)) LIMIT 1'
    );

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const get = (field) => {
        const col = mapping[field];
        return col ? String(row[col] ?? '').trim() : '';
      };

      const titel = get('titel').slice(0, 300);
      const firma = get('firma').slice(0, 300);

      if (!titel || !firma) {
        fehler.push({ zeile: i + 2, grund: 'Titel oder Firma fehlt' });
        continue;
      }

      // Duplikatprüfung
      if (dupCheck.get(titel, firma)) {
        uebersprungen++;
        continue;
      }

      const status       = mapStatus(get('status'));
      const beworben_am  = parseDate(row[mapping['beworben_am']] ?? '');
      const followup_datum = parseDate(row[mapping['followup_datum']] ?? '');

      try {
        insertStmt.run(
          titel,
          firma,
          get('ort').slice(0, 200),
          get('quelle').slice(0, 100),
          get('url').slice(0, 1000),
          status,
          beworben_am,
          followup_datum,
          get('notizen').slice(0, 5000)
        );
        importiert++;
      } catch (e) {
        fehler.push({ zeile: i + 2, grund: e.message });
      }
    }

    res.json({ importiert, uebersprungen, fehler });
  } catch (e) {
    try { fs.unlinkSync(req.file.path); } catch {}
    res.status(422).json({ error: 'Import fehlgeschlagen: ' + e.message });
  }
});

module.exports = router;
