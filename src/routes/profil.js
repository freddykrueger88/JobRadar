'use strict';

const router = require('express').Router();
const svc    = require('../services/profil.service');

router.get('/',   (req, res, next) => {
  try { res.json(svc.get()); }
  catch (e) { next(e); }
});

router.patch('/', (req, res, next) => {
  try { res.json(svc.update(req.body)); }
  catch (e) { next(e); }
});

module.exports = router;
