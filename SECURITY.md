# Security Policy

## Unterstützte Versionen

| Version | Support          |
|---------|------------------|
| 1.x     | ✅ Aktiv          |

## Sicherheitslücken melden

Bitte melde Sicherheitslücken **nicht** über öffentliche GitHub Issues.

Erstelle stattdessen ein privates [GitHub Security Advisory](https://github.com/freddykrueger88/JobRadar/security/advisories/new) oder kontaktiere den Maintainer direkt.

Wir bemühen uns, innerhalb von **72 Stunden** zu antworten.

## Hinweise zur DSGVO

JobRadar speichert Bewerbungsdaten lokal in einer SQLite-Datenbank.
Es werden keine Daten an externe Server übertragen, außer an die konfigurierten
Job-APIs (Adzuna, Jooble) und das lokal betriebene Ollama-Modell.

## Sicherheitsmaßnahmen

- HTTP Security Headers via `helmet`
- Rate-Limiting auf allen API-Endpunkten
- Input-Validierung via `express-validator`
- Path-Traversal-Schutz bei Datei-Downloads
- Keine Stack-Traces in Production-Fehlermeldungen
