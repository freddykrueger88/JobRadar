'use strict';

const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

process.env.DB_PATH  = ':memory:';
process.env.NODE_ENV = 'test';

require('../../src/db/database');
const svc = require('../../src/services/profil.service');

describe('ProfilService', () => {

  it('get() gibt ein Objekt zurück (ggf. leer)', () => {
    const p = svc.get();
    assert.ok(p !== undefined);
  });

  it('update() speichert Profilwerte', () => {
    svc.update({ name: 'Max Mustermann', ort: 'Bremen' });
    const p = svc.get();
    assert.equal(p.name, 'Max Mustermann');
    assert.equal(p.ort, 'Bremen');
  });

  it('update() überschreibt bestehende Werte', () => {
    svc.update({ name: 'Anna Schmidt' });
    const p = svc.get();
    assert.equal(p.name, 'Anna Schmidt');
  });

  it('update() ohne bekannte Felder gibt unverändertes Objekt zurück', () => {
    const before = svc.get();
    const after  = svc.update({ unbekannt: 'xyz' });
    assert.equal(before.name, after.name);
  });
});
