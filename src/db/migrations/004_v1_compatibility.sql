-- ============================================================
-- Migration 004 – v1 → v2 Kompatibilität
-- Fügt fehlende Spalten hinzu falls eine v1-Datenbank
-- auf v2 migriert wird. Bereits vorhandene Spalten werden
-- ignoriert (SQLite wirft keinen Fehler bei IF NOT EXISTS
-- auf Column-Ebene, daher nutzen wir separate Statements).
-- ============================================================

-- lebenslauf_id in bewerbungen (war in v1 ein spätes ALTER TABLE)
ALTER TABLE bewerbungen ADD COLUMN lebenslauf_id INTEGER REFERENCES lebenslauf_vault(id) ON DELETE SET NULL;
