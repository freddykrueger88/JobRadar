'use strict';

/**
 * DB-Adapter – einzige Datei die better-sqlite3 kennt.
 * Alle anderen Module sprechen nur mit diesem Adapter.
 * Austausch gegen PostgreSQL o.ä. = nur diese Datei ändern.
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/bewerbungen.sqlite');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/**
 * Führt eine einzelne SELECT-Abfrage aus und gibt ein Objekt zurück.
 * @param {string} sql
 * @param {any[]} params
 * @returns {object|undefined}
 */
function get(sql, params = []) {
  return db.prepare(sql).get(...params);
}

/**
 * Führt eine SELECT-Abfrage aus und gibt alle Zeilen zurück.
 * @param {string} sql
 * @param {any[]} params
 * @returns {object[]}
 */
function all(sql, params = []) {
  return db.prepare(sql).all(...params);
}

/**
 * Führt eine INSERT/UPDATE/DELETE-Abfrage aus.
 * @param {string} sql
 * @param {any[]} params
 * @returns {import('better-sqlite3').RunResult}
 */
function run(sql, params = []) {
  return db.prepare(sql).run(...params);
}

/**
 * Führt mehrere Statements in einer Transaktion aus.
 * @param {function} fn - Funktion die DB-Operationen enthält
 * @returns {any}
 */
function transaction(fn) {
  return db.transaction(fn)();
}

/**
 * Führt rohen SQL-Code aus (nur für Migrationen).
 * @param {string} sql
 */
function exec(sql) {
  return db.exec(sql);
}

/**
 * Gibt die rohe better-sqlite3 Instanz zurück.
 * Nur für den Migration-Runner verwenden.
 */
function raw() {
  return db;
}

module.exports = { get, all, run, transaction, exec, raw };
