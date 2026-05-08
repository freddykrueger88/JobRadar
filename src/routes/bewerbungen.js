const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { validate } = require('../middleware/validate');
const db = require('../db/database');

const bewerbungBody = [
  body('titel').trim().notEmpty().withMessage('Titel ist erforderlich').isLength({ max: 200 }),
  body('firma').trim().notEmpty().withMessage('Firma ist erforderlich').isLength({ max: 200 }),
  body('ort').optional().trim().isLength({ max: 200 }),
  body('quelle').optional().trim().isLength({ max: 200 }),
  body('url').optional().trim().isURL({ require_protocol: true }).withMessage('Ungueltige URL').isLength({ max: 2000 }),
  body('status').optional().isIn(['beworben','interview','angenommen','abgelehnt']),
  body('bewertung').optional({ nullable: true }).isInt({ min: 1, max: 5 }),
  body('beworben_am').optional().isDate(),
  body('followup_datum').optional().isDate(),
  body('notizen').optional().trim().isLength({ max: 5000 }),
  body('anschreiben').optional().trim().isLength({ max: 20000 }),
];

// ACHTUNG Reihenfolge: spezifische Routen (/stats/*, /export/*) MUESSEN vor /:id stehen!

router.get('/stats/overview', (req, res, next) => {
  try {
    const today = new Date().toISOString().slice(0,10);
    const total = db.prepare("SELECT COUNT(*) as c FROM bewerbungen WHERE archiviert=0").get().c;
    const byStatus = db.prepare("SELECT status, COUNT(*) as c FROM bewerbungen WHERE archiviert=0 GROUP BY status").all();
    const overdue = db.prepare("SELECT COUNT(*) as c FROM bewerbungen WHERE archiviert=0 AND followup_datum < ? AND status != 'angenommen'").get(today).c;
    res.json({ total, byStatus, overdue });
  } catch(e) { next(e); }
});

router.get('/export/csv', (req, res, next) => {
  try {
    const rows = db.prepare('SELECT * FROM bewerbungen ORDER BY beworben_am DESC').all();
    const header = ['id','titel','firma','ort','quelle','url','status','beworben_am','followup_datum','bewertung','notizen','archiviert'];
    const csv = [header.join(','), ...rows.map(r => header.map(k => '"'+(String(r[k]||'').replace(/"/g,'""'))+'"').join(','))].join('\n');
    res.setHeader('Content-Type','text/csv;charset=utf-8');
    res.setHeader('Content-Disposition','attachment;filename="bewerbungen.csv"');
    res.send(csv);
  } catch(e) { next(e); }
});

router.get('/', (req, res, next) => {
  try {
    const { status, firma, archiviert } = req.query;
    let query = 'SELECT * FROM bewerbungen WHERE 1=1';
    const params = [];
    if (status) { query += ' AND status = ?'; params.push(status); }
    if (firma)  { query += ' AND LOWER(firma) LIKE ?'; params.push('%'+firma.toLowerCase()+'%'); }
    query += archiviert === '1' ? ' AND archiviert = 1' : ' AND archiviert = 0';
    query += ' ORDER BY beworben_am DESC';
    res.json(db.prepare(query).all(...params));
  } catch(e) { next(e); }
});

router.post('/', bewerbungBody, validate, (req, res, next) => {
  try {
    const { titel, firma, ort, quelle, url, status, beworben_am, followup_datum, notizen, anschreiben } = req.body;
    const r = db.prepare(`INSERT INTO bewerbungen (titel,firma,ort,quelle,url,status,beworben_am,followup_datum,notizen,anschreiben)
      VALUES (?,?,?,?,?,?,?,?,?,?)`).run(
      titel, firma, ort||'', quelle||'', url||'', status||'beworben',
      beworben_am||new Date().toISOString().slice(0,10),
      followup_datum||'', notizen||'', anschreiben||''
    );
    db.prepare('INSERT INTO kommentare (bewerbung_id, text) VALUES (?, ?)').run(r.lastInsertRowid, 'Bewerbung eingereicht');
    res.json({ id: r.lastInsertRowid });
  } catch(e) { next(e); }
});

router.put('/:id',
  param('id').isInt(),
  ...bewerbungBody.map(v => v.optional()),
  validate,
  (req, res, next) => {
    try {
      const prev = db.prepare('SELECT status FROM bewerbungen WHERE id=?').get(req.params.id);
      if (!prev) return res.status(404).json({ error: 'Bewerbung nicht gefunden' });
      const { status, followup_datum, bewertung, notizen, anschreiben, archiviert } = req.body;
      // Explizite null-Checks statt ||null damit leere Strings (z.B. Notizen loeschen) korrekt gespeichert werden
      db.prepare(`UPDATE bewerbungen SET
        status=COALESCE(?,status), followup_datum=COALESCE(?,followup_datum),
        bewertung=COALESCE(?,bewertung), notizen=COALESCE(?,notizen),
        anschreiben=COALESCE(?,anschreiben), archiviert=COALESCE(?,archiviert),
        aktualisiert_am=datetime('now') WHERE id=?`
      ).run(
        status != null ? status : null,
        followup_datum != null ? followup_datum : null,
        bewertung != null ? bewertung : null,
        notizen != null ? notizen : null,
        anschreiben != null ? anschreiben : null,
        archiviert != null ? archiviert : null,
        req.params.id
      );
      if (status && prev && status !== prev.status) {
        db.prepare('INSERT INTO kommentare (bewerbung_id, text) VALUES (?, ?)').run(req.params.id, 'Status geändert: '+prev.status+' → '+status);
      }
      res.json({ ok: true });
    } catch(e) { next(e); }
  }
);

router.delete('/:id', param('id').isInt(), validate, (req, res, next) => {
  try {
    db.prepare('DELETE FROM bewerbungen WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  } catch(e) { next(e); }
});

router.get('/:id/kommentare', param('id').isInt(), validate, (req, res, next) => {
  try {
    res.json(db.prepare('SELECT * FROM kommentare WHERE bewerbung_id=? ORDER BY erstellt_am ASC').all(req.params.id));
  } catch(e) { next(e); }
});

router.post('/:id/kommentare',
  param('id').isInt(),
  body('text').trim().notEmpty().isLength({ max: 2000 }),
  validate,
  (req, res, next) => {
    try {
      const r = db.prepare('INSERT INTO kommentare (bewerbung_id, text) VALUES (?, ?)').run(req.params.id, req.body.text);
      res.json({ id: r.lastInsertRowid });
    } catch(e) { next(e); }
  }
);

router.delete('/:bewId/kommentare/:id', param('bewId').isInt(), param('id').isInt(), validate, (req, res, next) => {
  try {
    db.prepare('DELETE FROM kommentare WHERE id=? AND bewerbung_id=?').run(req.params.id, req.params.bewId);
    res.json({ ok: true });
  } catch(e) { next(e); }
});

module.exports = router;
