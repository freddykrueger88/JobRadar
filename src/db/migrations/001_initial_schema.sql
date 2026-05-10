-- ============================================================
-- Migration 001 – Initiales Schema (v2.0.0)
-- Ersetzt das alte inline db.exec() in database.js
-- ============================================================

CREATE TABLE IF NOT EXISTS bewerbungen (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  titel               TEXT NOT NULL,
  firma               TEXT NOT NULL,
  ort                 TEXT,
  quelle              TEXT,
  url                 TEXT,
  status              TEXT DEFAULT 'beworben',
  beworben_am         TEXT,
  followup_datum      TEXT,
  bewertung           INTEGER,
  notizen             TEXT,
  anschreiben         TEXT,
  stellenbeschreibung TEXT,
  archiviert          INTEGER DEFAULT 0,
  erstellt_am         TEXT DEFAULT (datetime('now')),
  aktualisiert_am     TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS kommentare (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  bewerbung_id   INTEGER NOT NULL REFERENCES bewerbungen(id) ON DELETE CASCADE,
  text           TEXT NOT NULL,
  erstellt_am    TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS profil (
  id         INTEGER PRIMARY KEY,
  name       TEXT,
  email      TEXT,
  rollen     TEXT,
  ort        TEXT,
  keywords   TEXT,
  blacklist  TEXT,
  kurzprofil TEXT,
  staerken   TEXT
);

CREATE TABLE IF NOT EXISTS erfahrungen (
  id              INTEGER PRIMARY KEY,
  skills          TEXT DEFAULT '[]',
  stationen       TEXT DEFAULT '[]',
  zertifikate     TEXT DEFAULT '[]',
  aktualisiert_am TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS anschreiben_verlauf (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  titel       TEXT,
  firma       TEXT,
  text        TEXT,
  model       TEXT,
  stil        TEXT,
  erstellt_am TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS dokumente (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  bewerbung_id   INTEGER NOT NULL REFERENCES bewerbungen(id) ON DELETE CASCADE,
  dateiname      TEXT NOT NULL,
  originalname   TEXT NOT NULL,
  mimetype       TEXT NOT NULL,
  groesse        INTEGER NOT NULL,
  typ            TEXT DEFAULT 'sonstiges',
  hochgeladen_am TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS lebenslauf_vault (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  name           TEXT NOT NULL,
  dateiname      TEXT NOT NULL,
  originalname   TEXT NOT NULL,
  groesse        INTEGER NOT NULL,
  notiz          TEXT,
  hochgeladen_am TEXT DEFAULT (datetime('now'))
);

-- Indizes
CREATE INDEX IF NOT EXISTS idx_bew_status     ON bewerbungen(status);
CREATE INDEX IF NOT EXISTS idx_bew_archiviert ON bewerbungen(archiviert);
CREATE INDEX IF NOT EXISTS idx_bew_followup   ON bewerbungen(followup_datum);
CREATE INDEX IF NOT EXISTS idx_komm_bew_id    ON kommentare(bewerbung_id);
CREATE INDEX IF NOT EXISTS idx_dok_bew_id     ON dokumente(bewerbung_id);

-- Standard-Profil und Erfahrungen
INSERT OR IGNORE INTO profil (id) VALUES (1);
INSERT OR IGNORE INTO erfahrungen (id, skills, stationen, zertifikate) VALUES (1, '[]', '[]', '[]');
