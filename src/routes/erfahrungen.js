const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const db = require('../db/database');

const erfahrungenValidator = [
  body('skills').optional().isArray({ max: 200 }),
  body('skills.*.name').optional().trim().isLength({ max: 100 }),
  body('skills.*.level').optional().isIn(['Anfänger', 'Fortgeschritten', 'Experte']),
  body('stationen').optional().isArray({ max: 50 }),
  body('stationen.*.firma').optional().trim().isLength({ max: 200 }),
  body('stationen.*.rolle').optional().trim().isLength({ max: 200 }),
  body('stationen.*.von').optional().trim().isLength({ max: 10 }),
  body('stationen.*.bis').optional().trim().isLength({ max: 10 }),
  body('stationen.*.taetigkeiten').optional().trim().isLength({ max: 5000 }),
  body('zertifikate').optional().isArray({ max: 100 }),
  body('zertifikate.*.titel').optional().trim().isLength({ max: 300 }),
  body('zertifikate.*.jahr').optional().trim().isLength({ max: 4 }),
  body('zertifikate.*.institution').optional().trim().isLength({ max: 200 }),
];

router.get('/', (req, res, next) => {
  try {
    const row = db.prepare('SELECT * FROM erfahrungen WHERE id=1').get();
    if (!row) return res.json({ skills: [], stationen: [], zertifikate: [] });
    res.json({
      skills:      JSON.parse(row.skills      || '[]'),
      stationen:   JSON.parse(row.stationen   || '[]'),
      zertifikate: JSON.parse(row.zertifikate || '[]'),
    });
  } catch(e) { next(e); }
});

router.put('/', erfahrungenValidator, validate, (req, res, next) => {
  try {
    const { skills, stationen, zertifikate } = req.body;
    const row = db.prepare('SELECT id FROM erfahrungen WHERE id=1').get();
    if (row) {
      db.prepare(`UPDATE erfahrungen SET
        skills=COALESCE(?,skills),
        stationen=COALESCE(?,stationen),
        zertifikate=COALESCE(?,zertifikate),
        aktualisiert_am=datetime('now')
        WHERE id=1`
      ).run(
        skills      != null ? JSON.stringify(skills)      : null,
        stationen   != null ? JSON.stringify(stationen)   : null,
        zertifikate != null ? JSON.stringify(zertifikate) : null,
      );
    } else {
      db.prepare(`INSERT INTO erfahrungen (id, skills, stationen, zertifikate) VALUES (1,?,?,?)`)
        .run(JSON.stringify(skills||[]), JSON.stringify(stationen||[]), JSON.stringify(zertifikate||[]));
    }
    res.json({ ok: true });
  } catch(e) { next(e); }
});

module.exports = router;
