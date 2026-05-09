# Changelog

Alle nennenswerten Änderungen an JobRadar werden hier dokumentiert.
Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/).

---

## [1.1.0] — 2026-05-09

### ✨ Hinzugefügt

#### 📋 Block 1 – Stellenanzeige-Snapshot
- Beim Klick auf „Als beworben markieren“ wird die Stellenbeschreibung automatisch als Snapshot in der Datenbank gespeichert
- Im Bewerbungsverlauf erscheint ein 📋-Button wenn ein Snapshot vorhanden ist
- Im Timeline-Modal ist ebenfalls ein Snapshot-Button verfügbar
- Snapshot-Modal zeigt gespeicherte Anzeige auch wenn die Originalseite offline ist
- Kopierfunktion im Snapshot-Modal

#### 📄 Block 2 – Lebenslauf-Vault
- Neuer Tab „📄 CV-Vault“ zum Hochladen mehrerer Lebenslauf-Versionen (PDF, DOC, DOCX)
- Download und Löschen von gespeicherten CVs
- Pro Bewerbung kann im Bearbeiten-Dialog ein CV aus dem Vault verknüpft werden
- Beim manuellen Hinzufügen einer Bewerbung ist CV-Auswahl direkt möglich
- Verknüpfter CV wird als Chip in der Bewerbungsliste angezeigt
- Vault-Selects aktualisieren sich automatisch bei Änderungen

#### 🗂 Block 3 – Kanban-Board
- Neuer Tab „🗂 Kanban“ mit 4 Spalten: Beworben / Interview / Angenommen / Abgelehnt
- Bewerbungen können per ← → Pfeile zwischen Spalten verschoben werden
- Überfällige Follow-ups werden rot markiert
- Board lädt automatisch beim Tab-Wechsel

### 🔧 Technisch
- DB-Migration: `stellenbeschreibung TEXT` in `bewerbungen`
- DB-Migration: `lebenslauf_id INTEGER REFERENCES lebenslauf_vault` in `bewerbungen`
- Neue Tabelle `lebenslauf_vault` mit Upload-Metadaten
- Neue Route `GET/POST/DELETE /api/vault`
- Neue Dateien: `public/js/snapshot.js`, `public/js/vault.js`, `public/js/kanban.js`
- `showTab()` erweitert um Kanban- und Vault-Trigger
- `aktualisiereVaultSelects()` befüllt alle Vault-Selects inkl. Modal
- Alle Migrationen laufen automatisch beim Start – keine manuellen DB-Änderungen nötig

---

## [1.0.0] — 2026-05-08

### ✨ Hinzugefügt
- **7 Jobquellen**: Arbeitnow, Jobicy, Bundesagentur für Arbeit, The Muse, Remotive, Adzuna, Jooble
- **KI-Anschreiben-Generator** via Ollama (vollständig lokal, kein Cloud-Zwang)
- **KI-Feedback** — Bewertung 1–10 mit konkreten Verbesserungsvorschlägen
- **Modell-Auswahl** direkt in der UI, alle lokal installierten Ollama-Modelle werden automatisch geladen
- **Bewerbungs-Tracking** mit SQLite-Datenbank (persistent)
- **Status-Badges**: Beworben / Interview / Angenommen / Abgelehnt
- **Kommentar-Zeitstrahl** pro Bewerbung — Statuswechsel automatisch protokolliert
- **Inline-Editor** für Notizen, Follow-up-Datum und Sterne-Bewertung
- **Follow-up-Erinnerungen** mit Farbmarkierung (überfällig / bald fällig)
- **Browser-Notifications** für fällige Follow-ups
- **Automatischer Match-Score** basierend auf Keywords und Blacklist
- **Dublettencheck** über Firma + Titel
- **Mehrere Anschreiben-Vorlagen** verwaltbar
- **PDF-Export**, E-Mail-Button, Kopieren
- **CSV-Export** aller Bewerbungen
- **Dashboard** mit 5 Kennzahlen-Kacheln und Status-Log
- **PWA-Modus** — installierbar, offline-fähig via Service Worker
- **Dark / Light Mode** mit automatischer System-Erkennung
- **Docker Compose** Support
- **Vollständig responsiv**

### 🔧 Technisch
- Node.js + Express Backend
- SQLite Datenbank via better-sqlite3
- Kein Frontend-Framework — reines Vanilla JS
- Service Worker für PWA / Offline-Cache
- GitHub Actions CI (Syntax-Check + npm audit)
