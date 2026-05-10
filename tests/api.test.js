'use strict';

/**
 * API-Integrationstests v2
 * Nutzt Node.js built-in test runner + supertest
 * Ausführen: npm test
 */
const { test, before, after } = require('node:test');
const assert  = require('node:assert/strict');
const request = require('supertest');

process.env.DB_PATH    = ':memory:';
process.env.NODE_ENV   = 'test';
process.env.OLLAMA_URL = 'http://localhost:11434';

// DB + Migrationen bootstrappen
require('../src/db/database');

let app;
before(() => { app = require('../src/index'); });

// ── Health ────────────────────────────────────────────────────────────────────────
test('GET /health gibt Status zurück', async () => {
  const res = await request(app).get('/health');
  assert.ok([200, 503].includes(res.status));
  assert.ok(res.body.version);
  assert.ok(res.body.checks);
});

// ── Security Headers (helmet) ─────────────────────────────────────────────────
test('Antworten enthalten X-Content-Type-Options (helmet)', async () => {
  const res = await request(app).get('/api/bewerbungen');
  assert.ok(res.headers['x-content-type-options']);
});

test('Antworten enthalten X-Frame-Options (helmet)', async () => {
  const res = await request(app).get('/api/bewerbungen');
  assert.ok(res.headers['x-frame-options']);
});

// ── Rate-Limiting ─────────────────────────────────────────────────────────────────
test('Rate-Limit Header sind vorhanden', async () => {
  const res = await request(app).get('/api/bewerbungen');
  assert.ok(
    res.headers['ratelimit-limit'] || res.headers['x-ratelimit-limit'],
    'RateLimit Header muss vorhanden sein'
  );
});

// ── Bewerbungen CRUD ──────────────────────────────────────────────────────────────
let bewerbungId;

test('POST /api/bewerbungen erstellt eine Bewerbung (201)', async () => {
  const res = await request(app)
    .post('/api/bewerbungen')
    .send({ titel: 'Linux Administrator', firma: 'Test GmbH', status: 'beworben' });
  assert.equal(res.status, 201);
  assert.ok(res.body.id);
  bewerbungId = res.body.id;
});

test('POST /api/bewerbungen gibt 400 ohne Pflichtfelder', async () => {
  const res = await request(app)
    .post('/api/bewerbungen')
    .send({ ort: 'Remote' });
  assert.equal(res.status, 400);
  assert.ok(res.body.error);
});

test('POST /api/bewerbungen gibt 400 bei ungültigem Status', async () => {
  const res = await request(app)
    .post('/api/bewerbungen')
    .send({ titel: 'Test', firma: 'Firma', status: 'UNGÜLTIG' });
  assert.equal(res.status, 400);
});

test('POST /api/bewerbungen gibt 400 bei zu langem Titel (>200)', async () => {
  const res = await request(app)
    .post('/api/bewerbungen')
    .send({ titel: 'A'.repeat(201), firma: 'Firma' });
  assert.equal(res.status, 400);
});

test('POST /api/bewerbungen gibt 400 bei ungültiger URL', async () => {
  const res = await request(app)
    .post('/api/bewerbungen')
    .send({ titel: 'Test', firma: 'Firma', url: 'kein-link' });
  assert.equal(res.status, 400);
});

test('POST /api/bewerbungen gibt 400 bei Bewertung > 5', async () => {
  const res = await request(app)
    .post('/api/bewerbungen')
    .send({ titel: 'Test', firma: 'Firma', bewertung: 99 });
  assert.equal(res.status, 400);
});

test('GET /api/bewerbungen gibt Array zurück', async () => {
  const res = await request(app).get('/api/bewerbungen');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body));
});

test('GET /api/bewerbungen/:id gibt Bewerbung zurück', async () => {
  const res = await request(app).get(`/api/bewerbungen/${bewerbungId}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.titel, 'Linux Administrator');
  assert.ok(Array.isArray(res.body.kommentare));
});

test('GET /api/bewerbungen/:id gibt 404 für unbekannte ID', async () => {
  const res = await request(app).get('/api/bewerbungen/999999');
  assert.equal(res.status, 404);
});

test('PATCH /api/bewerbungen/:id aktualisiert Status', async () => {
  const res = await request(app)
    .patch(`/api/bewerbungen/${bewerbungId}`)
    .send({ status: 'interview' });
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'interview');
});

test('PATCH /api/bewerbungen/:id gibt 400 bei Bewertung > 5', async () => {
  const res = await request(app)
    .patch(`/api/bewerbungen/${bewerbungId}`)
    .send({ bewertung: 99 });
  assert.equal(res.status, 400);
});

test('PATCH /api/bewerbungen/:id gibt 404 für unbekannte ID', async () => {
  const res = await request(app)
    .patch('/api/bewerbungen/999999')
    .send({ status: 'interview' });
  assert.equal(res.status, 404);
});

// ── Kommentare ────────────────────────────────────────────────────────────────────
let kommentarId;

test('POST /api/bewerbungen/:id/kommentare erstellt Kommentar (201)', async () => {
  const res = await request(app)
    .post(`/api/bewerbungen/${bewerbungId}/kommentare`)
    .send({ text: 'Gesprächsnotiz' });
  assert.equal(res.status, 201);
  assert.ok(res.body.id);
  kommentarId = res.body.id;
});

test('POST /api/bewerbungen/:id/kommentare gibt 400 ohne Text', async () => {
  const res = await request(app)
    .post(`/api/bewerbungen/${bewerbungId}/kommentare`)
    .send({ text: '' });
  assert.equal(res.status, 400);
});

test('POST /api/bewerbungen/:id/kommentare gibt 400 bei zu langem Text', async () => {
  const res = await request(app)
    .post(`/api/bewerbungen/${bewerbungId}/kommentare`)
    .send({ text: 'X'.repeat(2001) });
  assert.equal(res.status, 400);
});

test('DELETE /api/bewerbungen/:id/kommentare/:kid löscht Kommentar (204)', async () => {
  const res = await request(app)
    .delete(`/api/bewerbungen/${bewerbungId}/kommentare/${kommentarId}`);
  assert.equal(res.status, 204);
});

// ── Stats & Export ────────────────────────────────────────────────────────────────
test('GET /api/bewerbungen/stats gibt Stats zurück', async () => {
  const res = await request(app).get('/api/bewerbungen/stats');
  assert.equal(res.status, 200);
  assert.ok(typeof res.body.total === 'number');
  assert.ok(Array.isArray(res.body.byStatus));
  assert.ok(Array.isArray(res.body.followups));
});

test('GET /api/bewerbungen/export/csv gibt CSV zurück', async () => {
  const res = await request(app).get('/api/bewerbungen/export/csv');
  assert.equal(res.status, 200);
  assert.ok(res.headers['content-type'].includes('text/csv'));
  assert.ok(res.headers['content-disposition'].includes('bewerbungen.csv'));
});

// ── DELETE Bewerbung ──────────────────────────────────────────────────────────────
test('DELETE /api/bewerbungen/:id gibt 204 zurück', async () => {
  const res = await request(app).delete(`/api/bewerbungen/${bewerbungId}`);
  assert.equal(res.status, 204);
});

test('GET /api/bewerbungen/:id gibt 404 nach Löschen', async () => {
  const res = await request(app).get(`/api/bewerbungen/${bewerbungId}`);
  assert.equal(res.status, 404);
});

// ── Vault ─────────────────────────────────────────────────────────────────────────
test('GET /api/vault gibt leere Liste zurück', async () => {
  const res = await request(app).get('/api/vault');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body));
});

test('POST /api/vault ohne Datei gibt 400 zurück', async () => {
  const res = await request(app).post('/api/vault').send({});
  assert.equal(res.status, 400);
});

test('GET /api/vault/:id/download gibt 404 für unbekannte ID', async () => {
  const res = await request(app).get('/api/vault/999999/download');
  assert.equal(res.status, 404);
});

// ── Einstellungen ─────────────────────────────────────────────────────────────────
test('GET /api/einstellungen gibt Standard-Einstellungen zurück', async () => {
  const res = await request(app).get('/api/einstellungen');
  assert.equal(res.status, 200);
  assert.ok(res.body.ki_modell);
});

test('PATCH /api/einstellungen aktualisiert KI-Stil', async () => {
  const res = await request(app)
    .patch('/api/einstellungen')
    .send({ ki_stil: 'modern' });
  assert.equal(res.status, 200);
  assert.equal(res.body.ki_stil, 'modern');
});

test('PATCH /api/einstellungen gibt 400 bei ungültigem Wert', async () => {
  const res = await request(app)
    .patch('/api/einstellungen')
    .send({ ki_stil: 'ungueltig' });
  assert.equal(res.status, 400);
});

// ── KI-Route ──────────────────────────────────────────────────────────────────────
test('GET /api/ki/status antwortet', async () => {
  const res = await request(app).get('/api/ki/status');
  assert.ok([200].includes(res.status));
  assert.ok('ok' in res.body);
});

test('POST /api/ki/anschreiben gibt 400 ohne Pflichtfelder', async () => {
  const res = await request(app)
    .post('/api/ki/anschreiben')
    .send({ firma: 'NurFirma' });
  assert.equal(res.status, 400);
});

test('GET /api/ki/verlauf gibt Array zurück', async () => {
  const res = await request(app).get('/api/ki/verlauf');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body));
});

// ── 404 Handler ───────────────────────────────────────────────────────────────────
test('GET /api/nichtvorhanden gibt 404 zurück', async () => {
  const res = await request(app).get('/api/nichtvorhanden');
  assert.equal(res.status, 404);
});

test('Fehlerantworten enthalten niemals Stack-Trace', async () => {
  const res = await request(app).get('/api/bewerbungen/999999');
  assert.ok(!res.body.stack);
});
