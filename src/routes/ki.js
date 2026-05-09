const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { validate } = require('../middleware/validate');
const https = require('https');
const http = require('http');
const db = require('../db/database');

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'mistral';
const OLLAMA_TIMEOUT_MS = 180000;

const MAX_TITEL = 200;
const MAX_FIRMA = 200;
const MAX_BESCHREIBUNG = 500;
const MAX_PROFIL_FELD = 300;
const MAX_ANSCHREIBEN = 3000;
const MAX_EFAHRUNGEN = 4000;

function sanitizePromptField(val, maxLen) {
  return String(val || '').replace(/[\n\r`]/g, ' ').trim().slice(0, maxLen);
}

function ollamaRequest(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: OLLAMA_MODEL,
      prompt,
      stream: false,
      options: { temperature: 0.7, num_predict: 800 }
    });
    const url = new URL(OLLAMA_URL + '/api/generate');
    const lib = url.protocol === 'https:' ? https : http;
    const req = lib.request({
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { reject(new Error('Parse-Fehler: ' + data.slice(0,200))); }
      });
    });
    req.on('error', reject);
    req.setTimeout(OLLAMA_TIMEOUT_MS, () => {
      req.destroy();
      reject(new Error('Ollama Timeout nach ' + (OLLAMA_TIMEOUT_MS/1000) + 's – beim Kaltstart bitte nochmal versuchen'));
    });
    req.write(body);
    req.end();
  });
}

router.get('/models', async (req, res) => {
  try {
    const url = new URL(OLLAMA_URL + '/api/tags');
    const lib = url.protocol === 'https:' ? https : http;
    const data = await new Promise((resolve, reject) => {
      const r = lib.get(url.toString(), (res) => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { reject(e); } });
      });
      r.on('error', reject);
      r.setTimeout(8000, () => { r.destroy(); reject(new Error('Timeout')); });
    });
    res.json({ models: (data.models||[]).map(m => m.name), active: OLLAMA_MODEL });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

const anschreibenValidator = [
  body('titel').trim().notEmpty().isLength({ max: MAX_TITEL }),
  body('firma').trim().notEmpty().isLength({ max: MAX_FIRMA }),
  body('ort').optional().trim().isLength({ max: 200 }),
  body('beschreibung').optional().trim().isLength({ max: MAX_BESCHREIBUNG }),
  body('tags').optional().isArray({ max: 20 }),
  body('tags.*').optional().trim().isLength({ max: 100 }),
  body('profil').optional().isObject(),
  body('stilId').optional().isInt({ min: 1 }),
  body('erfahrungenKontext').optional().trim().isLength({ max: MAX_EFAHRUNGEN }),
];

router.post('/anschreiben', anschreibenValidator, validate, async (req, res) => {
  const { titel, firma, ort, beschreibung, tags, profil, stilId, erfahrungenKontext } = req.body;

  const safeTitel        = sanitizePromptField(titel, MAX_TITEL);
  const safeFirma        = sanitizePromptField(firma, MAX_FIRMA);
  const safeOrt          = sanitizePromptField(ort, 200);
  const safeBeschreibung = sanitizePromptField(beschreibung, MAX_BESCHREIBUNG);
  const safeTags         = Array.isArray(tags) ? tags.map(t => sanitizePromptField(t, 100)).join(', ') : '';
  const safeName         = sanitizePromptField(profil?.name, MAX_PROFIL_FELD);
  const safeKurz         = sanitizePromptField(profil?.kurzprofil, MAX_PROFIL_FELD);
  const safeStaerk       = sanitizePromptField(profil?.staerken, MAX_PROFIL_FELD);
  const safeErfahrungen  = sanitizePromptField(erfahrungenKontext, MAX_EFAHRUNGEN);

  // Stil-Vorgabe aus DB laden
  let stilBlock = '';
  let stilName = '';
  if (stilId) {
    const stil = db.prepare('SELECT * FROM vorlagen WHERE id=?').get(stilId);
    if (stil) {
      stilName = stil.name;
      const tonMap = { formell: 'formell und professionell', modern: 'modern und direkt ohne klassische Floskeln', kreativ: 'kreativ und ausdrucksstark', kurz: 'sehr kurz und praegnant' };
      const laengeMap = { kurz: 'maximal 120 Woerter', mittel: 'maximal 220 Woerter', lang: 'maximal 350 Woerter' };
      stilBlock = `\nSTIL-VORGABE:\n- Ton: ${tonMap[stil.ton] || stil.ton}\n- Laenge: ${laengeMap[stil.laenge] || stil.laenge}\n- Sprache: ${stil.sprache || 'deutsch'}${stil.hinweise ? '\n- Besondere Hinweise: ' + stil.hinweise : ''}`;
    }
  }

  const prompt = `Du bist ein professioneller Bewerbungsberater. Schreibe ein ${stilId ? '' : 'formelles '}deutsches Bewerbungsanschreiben fuer folgende Stelle.

STELLE:
Titel: ${safeTitel}
Firma: ${safeFirma}
Ort: ${safeOrt || 'nicht angegeben'}
${safeTags ? 'Geforderte Skills: ' + safeTags : ''}
${safeBeschreibung ? 'Stellenbeschreibung (Auszug): ' + safeBeschreibung : ''}${stilBlock}

BEWERBER:
Name: ${safeName || 'Max Mustermann'}
Kurzprofil: ${safeKurz || 'IT-Fachkraft mit Linux-Schwerpunkt'}
Staerken und Skills: ${safeStaerk || 'Linux, Docker, Support'}
${safeErfahrungen ? '\nERFAHRUNGEN UND QUALIFIKATIONEN:\n' + safeErfahrungen : ''}

ANFORDERUNGEN:
- Kein Datum, keine Adresse
- Beginne direkt mit "Sehr geehrte Damen und Herren,"
- Drei Absaetze: Einleitung, fachliche Staerken, Abschluss mit Gespraechswunsch
- Ende mit "Mit freundlichen Gruessen" ohne Unterschrift

Schreibe NUR den Anschreiben-Text.`;

  try {
    const result = await ollamaRequest(prompt);
    const text = result.response || '';
    const model = result.model || OLLAMA_MODEL;

    // Verlauf speichern
    try {
      db.prepare(`INSERT INTO anschreiben_verlauf (titel, firma, text, model, stil) VALUES (?,?,?,?,?)`)
        .run(safeTitel, safeFirma, text, model, stilName || null);
      // Verlauf auf 50 Einträge begrenzen
      const oldest = db.prepare(`SELECT id FROM anschreiben_verlauf ORDER BY erstellt_am DESC LIMIT -1 OFFSET 50`).all();
      if (oldest.length) db.prepare(`DELETE FROM anschreiben_verlauf WHERE id IN (${oldest.map(()=>'?').join(',')})`).run(...oldest.map(r=>r.id));
    } catch(e) { console.warn('Verlauf konnte nicht gespeichert werden:', e.message); }

    res.json({ text, model });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

const feedbackValidator = [
  body('anschreiben').trim().notEmpty().isLength({ max: MAX_ANSCHREIBEN }),
  body('stelle').optional().trim().isLength({ max: 300 }),
];

router.post('/feedback', feedbackValidator, validate, async (req, res) => {
  const { anschreiben, stelle } = req.body;
  const safeAnschreiben = sanitizePromptField(anschreiben, MAX_ANSCHREIBEN);
  const safeStelle      = sanitizePromptField(stelle, 300);

  const prompt = `Analysiere dieses Bewerbungsanschreiben und gib kurzes, konstruktives Feedback auf Deutsch.

STELLE: ${safeStelle || 'nicht angegeben'}
ANSCHREIBEN:
${safeAnschreiben}

Bewerte auf einer Skala 1-10 und nenne 2-3 konkrete Verbesserungsvorschlaege. Halte die Antwort unter 150 Woertern.`;

  try {
    const result = await ollamaRequest(prompt);
    res.json({ feedback: result.response || '', model: result.model || OLLAMA_MODEL });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Verlauf-Routen ──
router.get('/verlauf', (req, res, next) => {
  try {
    const rows = db.prepare('SELECT id, titel, firma, model, stil, erstellt_am, SUBSTR(text,1,200) as text FROM anschreiben_verlauf ORDER BY erstellt_am DESC LIMIT 50').all();
    res.json(rows);
  } catch(e) { next(e); }
});

router.get('/verlauf/:id', param('id').isInt(), validate, (req, res, next) => {
  try {
    const row = db.prepare('SELECT * FROM anschreiben_verlauf WHERE id=?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Nicht gefunden' });
    res.json(row);
  } catch(e) { next(e); }
});

router.delete('/verlauf/:id', param('id').isInt(), validate, (req, res, next) => {
  try {
    db.prepare('DELETE FROM anschreiben_verlauf WHERE id=?').run(req.params.id);
    res.json({ ok: true });
  } catch(e) { next(e); }
});

module.exports = router;
