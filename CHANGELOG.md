# Changelog

Alle nennenswerten Änderungen an JobRadar werden hier dokumentiert.
Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/).

---

## [1.1.1] — 2026-05-10

### 🔒 Sicherheit

- **Path Traversal behoben** (`dokumente.js`, `vault.js`): Download-Endpunkte prüfen jetzt via `path.resolve()` + `startsWith()`, ob der angeforderte Dateipfad wirklich innerhalb des Upload-Verzeichnisses liegt. Manipulierte Dateinamen in der Datenbank können nicht mehr auf beliebige Systempfade zeigen.
- **`helmet` hinzugefügt**: Alle HTTP-Responses erhalten jetzt automatisch sichere Security-Headers (Content-Security-Policy, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy u.à.).
- **`/api/ki/models` auf localhost beschränkt**: Der Endpunkt, der installierte Ollama-Modelle auflistet, gibt außerhalb von localhost jetzt HTTP 403 zurück.
- **`/health` und `/api/version` in Production versteckt**: Beide Endpunkte antworten bei `NODE_ENV=production` nur noch auf localhost-Anfragen.
- **Input-Validierung in `bewerbungen.js` nachgezogen**: Alle Routen (GET, POST, PUT, DELETE, Kommentare) nutzen jetzt `express-validator` mit Feldlängen, Typ- und Format-Prüfungen (ISO8601-Datum, URL-Format, Integer-Bereiche).
- **Input-Längenbegrenzung in `suche.js`**: Query-Parameter `rolle`, `ort`, `quelle`, `umkreis` werden jetzt gecapped – schützt vor Cache-Flooding-Angriffen.
- **Explizites 400 bei unbekannter Suchquelle** (`suche.js`): Statt stillem Fehlverhalten gibt der Endpunkt jetzt einen validen Fehler zurück.
- **API-Key-Konfigurationsstatus entfernt** (`suche.js`): `/api/suche/quellen` gibt nicht mehr preis, ob Adzuna/Jooble-Keys konfiguriert sind.
- **Vault-DELETE-Fehler wird jetzt geloggt** (`vault.js`): Fehlgeschlagenes Löschen einer Datei wird via `console.warn` protokolliert statt still ignoriert.
- **`SECURITY.md` hinzugefügt**: Responsible Disclosure Policy, DSGVO-Hinweise und Übersicht der implementierten Sicherheitsmaßnahmen.

### 🔧 Technisch

- `helmet ^8.0.0` als Produktions-Dependency hinzugefügt
- `NODE_ENV=production` in `.env.example` dokumentiert
- CI-Workflow aktualisiert: `actions/checkout@v4`, `actions/setup-node@v4`, `npm ci` statt `npm install`, npm-Cache aktiviert, Node-Matrix auf 20 + 22 erweitert, `dokumente.js` und `vault.js` in Syntax-Check aufgenommen, Audit-Level auf `moderate` erhöht
- README zweisprachig (Deutsch + Englisch) neu geschrieben

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
