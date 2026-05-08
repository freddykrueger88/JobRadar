const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { validate } = require('../middleware/validate');
const db = require('../db/database');

const vorlagenValidator = [
  body('name').trim().notEmpty().withMessage('Name ist erforderlich').isLength({ max: 200 }),
  body('ton').optional().trim().isIn(['formell','modern','kreativ','kurz']),
  body('sprache').optional().trim().isIn(['deutsch','englisch']),
  body('laenge').optional().trim().isIn(['kurz','mittel','lang']),
  body('hinweise').optional().trim().isLength({ max: 1000 }),
];

router.get('/', (req, res, next) => {
  try {
    res.json(db.prepare('SELECT id,name,ton,sprache,laenge,hinweise,erstellt_am FROM vorlagen ORDER BY id').all());
  } catch(e) { next(e); }
});

router.post('/', vorlagenValidator, validate, (req, res, next) => {
  try {
    const { name, ton, sprache, laenge, hinweise } = req.body;
    const r = db.prepare('INSERT INTO vorlagen (name,ton,sprache,laenge,hinweise) VALUES (?,?,?,?,?)').run(
      name, ton||'formell', sprache||'deutsch', laenge||'mittel', hinweise||''
    );
    res.json({ id: r.lastInsertRowid });
  } catch(e) { next(e); }
});

router.delete('/:id', param('id').isInt({ min: 1 }), validate, (req, res, next) => {
  try {
    const r = db.prepare('DELETE FROM vorlagen WHERE id=?').run(req.params.id);
    if (r.changes === 0) return res.status(404).json({ error: 'Stil nicht gefunden' });
    res.json({ ok: true });
  } catch(e) { next(e); }
});

module.exports = router;
