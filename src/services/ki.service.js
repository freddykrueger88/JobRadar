'use strict';

const { get: getEinstellungen } = require('./einstellungen.service');
const db = require('../db/adapter');

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const TIMEOUT_MS = 60_000;

async function getVerfuegbareModelle() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: controller.signal });
    if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
    const data = await res.json();
    return (data.models || []).map(m => m.name);
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Ollama nicht erreichbar (Timeout).');
    throw new Error(`Ollama nicht erreichbar: ${err.message}`);
  } finally {
    clearTimeout(timer);
  }
}

async function pruefeStatus() {
  try {
    const modelle = await getVerfuegbareModelle();
    return { ok: true, modelle };
  } catch (err) {
    return { ok: false, fehler: err.message };
  }
}

async function generiereAnschreiben({ titel, firma, stellenbeschreibung, bewerbungId }) {
  const cfg    = getEinstellungen();
  const profil = db.get('SELECT * FROM profil WHERE id = 1');
  const erf    = db.get('SELECT * FROM erfahrungen WHERE id = 1');

  const skills     = JSON.parse(erf?.skills     || '[]').map(s => s.name).join(', ');
  const stationen  = JSON.parse(erf?.stationen  || '[]').map(s => `${s.rolle} bei ${s.firma}`).join('; ');
  const zertifikat = JSON.parse(erf?.zertifikate || '[]').map(z => z.titel).join(', ');

  const stilMap = {
    formell: 'formell und professionell',
    modern:  'modern und direkt, ohne klassische Floskeln',
    kurz:    'sehr kurz und prägnant, maximal 150 Wörter'
  };

  const laengeMap = {
    kurz:   'Maximal 150 Wörter.',
    mittel: 'Etwa 200–300 Wörter.',
    lang:   'Etwa 350–450 Wörter.'
  };

  const prompt = [
    `Schreibe ein ${cfg.ki_sprache === 'englisch' ? 'englisches' : 'deutsches'} Bewerbungsanschreiben.`,
    `Stil: ${stilMap[cfg.ki_stil] || 'formell'}.`,
    `Länge: ${laengeMap[cfg.ki_laenge] || 'Etwa 200–300 Wörter.'}`,
    ``,
    `Stelle: ${titel} bei ${firma}.`,
    stellenbeschreibung ? `Stellenbeschreibung:\n${stellenbeschreibung.slice(0, 1500)}` : '',
    ``,
    `Über mich:`,
    profil?.kurzprofil  ? `- Kurzprofil: ${profil.kurzprofil}` : '',
    profil?.staerken    ? `- Stärken: ${profil.staerken}` : '',
    skills              ? `- Skills: ${skills}` : '',
    stationen           ? `- Berufserfahrung: ${stationen}` : '',
    zertifikat          ? `- Zertifikate: ${zertifikat}` : '',
    cfg.ki_hinweise     ? `\nZusätzliche Hinweise: ${cfg.ki_hinweise}` : '',
    ``,
    `Gib nur den Text des Anschreibens aus, ohne Betreff, ohne Datum, ohne erklärende Kommentare.`
  ].filter(Boolean).join('\n');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: cfg.ki_modell, prompt, stream: false }),
      signal: controller.signal
    });
    if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
    const data = await res.json();
    const text = data.response?.trim();
    if (!text) throw new Error('Leere Antwort von Ollama.');

    // Verlauf speichern
    db.run(
      'INSERT INTO anschreiben_verlauf (titel, firma, text, model, stil) VALUES (?,?,?,?,?)',
      [titel, firma, text, cfg.ki_modell, cfg.ki_stil]
    );

    // Optional: direkt in Bewerbung speichern
    if (bewerbungId) {
      db.run(
        "UPDATE bewerbungen SET anschreiben = ?, aktualisiert_am = datetime('now') WHERE id = ?",
        [text, bewerbungId]
      );
    }

    return { text, modell: cfg.ki_modell };
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Ollama Timeout – Anfrage hat zu lange gedauert.');
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function getVerlauf(limit = 20) {
  return db.all('SELECT * FROM anschreiben_verlauf ORDER BY erstellt_am DESC LIMIT ?', [limit]);
}

module.exports = { getVerfuegbareModelle, pruefeStatus, generiereAnschreiben, getVerlauf };
