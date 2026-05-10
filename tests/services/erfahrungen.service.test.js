'use strict';

const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

process.env.DB_PATH  = ':memory:';
process.env.NODE_ENV = 'test';

require('../../src/db/database');
const svc = require('../../src/services/erfahrungen.service');

describe('ErfahrungenService', () => {

  it('get() gibt leere Arrays zurück (initialer Zustand)', () => {
    const erf = svc.get();
    assert.ok(Array.isArray(erf.skills));
    assert.ok(Array.isArray(erf.stationen));
    assert.ok(Array.isArray(erf.zertifikate));
  });

  it('update() speichert Skills und liest sie zurück', () => {
    const skills = [{ name: 'Linux', niveau: 'Experte' }, { name: 'Docker', niveau: 'Fortgeschritten' }];
    svc.update({ skills });
    const erf = svc.get();
    assert.equal(erf.skills.length, 2);
    assert.equal(erf.skills[0].name, 'Linux');
  });

  it('update() lässt andere Felder unberührt', () => {
    svc.update({ zertifikate: [{ titel: 'LPIC-1', jahr: 2024 }] });
    const erf = svc.get();
    assert.equal(erf.zertifikate.length, 1);
    assert.equal(erf.skills.length, 2); // von vorherigem Test
  });
});
