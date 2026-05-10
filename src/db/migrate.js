'use strict';

/**
 * Migration-Runner
 * Liest alle .sql-Dateien aus src/db/migrations/ in sortierter Reihenfolge
 * und führt jede genau einmal aus. Bereits ausgeführte Migrationen
 * werden in der _migrations-Tabelle getracked.
 */

const fs = require('fs');
const path = require('path');
const db = require('./adapter');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

function runMigrations() {
  // Meta-Tabelle anlegen falls nicht vorhanden
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      datei         TEXT NOT NULL UNIQUE,
      ausgefuehrt_am TEXT DEFAULT (datetime('now'))
    );
  `);

  // Alle .sql-Dateien alphabetisch sortiert
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('[migrate] Keine Migrationsdateien gefunden.');
    return;
  }

  let ran = 0;

  for (const file of files) {
    const already = db.get('SELECT id FROM _migrations WHERE datei = ?', [file]);
    if (already) continue;

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');

    try {
      db.exec(sql);
      db.run('INSERT INTO _migrations (datei) VALUES (?)', [file]);
      console.log(`[migrate] ✅ ${file}`);
      ran++;
    } catch (err) {
      console.error(`[migrate] ❌ Fehler in ${file}:`, err.message);
      process.exit(1);
    }
  }

  if (ran === 0) {
    console.log('[migrate] Alle Migrationen bereits ausgeführt.');
  } else {
    console.log(`[migrate] ${ran} Migration(en) erfolgreich ausgeführt.`);
  }
}

module.exports = { runMigrations };
