const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const db = require('../db/database');

const profilValidator = [
  body('name').optional().trim().isLength({ max: 200 }),
  body('email').optional().trim().isEmail().withMessage('Ungueltige E-Mail-Adresse').normalizeEmail().isLength({ max: 254 }),
  body('rollen').optional().trim().isLength({ max: 500 }),
  body('ort').optional().trim().isLength({ max: 500 }),
  body('keywords').optional().trim().isLength({ max: 1000 }),
  body('blacklist').optional().trim().isLength({ max: 1000 }),
  body('kurzprofil').optional().trim().isLength({ max: 2000 }),
  body('staerken').optional().trim().isLength({ max: 1000 }),
];

router.get('/', (req, res, next) => {
  try {
    const p = db.prepare('SELECT * FROM profil WHERE id=1').get();
    res.json(p || {});
  } catch(e) { next(e); }
});

router.put('/', profilValidator, validate, (req, res, next) => {
  try {
    const { name, email, rollen, ort, keywords, blacklist, kurzprofil, staerken } = req.body;
    db.prepare(`UPDATE profil SET name=?,email=?,rollen=?,ort=?,keywords=?,blacklist=?,kurzprofil=?,staerken=? WHERE id=1`)
      .run(name||'',email||'',rollen||'',ort||'',keywords||'',blacklist||'',kurzprofil||'',staerken||'');
    res.json({ ok: true });
  } catch(e) { next(e); }
});

module.exports = router;
