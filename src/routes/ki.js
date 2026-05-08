const express = require('express');
const router = express.Router();
const https = require('https');
const http = require('http');

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://192.168.178.122:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'mistral';

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

router.post('/anschreiben', async (req, res) => {
  const { titel, firma, ort, beschreibung, tags, profil } = req.body;
  if (!titel || !firma) return res.status(400).json({ error: 'titel und firma erforderlich' });

  const prompt = `Du bist ein professioneller Bewerbungsberater. Schreibe ein präzises deutsches Bewerbungsanschreiben für folgende Stelle.

STELLE:
Titel: ${titel}
Firma: ${firma}
Ort: ${ort || 'nicht angegeben'}
${tags?.length ? 'Geforderte Skills: ' + tags.join(', ') : ''}
${beschreibung ? 'Stellenbeschreibung (Auszug): ' + beschreibung.slice(0, 400) : ''}

BEWERBER:
Name: ${profil?.name || 'Max Mustermann'}
Kurzprofil: ${profil?.kurzprofil || 'IT-Fachkraft mit Linux-Schwerpunkt'}
Stärken und Skills: ${profil?.staerken || 'Linux, Docker, Support'}

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

router.post('/feedback', async (req, res) => {
  const { anschreiben, stelle } = req.body;
  if (!anschreiben) return res.status(400).json({ error: 'anschreiben fehlt' });

  const prompt = `Analysiere dieses Bewerbungsanschreiben und gib kurzes, konstruktives Feedback auf Deutsch.

STELLE: ${stelle || 'nicht angegeben'}
ANSCHREIBEN:
${anschreiben.slice(0, 1000)}

Bewerte auf einer Skala 1-10 und nenne 2-3 konkrete Verbesserungsvorschläge. Halte die Antwort unter 150 Wörtern.`;

  try {
    const result = await ollamaRequest(prompt);
    res.json({ feedback: result.response || '', model: result.model || OLLAMA_MODEL });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
