'use strict';

const ExcelJS = require('exceljs');
const { create: createBewerbung } = require('./bewerbungen.service');
const db = require('../db/adapter');

// Spalten-Mapping: mögliche Excel-Spaltennamen → internes Feld
const SPALTEN_MAP = {
  titel:       ['titel','position','stelle','job title','jobtitel'],
  firma:       ['firma','unternehmen','company','arbeitgeber'],
  ort:         ['ort','standort','location','city','stadt'],
  status:      ['status','stand','state'],
  beworben_am: ['datum','beworben am','applied','bewerbungsdatum','date'],
  url:         ['url','link','stellenlink','job url'],
  notizen:     ['notizen','anmerkungen','notes','kommentar'],
  quelle:      ['quelle','portal','source','plattform']
};

// Status-Mapping: gängige Begriffe → interne Status-Werte
const STATUS_MAP = {
  'beworben':    'beworben', 'applied':    'beworben', 'gesendet': 'beworben',
  'interview':   'interview','vorstellungsgespräch': 'interview',
  'angebot':     'angebot',  'offer': 'angebot', 'zusage': 'angebot',
  'abgelehnt':   'abgelehnt','rejected': 'abgelehnt', 'absage': 'abgelehnt'
};

/**
 * Liest eine .xlsx-Datei aus einem Buffer und gibt Zeilen als Array von Objekten zurück.
 * CSV wird ebenfalls unterstützt (plaintext-Parsing).
 */
async function parseFile(buffer, mimetype) {
  // CSV-Fallback: plaintext parsen
  if (mimetype === 'text/csv' || mimetype === 'application/csv') {
    return _parseCsv(buffer.toString('utf8'));
  }

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const sheet = wb.worksheets[0];
  if (!sheet) return [];

  const rows = [];
  let headers = [];

  sheet.eachRow((row, rowNum) => {
    const values = row.values.slice(1); // ExcelJS ist 1-basiert, Index 0 ist leer
    if (rowNum === 1) {
      headers = values.map(v => String(v ?? '').trim());
      return;
    }
    const obj = {};
    headers.forEach((h, i) => { obj[h] = values[i] ?? ''; });
    rows.push(obj);
  });

  return rows;
}

function _parseCsv(text) {
  const lines = text.replace(/\r/g, '').split('\n').filter(Boolean);
  if (lines.length < 2) return [];
  // Einfaches CSV-Parsing (komma- oder semikolon-getrennt)
  const sep = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(sep).map(h => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map(line => {
    const vals = line.split(sep).map(v => v.trim().replace(/^"|"$/g, ''));
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] ?? ''; });
    return obj;
  });
}

function mapSpalten(rows) {
  if (!rows.length) return { rows, mapping: {} };
  const headers = Object.keys(rows[0]).map(h => h.trim().toLowerCase());

  const mapping = {};
  for (const [feld, kandidaten] of Object.entries(SPALTEN_MAP)) {
    const match = headers.find(h => kandidaten.includes(h));
    if (match) mapping[feld] = Object.keys(rows[0]).find(k => k.trim().toLowerCase() === match);
  }

  return { rows, mapping };
}

async function importieren(buffer, mimetype) {
  const rows = await parseFile(buffer, mimetype);
  const { mapping } = mapSpalten(rows);

  let importiert = 0, uebersprungen = 0;
  const fehler = [];

  const bereitsVorhanden = new Set(
    db.all('SELECT firma, titel FROM bewerbungen').map(r => `${r.firma}|${r.titel}`.toLowerCase())
  );

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const get = feld => (mapping[feld] ? String(row[mapping[feld]] ?? '').trim() : '');

    const titel = get('titel');
    const firma = get('firma');

    if (!titel || !firma) {
      fehler.push({ zeile: i + 2, grund: 'Titel oder Firma fehlt' });
      continue;
    }

    const key = `${firma}|${titel}`.toLowerCase();
    if (bereitsVorhanden.has(key)) { uebersprungen++; continue; }

    const rawStatus = get('status').toLowerCase();
    const status = STATUS_MAP[rawStatus] || 'beworben';

    try {
      createBewerbung({
        titel, firma,
        ort:         get('ort')         || null,
        quelle:      get('quelle')      || 'import',
        url:         get('url')         || null,
        notizen:     get('notizen')     || null,
        beworben_am: get('beworben_am') || null,
        status,
      });
      bereitsVorhanden.add(key);
      importiert++;
    } catch (err) {
      fehler.push({ zeile: i + 2, grund: err.message });
    }
  }

  return { importiert, uebersprungen, fehler };
}

// Vorschau: erste 10 Zeilen + erkanntes Mapping (kein DB-Zugriff)
async function vorschau(buffer, mimetype) {
  const rows = await parseFile(buffer, mimetype);
  const { mapping } = mapSpalten(rows);
  return {
    vorschau: rows.slice(0, 10),
    mapping,
    gesamt: rows.length,
  };
}

module.exports = { importieren, vorschau, mapSpalten, parseFile };
