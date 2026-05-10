-- ============================================================
-- Migration 003 – Push-Subscriptions (v2.0.0)
-- Speichert Web-Push-Endpunkte für Browser-Notifications.
-- ============================================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  endpoint       TEXT NOT NULL UNIQUE,
  p256dh         TEXT NOT NULL,
  auth           TEXT NOT NULL,
  erstellt_am    TEXT DEFAULT (datetime('now'))
);
