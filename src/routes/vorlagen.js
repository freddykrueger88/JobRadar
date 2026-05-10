'use strict';

const router = require('express').Router();
const svc    = require('../services/vorlagen.service');
const { validate }           = require('../middleware/validate');
const { parseId }            = require('../middleware/parseId');
const { VorlageCreateSchema } = require('../schemas/vorlage.schema');

// Alle Vorlagen
router.get('/', (req, res, next) => {
  try { res.json(svc.getAll()); }
  catch (e) { next(e); }
});

// Vorlage erstellen
router.post('/', validate(VorlageCreateSchema), (req, res, next) => {
  try { res.status(201).json(svc.create(req.body)); }
  catch (e) { next(e); }
});

// Vorlage löschen
router.delete('/:id', (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Ungültige ID' });
    const deleted = svc.remove(id);
    if (!deleted) return res.status(404).json({ error: 'Vorlage nicht gefunden' });
    res.status(204).end();
  } catch (e) { next(e); }
});

module.exports = router;
