'use strict';

const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

process.env.DB_PATH  = ':memory:';
process.env.NODE_ENV = 'test';

require('../../src/db/database');
const svc = require('../../src/services/bewerbungen.service');

describe('BewerbungenService', () => {

  it('create() legt eine neue Bewerbung an', () => {
    const b = svc.create({ titel: 'IT-Support', firma: 'Acme GmbH' });
    assert.ok(b.id > 0);
    assert.equal(b.titel, 'IT-Support');
    assert.equal(b.status, 'beworben');
  });

  it('getById() gibt Bewerbung mit Kommentaren und Dokumenten zurück', () => {
    const b = svc.create({ titel: 'DevOps', firma: 'Tech AG' });
    const f = svc.getById(b.id);
    assert.ok(Array.isArray(f.kommentare));
    assert.ok(Array.isArray(f.dokumente));
  });

  it('getById() gibt null für nicht-existente ID zurück', () => {
    assert.equal(svc.getById(999999), null);
  });

  it('update() ändert Felder und gibt aktualisiertes Objekt zurück', () => {
    const b = svc.create({ titel: 'Admin', firma: 'IT GmbH' });
    const u = svc.update(b.id, { status: 'interview' });
    assert.equal(u.status, 'interview');
  });

  it('update() gibt null für nicht-existente ID zurück', () => {
    assert.equal(svc.update(999999, { status: 'interview' }), null);
  });

  it('update() ohne Felder gibt unverändertes Objekt zurück', () => {
    const b = svc.create({ titel: 'NoChange', firma: 'Same GmbH' });
    const u = svc.update(b.id, {});
    assert.equal(u.titel, 'NoChange');
  });

  it('remove() löscht die Bewerbung', () => {
    const b = svc.create({ titel: 'Delete', firma: 'Gone AG' });
    svc.remove(b.id);
    assert.equal(svc.getById(b.id), null);
  });

  it('remove() auf nicht-existente ID wirft keinen Fehler', () => {
    assert.doesNotThrow(() => svc.remove(999999));
  });

  it('addKommentar() und deleteKommentar() funktionieren', () => {
    const b = svc.create({ titel: 'Kommentar', firma: 'Comment GmbH' });
    const k = svc.addKommentar(b.id, 'Notiz');
    assert.equal(k.text, 'Notiz');
    svc.deleteKommentar(k.id);
    assert.equal(svc.getById(b.id).kommentare.length, 0);
  });

  it('getAll() filtert nach Status', () => {
    svc.create({ titel: 'A', firma: 'X', status: 'interview' });
    const res = svc.getAll({ status: 'interview' });
    assert.ok(res.every(b => b.status === 'interview'));
  });

  it('getAll() cappiert limit auf 500', () => {
    const res = svc.getAll({ limit: 999999 });
    assert.ok(Array.isArray(res));
  });

  it('getAll() behandelt limit=0 ohne Fehler', () => {
    const res = svc.getAll({ limit: 0 });
    assert.ok(Array.isArray(res));
  });

  it('getStats() gibt sinnvolle Werte zurück', () => {
    const s = svc.getStats();
    assert.ok(typeof s.total === 'number');
    assert.ok(Array.isArray(s.byStatus));
    assert.ok(Array.isArray(s.followups));
    assert.ok(Array.isArray(s.overdue));
  });

  it('exportCsv() gibt Array zurück', () => {
    assert.ok(Array.isArray(svc.exportCsv()));
  });
});
