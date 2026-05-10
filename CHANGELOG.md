# Changelog

Alle nennenswerten Änderungen an JobRadar werden hier dokumentiert.
Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/).

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
- **SPA-Fallback-Reihenfolge** korrigiert: `notFoundHandler` und `errorHandler` kommen jetzt nach dem Fallback
- **Leerer URL-String** im Bewerbungs-Schema wird jetzt korrekt zu `null` transformiert
- **`DELETE` gibt 404** wenn Ressource nicht existiert (vorher immer 204)
- **`getAll()` limit** serverseitig auf 500 gecappt (vorher unbegrenzt)
- **`update()` prüft Existenz** vor dem SQL-UPDATE

### 🧪 Testing

- Edge-Case-Tests für `bewerbungen.service`: nicht-existente IDs, leere Updates, `limit`-Cap
- Neue Test-Dateien: `vault.service.test.js`, `profil.service.test.js`
- ESLint-Config (`eslint.config.js`) eingeführt

### ⚙️ DevOps

- CI: Linting-Step hinzugefügt
- CI: Syntax-Check via `find src -name '*.js'` statt hardcodierter Dateiliste
- CI: Branch-Trigger auf `main` + `dev` umgestellt
- `dev`-Branch angelegt
- `.gitignore` erweitert: `*.db`, `*.db-shm`, `*.db-wal`, `uploads/`, `vault/`, `coverage/`, `*.log`, `.DS_Store`

---

## [1.1.1] — 2026-05-10

### 🔒 Sicherheit

- **Path Traversal behoben** (`dokumente.js`, `vault.js`): Download-Endpunkte prüfen jetzt via `path.resolve()` + `startsWith()`, ob der angeforderte Dateipfad wirklich innerhalb des Upload-Verzeichnisses liegt.
- **`helmet` hinzugefügt**: Alle HTTP-Responses erhalten jetzt automatisch sichere Security-Headers.
- **`/api/ki/models` auf localhost beschränkt**: Gibt außerhalb von localhost HTTP 403 zurück.
- **`/health` und `/api/version` in Production versteckt**.
- **Input-Validierung in `bewerbungen.js`** nachgezogen mit `express-validator`.
- **Input-Längenbegrenzung in `suche.js`**: Query-Parameter werden gecappt.
- **`SECURITY.md` hinzugefügt**.

### 🔧 Technisch

- `helmet ^8.0.0` als Produktions-Dependency hinzugefügt
- CI-Workflow aktualisiert: `actions/checkout@v4`, `actions/setup-node@v4`, `npm ci`, Node-Matrix 20+22
- README zweisprachig neu geschrieben

---

## [1.1.0] — 2026-05-09

### ✨ Hinzugefügt

#### 📋 Block 1 – Stellenanzeige-Snapshot
- Snapshot beim Klick auf „Als beworben markieren“
- Snapshot-Modal zeigt gespeicherte Anzeige auch offline

#### 📄 Block 2 – Lebenslauf-Vault
- Mehrere Lebenslauf-Versionen hochladen, verwalten, pro Bewerbung verknüpfen

#### 🗂 Block 3 – Kanban-Board
- 4 Spalten: Beworben / Interview / Angenommen / Abgelehnt

---

## [1.0.0] — 2026-05-08

### ✨ Erstveröffentlichung

- 7 Jobquellen, KI-Anschreiben via Ollama, Bewerbungs-Tracking, PWA, Docker Compose
