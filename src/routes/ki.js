'use strict';

const router = require('express').Router();
const svc    = require('../services/ki.service');

// Status + verfügbare Modelle
router.get('/status', async (req, res, next) => {
  try { res.json(await svc.pruefeStatus()); }
  catch (e) { next(e); }
});

router.get('/modelle', async (req, res, next) => {
  try { res.json(await svc.getVerfuegbareModelle()); }
  catch (e) { next(e); }
});

// Anschreiben generieren
router.post('/anschreiben', async (req, res, next) => {
  try {
    const { titel, firma, stellenbeschreibung, bewerbungId } = req.body;
    if (!titel || !firma) return res.status(400).json({ error: 'titel und firma sind Pflichtfelder' });
    res.json(await svc.generiereAnschreiben({ titel, firma, stellenbeschreibung, bewerbungId }));
  } catch (e) { next(e); }
});

// Verlauf
router.get('/verlauf', (req, res, next) => {
  try { res.json(svc.getVerlauf(+req.query.limit || 20)); }
  catch (e) { next(e); }
});

module.exports = router;
