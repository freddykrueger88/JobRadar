# Changelog

Alle nennenswerten Änderungen an JobRadar werden hier dokumentiert.
Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/).

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
