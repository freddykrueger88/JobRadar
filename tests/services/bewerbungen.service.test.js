'use strict';

const assert = require('node:assert/strict');
const { describe, it, before, after } = require('node:test');

// Isolierte In-Memory-DB für Tests
process.env.DB_PATH = ':memory:';
process.env.NODE_ENV = 'test';

// DB + Migrationen bootstrappen
require('../../src/db/database');
const svc = require('../../src/services/bewerbungen.service');

describe('BewerbungenService', () => {

  it('create() legt eine neue Bewerbung an', () => {
    const b = svc.create({ titel: 'IT-Support', firma: 'Acme GmbH' });
    assert.ok(b.id > 0);
    assert.equal(b.titel, 'IT-Support');
    assert.equal(b.firma, 'Acme GmbH');
    assert.equal(b.status, 'beworben');
  });

  it('getById() gibt Bewerbung mit Kommentaren zurück', () => {
    const b = svc.create({ titel: 'DevOps', firma: 'Tech AG' });
    const fetched = svc.getById(b.id);
    assert.equal(fetched.id, b.id);
    assert.ok(Array.isArray(fetched.kommentare));
    assert.ok(Array.isArray(fetched.dokumente));
  });

  it('update() ändert Status und gibt aktualisiertes Objekt zurück', () => {
    const b       = svc.create({ titel: 'Admin', firma: 'IT GmbH' });
    const updated = svc.update(b.id, { status: 'interview' });
    assert.equal(updated.status, 'interview');
  });

  it('remove() löscht die Bewerbung', () => {
    const b = svc.create({ titel: 'Test', firma: 'Delete AG' });
    svc.remove(b.id);
    assert.equal(svc.getById(b.id), null);
  });

  it('addKommentar() und deleteKommentar() funktionieren', () => {
    const b = svc.create({ titel: 'Kommentar-Test', firma: 'Comment GmbH' });
    const k = svc.addKommentar(b.id, 'Gesprächsnotiz');
    assert.equal(k.text, 'Gesprächsnotiz');
    svc.deleteKommentar(k.id);
    const b2 = svc.getById(b.id);
    assert.equal(b2.kommentare.length, 0);
  });

  it('getAll() filtert nach Status', () => {
    svc.create({ titel: 'A', firma: 'X', status: 'interview' });
    svc.create({ titel: 'B', firma: 'Y', status: 'beworben' });
    const interviews = svc.getAll({ status: 'interview' });
    assert.ok(interviews.every(b => b.status === 'interview'));
  });

  it('getStats() gibt sinnvolle Werte zurück', () => {
    const stats = svc.getStats();
    assert.ok(typeof stats.total === 'number');
    assert.ok(Array.isArray(stats.byStatus));
    assert.ok(Array.isArray(stats.followups));
  });

  it('exportCsv() gibt Array zurück', () => {
    const rows = svc.exportCsv();
    assert.ok(Array.isArray(rows));
  });
});
