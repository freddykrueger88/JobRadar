'use strict';

const router  = require('express').Router();
const svc     = require('../services/bewerbungen.service');
const { validate } = require('../middleware/validate');
const { BewerbungCreateSchema, BewerbungUpdateSchema, KommentarSchema } = require('../schemas/bewerbung.schema');

// Liste
router.get('/', (req, res, next) => {
  try {
    const { archiviert, status, firma, limit, offset } = req.query;
    res.json(svc.getAll({ archiviert, status, firma, limit: +limit || 100, offset: +offset || 0 }));
  } catch (e) { next(e); }
});

// Statistiken
router.get('/stats', (req, res, next) => {
  try { res.json(svc.getStats()); }
  catch (e) { next(e); }
});

// CSV-Export
router.get('/export/csv', (req, res, next) => {
  try {
    const rows = svc.exportCsv();
    const headers = Object.keys(rows[0] || {});
    const csv = [
      headers.join(','),
      ...rows.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="bewerbungen.csv"');
    res.send(csv);
  } catch (e) { next(e); }
});

// Einzelne Bewerbung
router.get('/:id', (req, res, next) => {
  try {
    const b = svc.getById(+req.params.id);
    if (!b) return res.status(404).json({ error: 'Nicht gefunden' });
    res.json(b);
  } catch (e) { next(e); }
});

// Erstellen
router.post('/', validate(BewerbungCreateSchema), (req, res, next) => {
  try { res.status(201).json(svc.create(req.body)); }
  catch (e) { next(e); }
});

// Aktualisieren
router.patch('/:id', validate(BewerbungUpdateSchema), (req, res, next) => {
  try {
    const b = svc.update(+req.params.id, req.body);
    if (!b) return res.status(404).json({ error: 'Nicht gefunden' });
    res.json(b);
  } catch (e) { next(e); }
});

// Löschen
router.delete('/:id', (req, res, next) => {
  try { svc.remove(+req.params.id); res.status(204).end(); }
  catch (e) { next(e); }
});

// Kommentar hinzufügen
router.post('/:id/kommentare', validate(KommentarSchema), (req, res, next) => {
  try { res.status(201).json(svc.addKommentar(+req.params.id, req.body.text)); }
  catch (e) { next(e); }
});

// Kommentar löschen
router.delete('/:id/kommentare/:kid', (req, res, next) => {
  try { svc.deleteKommentar(+req.params.kid); res.status(204).end(); }
  catch (e) { next(e); }
});

module.exports = router;
