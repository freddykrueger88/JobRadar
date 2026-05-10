'use strict';

/**
 * Einstiegspunkt für die Datenbank.
 * Führt beim Start alle ausstehenden Migrationen aus
 * und exportiert den Adapter für alle anderen Module.
 */

const { runMigrations } = require('./migrate');

runMigrations();

module.exports = require('./adapter');
