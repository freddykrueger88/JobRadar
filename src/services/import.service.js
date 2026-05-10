'use strict';

const XLSX = require('xlsx');
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

function parseFile(buffer, mimetype) {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

function mapSpalten(rows) {
  if (!rows.length) return [];
  const headers = Object.keys(rows[0]).map(h => h.trim().toLowerCase());

  // Für jedes interne Feld: welche Spalte aus der Datei matcht?
  const mapping = {};
  for (const [feld, kandidaten] of Object.entries(SPALTEN_MAP)) {
    const match = headers.find(h => kandidaten.includes(h));
    if (match) mapping[feld] = Object.keys(rows[0]).find(k => k.trim().toLowerCase() === match);
  }

  return { rows, mapping };
}

async function importieren(buffer, mimetype) {
  const rows = parseFile(buffer, mimetype);
  const { mapping } = mapSpalten(rows);

  let importiert = 0, uebersprungen = 0;
  const fehler = [];

  const bereitsVorhanden = new Set(
    db.all('SELECT firma, titel FROM bewerbungen').map(r => `${r.firma}|${r.titel}`.toLowerCase())
  );

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const get = feld => (mapping[feld] ? String(row[mapping[feld]] || '').trim() : '');

    const titel = get('titel');
    const firma = get('firma');

    if (!titel || !firma) {
      fehler.push({ zeile: i + 2, grund: 'Titel oder Firma fehlt' });
      continue;
    }

    const key = `${firma}|${titel}`.toLowerCase();
    if (bereitsVorhanden.has(key)) {
      uebersprungen++;
      continue;
    }

    const rawStatus = get('status').toLowerCase();
    const status = STATUS_MAP[rawStatus] || 'beworben';

    try {
      createBewerbung({ titel, firma,
        ort:         get('ort')         || null,
        quelle:      get('quelle')      || 'import',
        url:         get('url')         || null,
        notizen:     get('notizen')     || null,
        beworben_am: get('beworben_am') || null,
        status
      });
      bereitsVorhanden.add(key);
      importiert++;
    } catch (err) {
      fehler.push({ zeile: i + 2, grund: err.message });
    }
  }

  return { importiert, uebersprungen, fehler };
}

module.exports = { importieren, mapSpalten, parseFile };
