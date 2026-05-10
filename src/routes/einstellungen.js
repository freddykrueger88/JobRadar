'use strict';

const router = require('express').Router();
const svc    = require('../services/einstellungen.service');
const { validate } = require('../middleware/validate');
const { EinstellungenSchema } = require('../schemas/einstellungen.schema');

router.get('/',  (req, res, next) => {
  try { res.json(svc.get()); }
  catch (e) { next(e); }
});

router.patch('/', validate(EinstellungenSchema), (req, res, next) => {
  try { res.json(svc.update(req.body)); }
  catch (e) { next(e); }
});

module.exports = router;
