# Changelog

Alle nennenswerten Änderungen an JobRadar werden hier dokumentiert.
Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/).

---

## [2.1.0] — 2026-05-10

### 🎨 Design

- **Komplettes UI-Redesign**: Inter-Font via Google Fonts, neues CSS-Variablen-System
- **Verbesserte Cards**: `border-radius: 20px`, weiche Schatten-Hierarchie (`--shadow-sm/md/lg`)
- **Modernere Buttons**: Gradient-Fill, Ring-Fokus-Effekt mit `--primary-light`
- **Modal**: Glassmorphism-Backdrop mit `backdrop-filter: blur(4px)`
- **Stat-Kacheln**: Größere Zahlen (34px, 800 weight), uppercase Labels
- **Alle 3 Themes erhalten**: Light, Dark, Server Room

### 🛠️ Infrastruktur

- **Multi-Stage Dockerfile**: Build-Tools (python3, make, g++) nur im Builder-Stage → ~40% kleineres Prod-Image
- **Non-root User** `jobradar` im Container → kein Root-Betrieb mehr
- **docker-compose.yml**: Named Volume, Logging-Limit (10MB / 3 Dateien), konfigurierbarer `HOST_PORT`
- **`npm ci`** statt `npm install` im Dockerfile → deterministischer Build
- **`.env.example`** vollständig dokumentiert mit allen Variablen

### ⚙️ DevOps

- **`develop`-Branch** eingerichtet – `main` ist ab jetzt nur noch stabile Releases
- **GitHub Actions CI**: Lint + Tests + Docker-Build-Check bei jedem Push/PR auf `develop` und `main`
- **PR-Template** mit Checklist
- **Issue-Templates**: Bug Report, Feature Request
- Neue npm-Scripts: `lint:fix`, `docker:up`, `docker:down`, `docker:logs`

### 🐛 Fixes

- **Cache-Bug**: HTML nun mit `Cache-Control: no-store` – Updates nach `docker compose up --build` wirken sofort
- **Migration-Runner**: Crasht nicht mehr bei `duplicate column name` – ignoriert non-fatale SQL-Fehler
- **Beide Navs gleichzeitig sichtbar**: Ursache war gecachte `index.html` ohne `bottom-nav.css`-Link

---

## [2.0.0] — 2026-05-10

### 🛠 Architektur

- **Service-Layer eingeführt**: Vollständige Trennung Route → Service → DB in allen Modulen
- **Zod-Validierung**: Alle Eingaben laufen über typsichere Schemas in `src/schemas/`
- **Migrations-System**: SQL-Dateien in `src/db/migrations/`, automatisch getrackt über `_migrations`-Tabelle
- **`parseId`-Middleware**: Alle Path-Parameter werden als positive Integer validiert, kein `NaN` gelangt mehr in die DB
- **`vorlagen.js`** auf v2-Architektur migriert (Zod, Service-Layer, `parseId`)

### 🔒 Sicherheit

- **MIME-Type-Filter** für Vault- und Dokumenten-Uploads: nur PDF, DOC, DOCX, ODT, TXT (+ JPG/PNG bei Dokumenten)
- **`dokumente.js` doppelter Mount entfernt**: Route nur noch unter `/api/bewerbungen/:id/dokumente`
- **SPA-Fallback-Reihenfolge** korrigiert
- **`getAll()` limit** serverseitig auf 500 gecappt

### 🧪 Testing

- Edge-Case-Tests für `bewerbungen.service`
- Neue Test-Dateien: `vault.service.test.js`, `profil.service.test.js`
- ESLint-Config (`eslint.config.js`) eingeführt

---

## [1.1.1] — 2026-05-10

### 🔒 Sicherheit

- **Path Traversal behoben** (`dokumente.js`, `vault.js`)
- **`helmet` hinzugefügt**
- **`/api/ki/models` auf localhost beschränkt**
- **Input-Validierung** in `bewerbungen.js` und `suche.js`

---

## [1.1.0] — 2026-05-09

### ✨ Hinzugefügt

- Stellenanzeige-Snapshot
- Lebenslauf-Vault
- Kanban-Board

---

## [1.0.0] — 2026-05-08

### ✨ Erstveröffentlichung

- 7 Jobquellen, KI-Anschreiben via Ollama, Bewerbungs-Tracking, PWA, Docker Compose
