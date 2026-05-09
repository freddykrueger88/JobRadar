const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/bewerbungen.sqlite');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS bewerbungen (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titel TEXT NOT NULL,
    firma TEXT NOT NULL,
    ort TEXT,
    quelle TEXT,
    url TEXT,
    status TEXT DEFAULT 'beworben',
    beworben_am TEXT,
    followup_datum TEXT,
    bewertung INTEGER,
    notizen TEXT,
    anschreiben TEXT,
    archiviert INTEGER DEFAULT 0,
    erstellt_am TEXT DEFAULT (datetime('now')),
    aktualisiert_am TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS kommentare (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bewerbung_id INTEGER NOT NULL REFERENCES bewerbungen(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    erstellt_am TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS vorlagen (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    ton TEXT DEFAULT 'formell',
    sprache TEXT DEFAULT 'deutsch',
    laenge TEXT DEFAULT 'mittel',
    hinweise TEXT,
    einleitung TEXT,
    schluss TEXT,
    erstellt_am TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS profil (
    id INTEGER PRIMARY KEY,
    name TEXT, email TEXT, rollen TEXT, ort TEXT,
    keywords TEXT, blacklist TEXT, kurzprofil TEXT, staerken TEXT
  );

  CREATE TABLE IF NOT EXISTS erfahrungen (
    id INTEGER PRIMARY KEY,
    skills TEXT DEFAULT '[]',
    stationen TEXT DEFAULT '[]',
    zertifikate TEXT DEFAULT '[]',
    aktualisiert_am TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS anschreiben_verlauf (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titel TEXT,
    firma TEXT,
    text TEXT,
    model TEXT,
    stil TEXT,
    erstellt_am TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS dokumente (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    bewerbung_id INTEGER NOT NULL REFERENCES bewerbungen(id) ON DELETE CASCADE,
    dateiname    TEXT NOT NULL,
    originalname TEXT NOT NULL,
    mimetype     TEXT NOT NULL,
    groesse      INTEGER NOT NULL,
    typ          TEXT DEFAULT 'sonstiges',
    hochgeladen_am TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_bew_status     ON bewerbungen(status);
  CREATE INDEX IF NOT EXISTS idx_bew_archiviert ON bewerbungen(archiviert);
  CREATE INDEX IF NOT EXISTS idx_bew_followup   ON bewerbungen(followup_datum);
  CREATE INDEX IF NOT EXISTS idx_komm_bew_id    ON kommentare(bewerbung_id);
  CREATE INDEX IF NOT EXISTS idx_dok_bew_id     ON dokumente(bewerbung_id);
`);

// Migrationen
try { db.exec(`ALTER TABLE vorlagen ADD COLUMN ton TEXT DEFAULT 'formell'`); } catch(e) {}
try { db.exec(`ALTER TABLE vorlagen ADD COLUMN sprache TEXT DEFAULT 'deutsch'`); } catch(e) {}
try { db.exec(`ALTER TABLE vorlagen ADD COLUMN laenge TEXT DEFAULT 'mittel'`); } catch(e) {}
try { db.exec(`ALTER TABLE vorlagen ADD COLUMN hinweise TEXT`); } catch(e) {}
try { db.exec(`CREATE TABLE IF NOT EXISTS anschreiben_verlauf (id INTEGER PRIMARY KEY AUTOINCREMENT, titel TEXT, firma TEXT, text TEXT, model TEXT, stil TEXT, erstellt_am TEXT DEFAULT (datetime('now')))`); } catch(e) {}
try { db.exec(`CREATE TABLE IF NOT EXISTS erfahrungen (id INTEGER PRIMARY KEY, skills TEXT DEFAULT '[]', stationen TEXT DEFAULT '[]', zertifikate TEXT DEFAULT '[]', aktualisiert_am TEXT DEFAULT (datetime('now')))`); } catch(e) {}
// Migration: Dokumente-Tabelle für bestehende DBs
try {
  db.exec(`CREATE TABLE IF NOT EXISTS dokumente (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    bewerbung_id INTEGER NOT NULL REFERENCES bewerbungen(id) ON DELETE CASCADE,
    dateiname    TEXT NOT NULL,
    originalname TEXT NOT NULL,
    mimetype     TEXT NOT NULL,
    groesse      INTEGER NOT NULL,
    typ          TEXT DEFAULT 'sonstiges',
    hochgeladen_am TEXT DEFAULT (datetime('now'))
  )`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_dok_bew_id ON dokumente(bewerbung_id)`);
} catch(e) {}

// Standard-Vorlagen
const count = db.prepare('SELECT COUNT(*) as c FROM vorlagen').get();
if (count.c === 0) {
  db.prepare(`INSERT INTO vorlagen (name, ton, sprache, laenge, hinweise) VALUES (?, ?, ?, ?, ?)`).run('Standard IT / Linux', 'formell', 'deutsch', 'mittel', 'Betone Linux-Kenntnisse, Docker und Troubleshooting. Zeige Begeisterung fuer Open Source.');
  db.prepare(`INSERT INTO vorlagen (name, ton, sprache, laenge, hinweise) VALUES (?, ?, ?, ?, ?)`).run('Kurz & Praegnant', 'formell', 'deutsch', 'kurz', 'Halte das Anschreiben sehr knapp. Maximal 150 Woerter. Keine Floskeln.');
  db.prepare(`INSERT INTO vorlagen (name, ton, sprache, laenge, hinweise) VALUES (?, ?, ?, ?, ?)`).run('Modern & Direkt', 'modern', 'deutsch', 'mittel', 'Moderner, direkter Stil ohne klassische Floskeln. Starte mit einem starken ersten Satz.');
}

// Standard-Profil
const profil = db.prepare('SELECT COUNT(*) as c FROM profil').get();
if (profil.c === 0) {
  db.prepare(`INSERT INTO profil (id) VALUES (1)`).run();
}

// Standard-Erfahrungen
const exp = db.prepare('SELECT COUNT(*) as c FROM erfahrungen').get();
if (exp.c === 0) {
  db.prepare(`INSERT INTO erfahrungen (id, skills, stationen, zertifikate) VALUES (1, '[]', '[]', '[]')`).run();
}

module.exports = db;
