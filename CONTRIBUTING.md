# Contributing zu JobRadar

Danke dass du zu JobRadar beitragen möchtest! 🎉

## Voraussetzungen

- Node.js 18+
- Git
- Ollama lokal (für KI-Features)

## Lokales Setup

```bash
git clone https://github.com/freddykrueger88/JobRadar.git
cd JobRadar
npm install
cp .env.example .env
# .env anpassen (OLLAMA_URL etc.)
npm start
```

## Workflow

1. **Fork** das Repository
2. **Branch** erstellen: `git checkout -b feature/mein-feature`
3. **Änderungen** vornehmen
4. **Syntax prüfen**: `node --check src/**/*.js`
5. **Commit**: `git commit -m 'feat: kurze Beschreibung'`
6. **Push**: `git push origin feature/mein-feature`
7. **Pull Request** öffnen

## Commit-Konventionen

Wir nutzen [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix | Bedeutung |
|---|---|
| `feat:` | Neues Feature |
| `fix:` | Bugfix |
| `docs:` | Nur Dokumentation |
| `chore:` | Build, CI, Konfiguration |
| `refactor:` | Refactoring ohne Feature/Fix |

## Was ist willkommen?

- Neue Jobquellen (neue Datei in `src/routes/suche.js`)
- Verbesserungen am KI-Prompt
- UI-Verbesserungen
- Bugfixes
- Übersetzungen

## Was bitte vermeiden?

- Private Daten, API-Keys oder IP-Adressen im Code
- Externe Abhängigkeiten ohne Diskussion
- Breaking Changes ohne vorherige Issue-Diskussion

## Fragen?

Einfach ein [Issue öffnen](https://github.com/freddykrueger88/JobRadar/issues) — ich antworte gerne!
