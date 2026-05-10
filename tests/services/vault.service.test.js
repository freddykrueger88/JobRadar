'use strict';

const assert = require('node:assert/strict');
const { describe, it, after } = require('node:test');
const fs   = require('fs');
const path = require('path');
const os   = require('os');

process.env.DB_PATH  = ':memory:';
process.env.NODE_ENV = 'test';

// Temp-Verzeichnis für Test-Uploads
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vault-test-'));
process.env.VAULT_DIR = tmpDir;

require('../../src/db/database');
const svc = require('../../src/services/vault.service');

describe('VaultService', () => {

  after(() => {
    // Aufräumen
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('getAll() gibt leeres Array zurück wenn keine Einträge', () => {
    assert.ok(Array.isArray(svc.getAll()));
  });

  it('create() legt Vault-Eintrag an', () => {
    const entry = svc.create({
      name: 'Lebenslauf 2026',
      dateiname: 'test-uuid.pdf',
      originalname: 'lebenslauf.pdf',
      groesse: 12345,
      notiz: 'Aktuelle Version'
    });
    assert.ok(entry.id > 0);
    assert.equal(entry.name, 'Lebenslauf 2026');
  });

  it('getAll() gibt angelegten Eintrag zurück', () => {
    const all = svc.getAll();
    assert.ok(all.length >= 1);
  });

  it('getFilePath() gibt null für nicht-existente ID', () => {
    assert.equal(svc.getFilePath(999999), null);
  });

  it('remove() löscht Eintrag aus DB', () => {
    const entry = svc.create({
      name: 'Zum Löschen',
      dateiname: 'del-uuid.pdf',
      originalname: 'del.pdf',
      groesse: 100,
    });
    svc.remove(entry.id);
    assert.equal(svc.getFilePath(entry.id), null);
  });

  it('remove() auf nicht-existente ID wirft keinen Fehler', () => {
    assert.doesNotThrow(() => svc.remove(999999));
  });
});
