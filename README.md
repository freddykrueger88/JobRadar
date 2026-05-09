# 🎯 JobRadar

<p align="center">
  <img src="./public/logo.png" alt="JobRadar Logo" width="220"/>
</p>

<p align="center">
  <strong>Dein persönlicher KI-Bewerbungsassistent</strong><br/>
  Stellensuche, KI-Anschreiben, Bewerbungs-Tracking und Erfahrungsprofil — alles lokal, alles dein.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18+-green?logo=node.js" alt="Node.js"/>
  <img src="https://img.shields.io/badge/Datenbank-SQLite-blue?logo=sqlite" alt="SQLite"/>
  <img src="https://img.shields.io/badge/KI-Ollama%20lokal-orange" alt="Ollama"/>
  <img src="https://img.shields.io/badge/PWA-installierbar-purple" alt="PWA"/>
  <img src="https://img.shields.io/badge/Lizenz-MIT-lightgrey" alt="License"/>
</p>

---

## ✨ Features im Überblick

### 🔍 Stellensuche
- **7 Quellen gleichzeitig**: Arbeitnow, Jobicy, Arbeitsagentur, The Muse, Remotive, Adzuna🔑, Jooble🔑
- Automatischer **Match-Score** basierend auf Keywords und Blacklist aus deinem Profil
- **Umkreissuche** nach Ort / PLZ (10–200 km)
- **Dublettencheck** — bereits beworbene Stellen werden direkt markiert
- **Stellen ausblenden** mit Grund-Auswahl (Ausbildung, kein Homeoffice, zu weit entfernt …)
  - Ausgeblendete Stellen bleiben auch nach neuer Suche gefiltert (localStorage)
  - Toggle zum temporären Einblenden + Verwaltungsliste zum Zurücksetzen

### 🤖 KI-Anschreiben via Ollama
- **Vollständig lokal** — keine Cloud, keine Kosten, keine Datenweitergabe
- Kontext enthält: Stellentitel, Firma, Tags, Beschreibung, Profil **und dein Erfahrungsprofil**
- **Modell-Auswahl** direkt in der UI (alle lokal installierten Modelle)
- **KI-Stile**: eigene Vorlagen mit Ton, Länge, Sprache und freien Hinweisen
- **KI-Feedback**: Analyse deines Anschreibens mit Verbesserungsvorschlägen
- PDF-Export, E-Mail-Button, Kopieren

### 💼 Erfahrungsprofil *(neu)*
Dein persönliches Kompetenzprofil — die KI nutzt es automatisch beim Anschreiben-Erstellen.

| Bereich | Inhalt |
|---|---|
| **🛠 Skills & Technologien** | Name + Niveau (Anfänger / Fortgeschritten / Experte) |
| **🏢 Berufsstationen** | Firma, Rolle, Zeitraum, Tätigkeiten als Freitext |
| **🎓 Ausbildung & Zertifikate** | Titel, Jahr, Institution |

Die Funktion `getErfahrungenKontext()` baut daraus automatisch einen strukturierten Markdown-Block, der beim KI-Request mitgeschickt wird. Im Log erscheint `[+Erfahrungen]` als Bestätigung.

### 🎨 KI-Stile
- Beliebig viele Stile mit **Ton** (formell / modern / kreativ / kurz), **Länge** (~120–350 Wörter), **Sprache** und freien Hinweisen
- Stil wird vor dem Generieren in der UI ausgewählt
- Im Log wird der verwendete Stil protokolliert

### 📋 Bewerbungs-Tracking
- **SQLite-Datenbank** — Daten bleiben dauerhaft erhalten
- Status-Badges: Beworben / Interview / Angenommen / Abgelehnt
- **Kommentar-Zeitstrahl** pro Bewerbung
- Inline-Editor für Notizen, Follow-up-Datum und Sterne-Bewertung
- Follow-up-Erinnerungen: 🔴 überfällig / 🟡 fällig bald
- Filter nach Status, Firma, aktiv / archiviert
- **CSV-Export**
- Manuell Bewerbungen hinzufügen

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

# Ollama KI (lokal) — IP/Host deiner Ollama-Instanz
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
| **Formeller Stil** | ✅ Natürlich, präzise | ⚠️ Manchmal locker | ✅ Exzellent |
| **Größe** | ✅ ~4 GB | ✅ ~2 GB | ⚠️ ~9 GB |
| **Geschwindigkeit** | ✅ Schnell | ✅ Sehr schnell | ⚠️ Langsamer |
| **RAM-Bedarf** | ✅ Ab 8 GB | ✅ Ab 4 GB | ⚠️ Ab 16 GB |
| **Anweisungen** | ✅ Zuverlässig | ⚠️ Gelegentlich abweichend | ✅ Sehr zuverlässig |

> **Empfehlung:** Mistral 7B ist der beste Kompromiss für die meisten Systeme. Wer 16+ GB RAM hat, kann `phi4` für noch bessere Qualität ausprobieren.

---

## 📁 Projektstruktur

```
JobRadar/
├── public/                  # Frontend (HTML, CSS, JS, PWA)
│   ├── index.html
│   ├── logo.png
│   ├── css/style.css
│   ├── js/
│   │   ├── app.js           # Haupt-App-Logik
│   │   └── erfahrungen.js   # Skills, Berufsstationen, Zertifikate
│   ├── manifest.json
│   └── sw.js
├── src/
│   ├── index.js             # Express-Server
│   ├── db/                  # SQLite-Datenbank
│   └── routes/              # API-Routen
│       ├── bewerbungen.js
│       ├── ki.js              # Ollama-Integration
│       ├── suche.js           # 7 Jobquellen
│       ├── vorlagen.js        # KI-Stile
│       └── profil.js
├── docker-compose.yml
├── Dockerfile
└── .env.example
```

---

## 📜 Lizenz

MIT — frei verwendbar, anpassbar und erweiterbar.
