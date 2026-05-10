'use strict';

const router = require('express').Router();
const svc    = require('../services/suche.service');

router.get('/', async (req, res, next) => {
  try {
    const { q, ort, umkreis, quellen } = req.query;
    const ergebnisse = await svc.suche({
      suchbegriff: q,
      ort,
      umkreis: umkreis ? +umkreis : undefined,
      quellen: quellen ? quellen.split(',') : undefined
    });
    res.json(ergebnisse);
  } catch (e) { next(e); }
});

module.exports = router;
