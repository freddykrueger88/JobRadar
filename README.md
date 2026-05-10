# 🎯 JobRadar

<p align="center">
  <img src="./public/logo.png" alt="JobRadar Logo" width="220"/>
</p>

<p align="center">
  <strong>🇩🇪 Dein persönlicher KI-Bewerbungsassistent &nbsp;|&nbsp; 🇬🇧 Your personal AI job application assistant</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18+-green?logo=node.js" alt="Node.js"/>
  <img src="https://img.shields.io/badge/Database-SQLite-blue?logo=sqlite" alt="SQLite"/>
  <img src="https://img.shields.io/badge/AI-Ollama%20local-orange" alt="Ollama"/>
  <img src="https://img.shields.io/badge/PWA-installable-purple" alt="PWA"/>
  <img src="https://img.shields.io/badge/License-MIT-lightgrey" alt="License"/>
  <img src="https://img.shields.io/badge/Security-helmet%20%2B%20rate--limit-red" alt="Security"/>
</p>

---

> 🇩🇪 **[Deutsche Version](#-deutsche-dokumentation)** &nbsp;|&nbsp; 🇬🇧 **[English Version](#-english-documentation)**

---

# 🇩🇪 Deutsche Dokumentation

## Was ist JobRadar?

JobRadar ist ein **vollständig lokaler** Bewerbungsassistent mit KI-Unterstützung. Stellensuche, KI-Anschreiben via Ollama, Bewerbungs-Tracking, Dokumenten-Verwaltung und Erfahrungsprofil — alles läuft auf deinem Rechner, keine Cloud, keine Datenweitergabe.

---

## ✨ Features

### 🔍 Stellensuche
- **7 Quellen gleichzeitig**: Arbeitnow, Jobicy, Arbeitsagentur, The Muse, Remotive, Adzuna 🔑, Jooble 🔑
- Automatischer **Match-Score** basierend auf Keywords und Blacklist aus deinem Profil
- **Umkreissuche** nach Ort / PLZ (10–200 km)
- **Dublettencheck** — bereits beworbene Stellen werden direkt markiert
- **Stellen ausblenden** mit Grund-Auswahl (Ausbildung, kein Homeoffice, zu weit entfernt …)

### 🤖 KI-Anschreiben via Ollama
- **Vollständig lokal** — keine Cloud, keine Kosten, keine Datenweitergabe
- Kontext enthält: Stellentitel, Firma, Tags, Beschreibung, Profil und dein Erfahrungsprofil
- **Modell-Auswahl** direkt in der UI (alle lokal installierten Modelle)
- **KI-Stile**: eigene Vorlagen mit Ton, Länge, Sprache und freien Hinweisen
- **KI-Feedback**: Analyse deines Anschreibens mit Verbesserungsvorschlägen
- PDF-Export, E-Mail-Button, Kopieren

### 💼 Erfahrungsprofil
Dein persönliches Kompetenzprofil — die KI nutzt es automatisch.

| Bereich | Inhalt |
|---|---|
| **🛠 Skills & Technologien** | Name + Niveau (Anfänger / Fortgeschritten / Experte) |
| **🏢 Berufsstationen** | Firma, Rolle, Zeitraum, Tätigkeiten |
| **🎓 Ausbildung & Zertifikate** | Titel, Jahr, Institution |

### 📁 Dokumente & Vault
- **Dokumente** pro Bewerbung hochladen (PDF, DOCX, PNG, JPEG — max. 10 MB)
- **Lebenslauf-Vault**: zentrale Ablage für Lebensläufe, die beim Erstellen von Anschreiben referenziert werden können
- Path-Traversal-Schutz bei allen Datei-Downloads

### 📋 Bewerbungs-Tracking
- **SQLite-Datenbank** — Daten bleiben dauerhaft lokal erhalten
- Status-Badges: Beworben / Interview / Angenommen / Abgelehnt
- **Kommentar-Zeitstrahl** pro Bewerbung
- Inline-Editor für Notizen, Follow-up-Datum und Sterne-Bewertung
- Follow-up-Erinnerungen: 🔴 überfällig / 🟡 fällig bald
- Filter nach Status, Firma, aktiv / archiviert
- **CSV-Export**

### 📊 Dashboard & Statistiken
- 5 Kennzahlen-Kacheln: Gesamt, Überfällig, Interview, Angenommen, Abgelehnt
- Erweiterte Statistiken: Erfolgsquote, Ø Reaktionszeit, Wochentags-Heatmap, Streak
- Automatisches Nachladen alle 5 Minuten

### 🔒 Sicherheit
- HTTP Security Headers via `helmet`
- Rate-Limiting: 200 req/15min (API), 20 req/5min (KI)
- Input-Validierung via `express-validator` auf allen Endpunkten
- Path-Traversal-Schutz bei Datei-Downloads
- Stack-Traces werden in Production nie nach außen gegeben
- Responsible Disclosure: siehe [SECURITY.md](./SECURITY.md)

### ⚙️ Technik
- **PWA** — als Desktop-App installierbar, offline-fähig
- Dark / Light Mode mit automatischer System-Erkennung
- Browser-Notifications für fällige Follow-ups
- Docker Compose — ein Befehl zum Starten
- Vollständig responsiv

---

## 🚀 Installation

### Voraussetzungen
- [Node.js](https://nodejs.org) 18+
- [Ollama](https://ollama.com) lokal installiert und laufend
- Optional: Docker & Docker Compose

### Option A — Direkt starten

```bash
git clone https://github.com/freddykrueger88/JobRadar.git
cd JobRadar
npm install
cp .env.example .env
npm start
```

Im Browser öffnen: **http://localhost:3000**

### Option B — Docker Compose

```bash
git clone https://github.com/freddykrueger88/JobRadar.git
cd JobRadar
cp .env.example .env
docker compose up -d
```

---

## ⚙️ Konfiguration (`.env`)

```env
PORT=3000
DB_PATH=./data/bewerbungen.sqlite
NODE_ENV=production

# Ollama KI (lokal)
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=mistral

# Adzuna (kostenlos — https://developer.adzuna.com)
ADZUNA_APP_ID=
ADZUNA_APP_KEY=

# Jooble (kostenlos — https://jooble.org/api/about)
JOOBLE_API_KEY=
```

---

## 🤖 Ollama Modell installieren

```bash
# Empfohlen für Anschreiben auf Deutsch
ollama pull mistral

# Alternativ: kleiner und schneller
ollama pull llama3.2

# Prüfen ob Modell läuft
curl http://localhost:11434/api/tags
```

### 🏆 Modell-Vergleich

| Kriterium | Mistral 7B | Llama 3.2 (3B) | Phi-4 (14B) |
|---|---|---|---|
| **Deutsch** | ✅ Sehr gut | ⚠️ Mittelmäßig | ✅ Sehr gut |
| **Formeller Stil** | ✅ Natürlich | ⚠️ Manchmal locker | ✅ Exzellent |
| **Größe** | ~4 GB | ~2 GB | ~9 GB |
| **RAM-Bedarf** | Ab 8 GB | Ab 4 GB | Ab 16 GB |
| **Geschwindigkeit** | ✅ Schnell | ✅ Sehr schnell | ⚠️ Langsamer |

> **Empfehlung:** Mistral 7B ist der beste Kompromiss. Wer 16+ GB RAM hat, kann `phi4` für noch bessere Qualität nutzen.

---

## 📁 Projektstruktur

```
JobRadar/
├── public/                  # Frontend (HTML, CSS, JS, PWA)
│   ├── index.html
│   ├── css/style.css
│   ├── js/
│   │   ├── app.js
│   │   └── erfahrungen.js
│   ├── manifest.json
│   └── sw.js
├── src/
│   ├── index.js             # Express-Server + helmet + Rate-Limiting
│   ├── db/                  # SQLite-Datenbank
│   ├── middleware/
│   │   ├── errorHandler.js
│   │   └── validate.js
│   └── routes/
│       ├── bewerbungen.js   # Tracking + Stats + CSV-Export
│       ├── dokumente.js     # Datei-Upload pro Bewerbung
│       ├── erfahrungen.js   # Skills, Berufsstationen, Zertifikate
│       ├── ki.js            # Ollama-Integration
│       ├── profil.js        # Nutzerprofil
│       ├── suche.js         # 7 Jobquellen
│       ├── vault.js         # Lebenslauf-Vault
│       └── vorlagen.js      # KI-Stile
├── tests/
│   └── api.test.js
├── docker-compose.yml
├── Dockerfile
├── SECURITY.md
└── .env.example
```

---

## 🤝 Beitragen

Beiträge sind willkommen! Bitte lies zuerst [CONTRIBUTING.md](./CONTRIBUTING.md).

```bash
git checkout -b feature/mein-feature
# Änderungen machen
npm test
git commit -m "feat: mein Feature"
git push origin feature/mein-feature
# Pull Request öffnen
```

## 📜 Lizenz & Nutzung

MIT — also ja, mach damit was du willst. Wirklich.

Fork es. Verkauf es. Bau eine millionenschwere SaaS draus. Nenn es um, gib dir selbst einen Gründer-Hoodie und tu so als wäre es deine Idee gewesen — kein Problem, null Stress.

Du musst mich nicht nennen. Aber falls du es tust, irgendwo in einem kleinen Changelog-Eintrag oder einem versteckten About-Screen, freue ich mich natürlich trotzdem. Bin halt auch nur ein Mensch.

> **⚠️ Die eine Bedingung — und die ist ernst gemeint:**
>
> Sollte aus diesem Projekt jemals ein kommerzielles Produkt mit bezahltem Zugang entstehen — egal ob von dir, deinem Cousin, einem VC-finanzierten Startup das den Code gefunden hat, oder irgendjemand anderem — erhält **[freddykrueger88](https://github.com/freddykrueger88)** lebenslang, unwiderruflich und kostenlos Zugang zum besten verfügbaren Abo-Tier.
>
> Nicht das mittlere. Nicht das günstigste mit „JobRadar-Freund“-Badge. Das **beste**.
>
> Ja, das ist die einzige Bedingung. Nein, ich werde es wahrscheinlich nie einfordern müssen. Aber falls doch: du weißt es, ich weiß es, GitHub weiß es. Das Internet vergisst nicht. 🤝

*Idee & Original: [freddykrueger88](https://github.com/freddykrueger88) — gebaut mit KI, Koffein und der Hoffnung dass es irgendwann jemand anderem nützt.*

---

---

# 🇬🇧 English Documentation

## What is JobRadar?

JobRadar is a **fully local** job application assistant with AI support. Job search, AI cover letters via Ollama, application tracking, document management and experience profile — everything runs on your machine, no cloud, no data sharing.

---

## ✨ Features

### 🔍 Job Search
- **7 sources simultaneously**: Arbeitnow, Jobicy, Arbeitsagentur, The Muse, Remotive, Adzuna 🔑, Jooble 🔑
- Automatic **match score** based on keywords and blacklist from your profile
- **Radius search** by city / ZIP code (10–200 km)
- **Duplicate check** — jobs you've already applied to are highlighted
- **Hide jobs** with reason selection (requires degree, no remote, too far away …)

### 🤖 AI Cover Letters via Ollama
- **Fully local** — no cloud, no cost, no data sharing
- Context includes: job title, company, tags, description, profile and your experience profile
- **Model selection** directly in the UI (all locally installed models)
- **AI styles**: custom templates with tone, length, language and free-text hints
- **AI feedback**: analysis of your cover letter with improvement suggestions
- PDF export, email button, copy to clipboard

### 💼 Experience Profile
Your personal competency profile — the AI uses it automatically.

| Section | Content |
|---|---|
| **🛠 Skills & Technologies** | Name + level (Beginner / Intermediate / Expert) |
| **🏢 Work History** | Company, role, period, activities |
| **🎓 Education & Certificates** | Title, year, institution |

### 📁 Documents & Vault
- Upload **documents** per application (PDF, DOCX, PNG, JPEG — max. 10 MB)
- **CV Vault**: central storage for résumés, referenceable when generating cover letters
- Path traversal protection on all file downloads

### 📋 Application Tracking
- **SQLite database** — data stays permanently local
- Status badges: Applied / Interview / Accepted / Rejected
- **Comment timeline** per application
- Inline editor for notes, follow-up date and star rating
- Follow-up reminders: 🔴 overdue / 🟡 due soon
- Filter by status, company, active / archived
- **CSV export**

### 📊 Dashboard & Statistics
- 5 KPI tiles: Total, Overdue, Interview, Accepted, Rejected
- Extended statistics: success rate, avg. response time, weekday heatmap, streak
- Auto-refresh every 5 minutes

### 🔒 Security
- HTTP security headers via `helmet`
- Rate limiting: 200 req/15min (API), 20 req/5min (AI)
- Input validation via `express-validator` on all endpoints
- Path traversal protection on file downloads
- Stack traces are never exposed in production
- Responsible disclosure: see [SECURITY.md](./SECURITY.md)

### ⚙️ Technical
- **PWA** — installable as a desktop app, offline capable
- Dark / Light mode with automatic system detection
- Browser notifications for due follow-ups
- Docker Compose — one command to start
- Fully responsive

---

## 🚀 Installation

### Prerequisites
- [Node.js](https://nodejs.org) 18+
- [Ollama](https://ollama.com) installed and running locally
- Optional: Docker & Docker Compose

### Option A — Run directly

```bash
git clone https://github.com/freddykrueger88/JobRadar.git
cd JobRadar
npm install
cp .env.example .env
npm start
```

Open in browser: **http://localhost:3000**

### Option B — Docker Compose

```bash
git clone https://github.com/freddykrueger88/JobRadar.git
cd JobRadar
cp .env.example .env
docker compose up -d
```

---

## ⚙️ Configuration (`.env`)

```env
PORT=3000
DB_PATH=./data/bewerbungen.sqlite
NODE_ENV=production

# Ollama AI (local)
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=mistral

# Adzuna (free — https://developer.adzuna.com)
ADZUNA_APP_ID=
ADZUNA_APP_KEY=

# Jooble (free — https://jooble.org/api/about)
JOOBLE_API_KEY=
```

---

## 🤖 Installing an Ollama Model

```bash
# Recommended for German cover letters
ollama pull mistral

# Alternative: smaller and faster
ollama pull llama3.2

# Verify model is running
curl http://localhost:11434/api/tags
```

### 🏆 Model Comparison

| Criterion | Mistral 7B | Llama 3.2 (3B) | Phi-4 (14B) |
|---|---|---|---|
| **German quality** | ✅ Excellent | ⚠️ Moderate | ✅ Excellent |
| **Formal style** | ✅ Natural | ⚠️ Sometimes casual | ✅ Outstanding |
| **Size** | ~4 GB | ~2 GB | ~9 GB |
| **RAM required** | 8 GB+ | 4 GB+ | 16 GB+ |
| **Speed** | ✅ Fast | ✅ Very fast | ⚠️ Slower |

> **Recommendation:** Mistral 7B is the best trade-off for most systems. If you have 16+ GB RAM, try `phi4` for even better quality.

---

## 📁 Project Structure

```
JobRadar/
├── public/                  # Frontend (HTML, CSS, JS, PWA)
│   ├── index.html
│   ├── css/style.css
│   ├── js/
│   │   ├── app.js
│   │   └── erfahrungen.js
│   ├── manifest.json
│   └── sw.js
├── src/
│   ├── index.js             # Express server + helmet + rate limiting
│   ├── db/                  # SQLite database
│   ├── middleware/
│   │   ├── errorHandler.js
│   │   └── validate.js
│   └── routes/
│       ├── bewerbungen.js   # Tracking + stats + CSV export
│       ├── dokumente.js     # File upload per application
│       ├── erfahrungen.js   # Skills, work history, certificates
│       ├── ki.js            # Ollama integration
│       ├── profil.js        # User profile
│       ├── suche.js         # 7 job sources
│       ├── vault.js         # CV vault
│       └── vorlagen.js      # AI styles
├── tests/
│   └── api.test.js
├── docker-compose.yml
├── Dockerfile
├── SECURITY.md
└── .env.example
```

---

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) first.

```bash
git checkout -b feature/my-feature
# Make your changes
npm test
git commit -m "feat: my feature"
git push origin feature/my-feature
# Open a Pull Request
```

## 📜 License & Usage

MIT — so yes, do whatever you want with this. Seriously.

Fork it. Sell it. Build a million-dollar SaaS out of it. Rebrand it, give yourself a founder hoodie and pretend it was your idea all along — no problem, zero stress.

You don't have to credit me. But if you do, somewhere in a tiny changelog entry or a hidden about screen, I won't complain. I'm only human.

> **⚠️ The one condition — and this is dead serious:**
>
> If this project ever becomes a commercial product with paid access — whether by you, your cousin, a VC-funded startup that stumbled across the code, or literally anyone else — **[freddykrueger88](https://github.com/freddykrueger88)** gets lifetime, irrevocable, completely free access to the best available subscription tier.
>
> Not the middle one. Not the cheapest with a cute "Friend of JobRadar" badge. The **best one**.
>
> Yes, that's the only condition. No, I'll probably never need to enforce it. But if I do: you know it, I know it, GitHub knows it. The internet doesn't forget. 🤝

*Original idea & concept: [freddykrueger88](https://github.com/freddykrueger88) — built with AI, caffeine, and the quiet hope that someone out there finds it useful.*
