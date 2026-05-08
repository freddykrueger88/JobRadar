const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const https = require('https');
const http = require('http');

// Kein hardcodierter privater IP-Fallback – localhost ist der sichere Default
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'mistral';

// Maximale Laengen fuer Prompt-Felder (Schutz gegen Prompt Injection & Ueberlasten)
const MAX_TITEL = 200;
const MAX_FIRMA = 200;
const MAX_BESCHREIBUNG = 500;
const MAX_PROFIL_FELD = 300;
const MAX_ANSCHREIBEN = 3000;

/** Bereinigt einen String fuer sicheren Prompt-Einsatz */
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
    req.setTimeout(60000, () => { req.destroy(); reject(new Error('Ollama Timeout nach 60s')); });
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

// Validierungsregeln fuer /anschreiben
const anschreibenValidator = [
  body('titel').trim().notEmpty().isLength({ max: MAX_TITEL }),
  body('firma').trim().notEmpty().isLength({ max: MAX_FIRMA }),
  body('ort').optional().trim().isLength({ max: 200 }),
  body('beschreibung').optional().trim().isLength({ max: MAX_BESCHREIBUNG }),
  body('tags').optional().isArray({ max: 20 }),
  body('tags.*').optional().trim().isLength({ max: 100 }),
  body('profil').optional().isObject(),
];

router.post('/anschreiben', anschreibenValidator, validate, async (req, res) => {
  const { titel, firma, ort, beschreibung, tags, profil } = req.body;

  // Alle Felder sanitizen bevor sie in den Prompt kommen
  const safeTitel = sanitizePromptField(titel, MAX_TITEL);
  const safeFirma = sanitizePromptField(firma, MAX_FIRMA);
  const safeOrt   = sanitizePromptField(ort, 200);
  const safeBeschreibung = sanitizePromptField(beschreibung, MAX_BESCHREIBUNG);
  const safeTags = Array.isArray(tags) ? tags.map(t => sanitizePromptField(t, 100)).join(', ') : '';
  const safeName   = sanitizePromptField(profil?.name, MAX_PROFIL_FELD);
  const safeKurz   = sanitizePromptField(profil?.kurzprofil, MAX_PROFIL_FELD);
  const safeStaerk = sanitizePromptField(profil?.staerken, MAX_PROFIL_FELD);

  const prompt = `Du bist ein professioneller Bewerbungsberater. Schreibe ein präzises deutsches Bewerbungsanschreiben für folgende Stelle.

STELLE:
Titel: ${safeTitel}
Firma: ${safeFirma}
Ort: ${safeOrt || 'nicht angegeben'}
${safeTags ? 'Geforderte Skills: ' + safeTags : ''}
${safeBeschreibung ? 'Stellenbeschreibung (Auszug): ' + safeBeschreibung : ''}

BEWERBER:
Name: ${safeName || 'Max Mustermann'}
Kurzprofil: ${safeKurz || 'IT-Fachkraft mit Linux-Schwerpunkt'}
Stärken und Skills: ${safeStaerk || 'Linux, Docker, Support'}

ANFORDERUNGEN:
- Formelle deutsche Briefform
- Kein Datum, keine Adresse
- Beginne direkt mit "Sehr geehrte Damen und Herren,"
- Drei Absätze: Einleitung, fachliche Stärken, Abschluss mit Gesprächswunsch
- Ende mit "Mit freundlichen Grüßen" ohne Unterschrift
- Maximal 250 Wörter

Schreibe NUR den Anschreiben-Text.`;

  try {
    const result = await ollamaRequest(prompt);
    res.json({ text: result.response || '', model: result.model || OLLAMA_MODEL });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Validierungsregeln fuer /feedback
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

Bewerte auf einer Skala 1-10 und nenne 2-3 konkrete Verbesserungsvorschläge. Halte die Antwort unter 150 Wörtern.`;

  try {
    const result = await ollamaRequest(prompt);
    res.json({ feedback: result.response || '', model: result.model || OLLAMA_MODEL });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
