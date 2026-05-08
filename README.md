# 🎯 JobRadar

Bewerbungs-Assistent mit KI-Anschreiben, 7 Jobquellen, Zeitstrahl und PWA-Modus.

## Features
- **7 Jobquellen**: Arbeitnow, Jobicy, Arbeitsagentur, The Muse, Remotive, Adzuna, Jooble
- **KI-Anschreiben** via lokales Ollama (kein Cloud-API-Key nötig)
- **KI-Feedback** für Anschreiben
- **Kommentar-Zeitstrahl** pro Bewerbung
- **Follow-up-Erinnerungen** mit Browser-Notifications
- **PWA-Modus** — installierbar als Desktop-App
- **Dark/Light Mode**, CSV-Export, PDF-Export

## Start

```bash
# Mit Docker
docker compose up

# Ohne Docker
npm install
npm start
```

Dann im Browser: http://localhost:3000

## Konfiguration

Kopiere `.env.example` nach `.env` und trage deine Keys ein.

## Ollama einrichten

```bash
ollama pull mistral
```
