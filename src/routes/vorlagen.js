const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { validate } = require('../middleware/validate');
const db = require('../db/database');

const vorlagenValidator = [
  body('name').trim().notEmpty().withMessage('Name ist erforderlich').isLength({ max: 200 }),
  body('einleitung').optional().trim().isLength({ max: 5000 }),
  body('schluss').optional().trim().isLength({ max: 2000 }),
];

router.get('/', (req, res, next) => {
  try {
    res.json(db.prepare('SELECT * FROM vorlagen ORDER BY id').all());
  } catch(e) { next(e); }
});

router.post('/', vorlagenValidator, validate, (req, res, next) => {
  try {
    const { name, einleitung, schluss } = req.body;
    const r = db.prepare('INSERT INTO vorlagen (name,einleitung,schluss) VALUES (?,?,?)').run(
      name||'Neu', einleitung||'', schluss||''
    );
    res.json({ id: r.lastInsertRowid });
  } catch(e) { next(e); }
});

router.delete('/:id', param('id').isInt({ min: 1 }).withMessage('Ungueltige ID'), validate, (req, res, next) => {
  try {
    const r = db.prepare('DELETE FROM vorlagen WHERE id=?').run(req.params.id);
    if (r.changes === 0) return res.status(404).json({ error: 'Vorlage nicht gefunden' });
    res.json({ ok: true });
  } catch(e) { next(e); }
});

module.exports = router;
