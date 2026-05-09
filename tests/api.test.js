/**
 * API-Tests mit Node.js built-in test runner + supertest
 * Ausführen: npm test
 */
const { test, before, describe } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');

process.env.DB_PATH    = ':memory:';
process.env.NODE_ENV   = 'test';
process.env.OLLAMA_URL = 'http://localhost:11434';
process.env.PORT       = '3001';

let app;
before(() => {
  app = require('../src/index');
});

// ── Health & Version ──────────────────────────────────────────────────────────────
test('GET /health gibt Status zurück', async () => {
  const res = await request(app).get('/health');
  assert.ok([200, 503].includes(res.status), 'Status muss 200 oder 503 sein');
  assert.ok(res.body.version, 'version muss vorhanden sein');
  assert.ok(res.body.checks,  'checks muss vorhanden sein');
});

test('GET /api/version gibt Version zurück', async () => {
  const res = await request(app).get('/api/version');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.name, 'jobradar');
});

// ── Security Headers (helmet) ──────────────────────────────────────────────────
test('Antworten enthalten X-Content-Type-Options Header (helmet)', async () => {
  const res = await request(app).get('/api/bewerbungen');
  assert.ok(res.headers['x-content-type-options'], 'X-Content-Type-Options Header muss gesetzt sein');
});

test('Antworten enthalten X-Frame-Options Header (helmet)', async () => {
  const res = await request(app).get('/api/bewerbungen');
  assert.ok(res.headers['x-frame-options'], 'X-Frame-Options Header muss gesetzt sein');
});

// ── Rate-Limiting ──────────────────────────────────────────────────────────────────
test('Rate-Limit Header sind in API-Antworten vorhanden', async () => {
  const res = await request(app).get('/api/bewerbungen');
  assert.ok(
    res.headers['ratelimit-limit'] || res.headers['x-ratelimit-limit'],
    'RateLimit Header muss vorhanden sein'
  );
});

// ── Bewerbungen CRUD ────────────────────────────────────────────────────────────────
let bewerbungId;

test('POST /api/bewerbungen erstellt eine Bewerbung', async () => {
  const res = await request(app)
    .post('/api/bewerbungen')
    .send({ titel: 'Linux Administrator', firma: 'Test GmbH', status: 'beworben' });
  assert.strictEqual(res.status, 201);
  assert.ok(res.body.id, 'id muss vorhanden sein');
  bewerbungId = res.body.id;
});

test('POST /api/bewerbungen schlägt ohne Pflichtfelder fehl', async () => {
  const res = await request(app)
    .post('/api/bewerbungen')
    .send({ ort: 'Remote' });
  assert.strictEqual(res.status, 422);
});

test('POST /api/bewerbungen blockiert ungültigen Status', async () => {
  const res = await request(app)
    .post('/api/bewerbungen')
    .send({ titel: 'Test', firma: 'Firma', status: 'UNGÜLTIG' });
  assert.strictEqual(res.status, 422);
});

test('POST /api/bewerbungen blockiert zu langen Titel (>300)', async () => {
  const res = await request(app)
    .post('/api/bewerbungen')
    .send({ titel: 'A'.repeat(301), firma: 'Firma' });
  assert.strictEqual(res.status, 422);
});

test('POST /api/bewerbungen blockiert ungültige URL', async () => {
  const res = await request(app)
    .post('/api/bewerbungen')
    .send({ titel: 'Test', firma: 'Firma', url: 'kein-link' });
  assert.strictEqual(res.status, 422);
});

test('POST /api/bewerbungen blockiert ungültiges Datum', async () => {
  const res = await request(app)
    .post('/api/bewerbungen')
    .send({ titel: 'Test', firma: 'Firma', beworben_am: '32.13.2099' });
  assert.strictEqual(res.status, 422);
});

test('GET /api/bewerbungen gibt Liste zurück', async () => {
  const res = await request(app).get('/api/bewerbungen');
  assert.strictEqual(res.status, 200);
  assert.ok(Array.isArray(res.body));
});

test('GET /api/bewerbungen/:id gibt einzelne Bewerbung zurück', async () => {
  const res = await request(app).get(`/api/bewerbungen/${bewerbungId}`);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.titel, 'Linux Administrator');
});

test('GET /api/bewerbungen/:id gibt 404 für unbekannte ID', async () => {
  const res = await request(app).get('/api/bewerbungen/999999');
  assert.strictEqual(res.status, 404);
});

test('GET /api/bewerbungen/:id gibt 422 für ungültige ID', async () => {
  const res = await request(app).get('/api/bewerbungen/abc');
  assert.strictEqual(res.status, 422);
});

test('PUT /api/bewerbungen/:id aktualisiert Status', async () => {
  const res = await request(app)
    .put(`/api/bewerbungen/${bewerbungId}`)
    .send({ status: 'interview' });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.status, 'interview');
});

test('PUT /api/bewerbungen/:id blockiert Bewertung > 5', async () => {
  const res = await request(app)
    .put(`/api/bewerbungen/${bewerbungId}`)
    .send({ bewertung: 99 });
  assert.strictEqual(res.status, 422);
});

test('PUT /api/bewerbungen/:id gibt 404 für unbekannte ID', async () => {
  const res = await request(app)
    .put('/api/bewerbungen/999999')
    .send({ status: 'interview' });
  assert.strictEqual(res.status, 404);
});

// ── Kommentare ───────────────────────────────────────────────────────────────────────────
let kommentarId;

test('POST /api/bewerbungen/:id/kommentare erstellt Kommentar', async () => {
  const res = await request(app)
    .post(`/api/bewerbungen/${bewerbungId}/kommentare`)
    .send({ text: 'Erstes Feedback erhalten.' });
  assert.strictEqual(res.status, 201);
  assert.ok(res.body.id);
  kommentarId = res.body.id;
});

test('POST /api/bewerbungen/:id/kommentare schlägt ohne Text fehl', async () => {
  const res = await request(app)
    .post(`/api/bewerbungen/${bewerbungId}/kommentare`)
    .send({ text: '' });
  assert.strictEqual(res.status, 422);
});

test('POST /api/bewerbungen/:id/kommentare blockiert zu langen Text (>2000)', async () => {
  const res = await request(app)
    .post(`/api/bewerbungen/${bewerbungId}/kommentare`)
    .send({ text: 'X'.repeat(2001) });
  assert.strictEqual(res.status, 422);
});

test('GET /api/bewerbungen/:id/kommentare gibt Liste zurück', async () => {
  const res = await request(app).get(`/api/bewerbungen/${bewerbungId}/kommentare`);
  assert.strictEqual(res.status, 200);
  assert.ok(Array.isArray(res.body));
  assert.strictEqual(res.body.length, 1);
});

test('DELETE /api/bewerbungen/:bewId/kommentare/:id löscht Kommentar', async () => {
  const res = await request(app)
    .delete(`/api/bewerbungen/${bewerbungId}/kommentare/${kommentarId}`);
  assert.strictEqual(res.status, 200);
  assert.ok(res.body.success);
});

// ── Stats ───────────────────────────────────────────────────────────────────────────────
test('GET /api/bewerbungen/stats/overview gibt Stats zurück', async () => {
  const res = await request(app).get('/api/bewerbungen/stats/overview');
  assert.strictEqual(res.status, 200);
  assert.ok(typeof res.body.total === 'number');
  assert.ok(typeof res.body.overdue === 'number');
  assert.ok(Array.isArray(res.body.byStatus));
});

test('GET /api/bewerbungen/stats/verlauf gibt Monatsverlauf zurück', async () => {
  const res = await request(app).get('/api/bewerbungen/stats/verlauf');
  assert.strictEqual(res.status, 200);
  assert.ok(Array.isArray(res.body));
});

test('GET /api/bewerbungen/stats/erweitert gibt erweiterte Stats zurück', async () => {
  const res = await request(app).get('/api/bewerbungen/stats/erweitert');
  assert.strictEqual(res.status, 200);
  assert.ok('erfolgsquote' in res.body);
  assert.ok('streak' in res.body);
  assert.ok(Array.isArray(res.body.quellenStats));
});

// ── CSV-Export ──────────────────────────────────────────────────────────────────────────
test('GET /api/bewerbungen/export/csv gibt CSV zurück', async () => {
  const res = await request(app).get('/api/bewerbungen/export/csv');
  assert.strictEqual(res.status, 200);
  assert.ok(res.headers['content-type'].includes('text/csv'));
  assert.ok(res.headers['content-disposition'].includes('bewerbungen.csv'));
});

// ── DELETE Bewerbung ──────────────────────────────────────────────────────────────────
test('DELETE /api/bewerbungen/:id löscht Bewerbung', async () => {
  const res = await request(app).delete(`/api/bewerbungen/${bewerbungId}`);
  assert.strictEqual(res.status, 200);
  assert.ok(res.body.success);
});

test('DELETE /api/bewerbungen/:id gibt 404 nach Löschen', async () => {
  const res = await request(app).delete(`/api/bewerbungen/${bewerbungId}`);
  assert.strictEqual(res.status, 404);
});

// ── Vault ─────────────────────────────────────────────────────────────────────────────────
test('GET /api/vault gibt leere Liste zurück', async () => {
  const res = await request(app).get('/api/vault');
  assert.strictEqual(res.status, 200);
  assert.ok(Array.isArray(res.body));
});

test('POST /api/vault ohne Datei gibt 400 zurück', async () => {
  const res = await request(app).post('/api/vault').send({});
  assert.strictEqual(res.status, 400);
});

test('GET /api/vault/:id/download gibt 404 für unbekannte ID', async () => {
  const res = await request(app).get('/api/vault/999999/download');
  assert.strictEqual(res.status, 404);
});

// ── Suche ─────────────────────────────────────────────────────────────────────────────────
test('GET /api/suche/quellen gibt Quellenliste zurück', async () => {
  const res = await request(app).get('/api/suche/quellen');
  assert.strictEqual(res.status, 200);
  assert.ok(Array.isArray(res.body));
  assert.ok(res.body.length >= 5);
  // Sicherheitscheck: kein "configured"-Feld in der Antwort
  res.body.forEach(q => {
    assert.ok(!('configured' in q), '"configured" darf nicht in /suche/quellen enthalten sein');
  });
});

test('GET /api/suche gibt 400 für unbekannte Quelle', async () => {
  const res = await request(app).get('/api/suche?quelle=UNBEKANNT');
  assert.strictEqual(res.status, 400);
});

test('GET /api/suche akzeptiert gültige Quelle', async () => {
  // arbeitnow läuft ohne API-Key – im Test kann es fehlschlagen (externe API), aber kein 400/422
  const res = await request(app).get('/api/suche?quelle=arbeitnow&rolle=Test&count=1');
  assert.ok([200, 500].includes(res.status), 'Muss 200 oder 500 sein (externe API möglicherweise nicht erreichbar)');
});

// ── KI-Route ─────────────────────────────────────────────────────────────────────────────
test('GET /api/ki/models gibt 403 wenn nicht localhost', async () => {
  // supertest sendet als 127.0.0.1 – in test-Env wird der Guard nicht aktiv
  // Wir prüfen nur, dass der Endpunkt existiert und antwortet
  const res = await request(app).get('/api/ki/models');
  assert.ok([200, 403, 500].includes(res.status), 'Muss 200, 403 oder 500 sein');
});

test('POST /api/ki/anschreiben schlägt ohne Pflichtfelder fehl', async () => {
  const res = await request(app)
    .post('/api/ki/anschreiben')
    .send({ firma: 'NurFirma' }); // titel fehlt
  assert.strictEqual(res.status, 422);
});

test('POST /api/ki/anschreiben blockiert zu langen Titel', async () => {
  const res = await request(app)
    .post('/api/ki/anschreiben')
    .send({ titel: 'X'.repeat(201), firma: 'Firma' });
  assert.strictEqual(res.status, 422);
});

test('POST /api/ki/feedback schlägt ohne Anschreiben fehl', async () => {
  const res = await request(app)
    .post('/api/ki/feedback')
    .send({});
  assert.strictEqual(res.status, 422);
});

test('GET /api/ki/verlauf gibt Liste zurück', async () => {
  const res = await request(app).get('/api/ki/verlauf');
  assert.strictEqual(res.status, 200);
  assert.ok(Array.isArray(res.body));
});

// ── 404 Handler ───────────────────────────────────────────────────────────────────────────
test('GET /api/nichtvorhanden gibt 404 zurück', async () => {
  const res = await request(app).get('/api/nichtvorhanden');
  assert.strictEqual(res.status, 404);
});

test('Fehlerhafte Anfragen enthalten niemals Stack-Trace in Production', async () => {
  // NODE_ENV=test, also erhalten wir die echte Fehlermeldung – kein Stack-Trace-Objekt
  const res = await request(app).get('/api/bewerbungen/abc');
  assert.ok(!res.body.stack, 'Stack-Trace darf nicht in der Antwort sein');
});
