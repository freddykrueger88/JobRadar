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

  it('upsert() speichert Profilwerte', () => {
    svc.upsert({ vorname: 'Max', nachname: 'Mustermann' });
    const p = svc.get();
    assert.equal(p.vorname, 'Max');
    assert.equal(p.nachname, 'Mustermann');
  });

  it('upsert() überschreibt bestehende Werte', () => {
    svc.upsert({ vorname: 'Anna' });
    const p = svc.get();
    assert.equal(p.vorname, 'Anna');
  });
});
