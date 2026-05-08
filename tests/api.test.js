/**
 * API-Tests mit Node.js built-in test runner + supertest
 * Ausführen: npm test
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');

process.env.DB_PATH = ':memory:';
process.env.NODE_ENV = 'test';

let app;
before(() => {
  app = require('../src/index');
});

// ── Health ────────────────────────────────────────────────────────────────────
test('GET /health gibt Status zurück', async () => {
  const res = await request(app).get('/health');
  assert.ok([200, 503].includes(res.status), 'Status muss 200 oder 503 sein');
  assert.ok(res.body.version, 'version muss vorhanden sein');
  assert.ok(res.body.checks, 'checks muss vorhanden sein');
});

test('GET /api/version gibt Version zurück', async () => {
  const res = await request(app).get('/api/version');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.name, 'JobRadar');
});

// ── Bewerbungen CRUD ──────────────────────────────────────────────────────────
let bewerbungId;

test('POST /api/bewerbungen erstellt eine Bewerbung', async () => {
  const res = await request(app)
    .post('/api/bewerbungen')
    .send({ titel: 'Linux Administrator', firma: 'Test GmbH', status: 'beworben' });
  assert.strictEqual(res.status, 200);
  assert.ok(res.body.id, 'id muss vorhanden sein');
  bewerbungId = res.body.id;
});

test('POST /api/bewerbungen schlägt ohne Pflichtfelder fehl', async () => {
  const res = await request(app)
    .post('/api/bewerbungen')
    .send({ ort: 'Remote' });
  assert.strictEqual(res.status, 422);
});

test('GET /api/bewerbungen gibt Liste zurück', async () => {
  const res = await request(app).get('/api/bewerbungen');
  assert.strictEqual(res.status, 200);
  assert.ok(Array.isArray(res.body));
});

test('PUT /api/bewerbungen/:id aktualisiert Status', async () => {
  const res = await request(app)
    .put(`/api/bewerbungen/${bewerbungId}`)
    .send({ status: 'interview' });
  assert.strictEqual(res.status, 200);
  assert.ok(res.body.ok);
});

test('GET /api/bewerbungen/stats/overview gibt Stats zurück', async () => {
  const res = await request(app).get('/api/bewerbungen/stats/overview');
  assert.strictEqual(res.status, 200);
  assert.ok(typeof res.body.total === 'number');
});

test('DELETE /api/bewerbungen/:id löscht Bewerbung', async () => {
  const res = await request(app).delete(`/api/bewerbungen/${bewerbungId}`);
  assert.strictEqual(res.status, 200);
  assert.ok(res.body.ok);
});

// ── Validierung ───────────────────────────────────────────────────────────────
test('POST /api/bewerbungen blockiert ungültigen Status', async () => {
  const res = await request(app)
    .post('/api/bewerbungen')
    .send({ titel: 'Test', firma: 'Firma', status: 'UNGÜLTIG' });
  assert.strictEqual(res.status, 422);
});

test('POST /api/bewerbungen blockiert ungültige Bewertung', async () => {
  const res = await request(app)
    .post('/api/bewerbungen')
    .send({ titel: 'Test', firma: 'Firma', bewertung: 99 });
  assert.strictEqual(res.status, 422);
});
