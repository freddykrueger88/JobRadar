'use strict';

const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

process.env.DB_PATH   = ':memory:';
process.env.NODE_ENV  = 'test';

require('../../src/db/database');
const svc = require('../../src/services/einstellungen.service');

describe('EinstellungenService', () => {

  it('get() gibt Standard-Einstellungen zurück', () => {
    const cfg = svc.get();
    assert.ok(cfg);
    assert.equal(cfg.ki_modell,  'mistral');
    assert.equal(cfg.ki_sprache, 'deutsch');
  });

  it('update() überschreibt einzelne Felder', () => {
    svc.update({ ki_modell: 'phi4', ki_stil: 'modern' });
    const cfg = svc.get();
    assert.equal(cfg.ki_modell, 'phi4');
    assert.equal(cfg.ki_stil,   'modern');
  });

  it('update() ignoriert unbekannte Felder', () => {
    const before = svc.get();
    svc.update({ unbekannt: 'wert' });
    const after = svc.get();
    assert.equal(before.ki_modell, after.ki_modell);
  });
});
