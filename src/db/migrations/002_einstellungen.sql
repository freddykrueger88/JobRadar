-- ============================================================
-- Migration 002 – Einstellungen-Tabelle (v2.0.0)
-- Ersetzt das alte vorlagen-System.
-- KI-Konfiguration wird einmalig hier gespeichert.
-- ============================================================

CREATE TABLE IF NOT EXISTS einstellungen (
  id                  INTEGER PRIMARY KEY CHECK (id = 1),
  -- KI
  ki_modell           TEXT DEFAULT 'mistral',
  ki_stil             TEXT DEFAULT 'formell',
  ki_sprache          TEXT DEFAULT 'deutsch',
  ki_laenge           TEXT DEFAULT 'mittel',
  ki_hinweise         TEXT,
  -- Push-Notifications
  push_aktiv          INTEGER DEFAULT 0,
  push_intervall_min  INTEGER DEFAULT 30,
  -- Suche
  suche_umkreis_km    INTEGER DEFAULT 50,
  suche_auto_aktiv    INTEGER DEFAULT 0,
  -- Allgemein
  dark_mode           TEXT DEFAULT 'auto',
  erstellt_am         TEXT DEFAULT (datetime('now')),
  aktualisiert_am     TEXT DEFAULT (datetime('now'))
);

-- Standard-Einstellungen
INSERT OR IGNORE INTO einstellungen (id) VALUES (1);
