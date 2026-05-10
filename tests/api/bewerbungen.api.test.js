'use strict';

const assert = require('node:assert/strict');
const { describe, it, before } = require('node:test');

process.env.DB_PATH  = ':memory:';
process.env.NODE_ENV = 'test';

require('../../src/db/database');
const app = require('../../src/index');

async function req(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`http://localhost:3001${path}`, opts);
  const data = res.status === 204 ? null : await res.json();
  return { status: res.status, data };
}

describe('Bewerbungen API', () => {
  let server;

  before(() => {
    server = app.listen(3001);
  });

  after(() => server?.close());

  it('GET /api/bewerbungen gibt leeres Array zurück', async () => {
    const { status, data } = await req('GET', '/api/bewerbungen');
    assert.equal(status, 200);
    assert.ok(Array.isArray(data));
  });

  it('POST /api/bewerbungen erstellt Bewerbung', async () => {
    const { status, data } = await req('POST', '/api/bewerbungen', { titel: 'API-Test', firma: 'Test AG' });
    assert.equal(status, 201);
    assert.equal(data.titel, 'API-Test');
    assert.ok(data.id > 0);
  });

  it('POST /api/bewerbungen gibt 400 bei fehlendem Titel', async () => {
    const { status } = await req('POST', '/api/bewerbungen', { firma: 'Nur Firma' });
    assert.equal(status, 400);
  });

  it('PATCH /api/bewerbungen/:id aktualisiert Status', async () => {
    const { data: created } = await req('POST', '/api/bewerbungen', { titel: 'Patch-Test', firma: 'Patch GmbH' });
    const { status, data } = await req('PATCH', `/api/bewerbungen/${created.id}`, { status: 'interview' });
    assert.equal(status, 200);
    assert.equal(data.status, 'interview');
  });

  it('DELETE /api/bewerbungen/:id gibt 204 zurück', async () => {
    const { data: created } = await req('POST', '/api/bewerbungen', { titel: 'Delete-Test', firma: 'Delete AG' });
    const { status } = await req('DELETE', `/api/bewerbungen/${created.id}`);
    assert.equal(status, 204);
  });

  it('GET /api/bewerbungen/stats gibt stats zurück', async () => {
    const { status, data } = await req('GET', '/api/bewerbungen/stats');
    assert.equal(status, 200);
    assert.ok('total' in data);
  });
});
