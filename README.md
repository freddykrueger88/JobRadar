# 🎯 JobRadar

> Dein persönlicher Bewerbungs-Assistent mit KI-Anschreiben, 7 Jobquellen und vollständigem Bewerbungs-Tracking.

![Node.js](https://img.shields.io/badge/Node.js-18+-green?logo=node.js)
![SQLite](https://img.shields.io/badge/Datenbank-SQLite-blue?logo=sqlite)
![Ollama](https://img.shields.io/badge/KI-Ollama%20lokal-orange)
![PWA](https://img.shields.io/badge/PWA-installierbar-purple)
![License](https://img.shields.io/badge/Lizenz-MIT-lightgrey)

---

## ✨ Features

### 🔍 Stellensuche
- **7 Quellen gleichzeitig**: Arbeitnow, Jobicy, Arbeitsagentur, The Muse, Remotive, Adzuna, Jooble
- Automatischer **Match-Score** basierend auf deinen Keywords und Blacklist
- **Dublettencheck** — bereits beworbene Stellen werden direkt markiert
- Quellen einzeln oder alle zusammen durchsuchbar

### 🤖 KI-Anschreiben via Ollama
- **Vollständig lokal** — keine Cloud, keine Kosten, keine Datenweitergabe
- Schickt Stellentitel, Firma, Tags, Beschreibung und dein Profil als Kontext
- **Modell-Auswahl** direkt in der UI (alle lokal installierten Modelle)
- **KI-Feedback**: Bewertung 1–10 mit Verbesserungsvorschlägen
- Mehrere **Anschreiben-Vorlagen** verwaltbar
- PDF-Export, E-Mail-Button, Kopieren

### 📋 Bewerbungs-Tracking
- **SQLite-Datenbank** — Daten bleiben dauerhaft erhalten
- Status-Badges: Beworben / Interview / Angenommen / Abgelehnt
- **Kommentar-Zeitstrahl** pro Bewerbung (Statuswechsel automatisch eingetragen)
- Inline-Editor für Notizen, Follow-up-Datum und Sterne-Bewertung
- Follow-up-Erinnerungen: 🔴 überfällig / 🟡 fällig bald
- Filter nach Status, Firma, aktiv/archiviert
- **CSV-Export**

### 📊 Dashboard
- 5 Kennzahlen-Kacheln: Gesamt, Überfällig, Interview, Angenommen, Abgelehnt
- Status-Log mit Zeitstempel
- Automatisches Nachladen alle 5 Minuten

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

Dann im Browser öffnen: **http://localhost:3000**

### Option B — Docker Compose

```bash
git clone https://github.com/freddykrueger88/JobRadar.git
cd JobRadar
cp .env.example .env
docker compose up -d
```

---

## ⚙️ Konfiguration (.env)

```env
PORT=3000
DB_PATH=./data/bewerbungen.sqlite

# Ollama KI (lokal) — IP/Host deiner Ollama-Instanz eintragen
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

---

## 📁 Projektstruktur

```
JobRadar/
├── public/          # Frontend (HTML, CSS, JS, PWA)
│   ├── index.html
│   ├── css/style.css
│   ├── js/app.js
│   ├── manifest.json
│   └── sw.js
├── src/
│   ├── index.js     # Express-Server
│   ├── db/          # SQLite-Datenbank
│   └── routes/      # API-Routen
│       ├── bewerbungen.js
│       ├── ki.js    # Ollama-Integration
│       ├── suche.js # 7 Jobquellen
│       ├── vorlagen.js
│       └── profil.js
├── docker-compose.yml
├── Dockerfile
└── .env.example
```

---

## 📜 Lizenz

MIT — frei verwendbar, anpassbar und erweiterbar.
