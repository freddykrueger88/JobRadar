const express   = require('express');
const router    = express.Router();
const { body, param, query } = require('express-validator');
const { validate } = require('../middleware/validate');
const db        = require('../db/database');

const VALID_STATUS = ['beworben','interview','angenommen','abgelehnt'];

// ── Validatoren ───────────────────────────────────────────────────────────────────
const postValidator = [
  body('titel').trim().notEmpty().withMessage('Titel ist Pflichtfeld.').isLength({ max: 300 }),
  body('firma').trim().notEmpty().withMessage('Firma ist Pflichtfeld.').isLength({ max: 300 }),
  body('ort').optional().trim().isLength({ max: 200 }),
  body('quelle').optional().trim().isLength({ max: 100 }),
  body('url').optional().trim().isURL({ require_protocol: true }).withMessage('Ungültige URL.').isLength({ max: 1000 }),
  body('status').optional().isIn(VALID_STATUS).withMessage('Ungültiger Status.'),
  body('beworben_am').optional().trim().isISO8601().withMessage('Ungültiges Datum (beworben_am).'),
  body('followup_datum').optional().trim().isISO8601().withMessage('Ungültiges Datum (followup_datum).'),
  body('notizen').optional().trim().isLength({ max: 5000 }),
  body('stellenbeschreibung').optional().trim().isLength({ max: 5000 }),
  body('lebenslauf_id').optional().isInt({ min: 1 }),
];

const putValidator = [
  param('id').isInt({ min: 1 }).withMessage('Ungültige ID.'),
  body('titel').optional().trim().notEmpty().isLength({ max: 300 }),
  body('firma').optional().trim().notEmpty().isLength({ max: 300 }),
  body('ort').optional().trim().isLength({ max: 200 }),
  body('url').optional().trim().isURL({ require_protocol: true }).withMessage('Ungültige URL.').isLength({ max: 1000 }),
  body('status').optional().isIn(VALID_STATUS).withMessage('Ungültiger Status.'),
  body('beworben_am').optional().trim().isISO8601().withMessage('Ungültiges Datum (beworben_am).'),
  body('followup_datum').optional({ nullable: true }).trim().isISO8601().withMessage('Ungültiges Datum (followup_datum).'),
  body('notizen').optional().trim().isLength({ max: 5000 }),
  body('bewertung').optional().isInt({ min: 0, max: 5 }).withMessage('Bewertung muss zwischen 0 und 5 liegen.'),
  body('archiviert').optional().isInt({ min: 0, max: 1 }),
  body('stellenbeschreibung').optional().trim().isLength({ max: 5000 }),
  body('lebenslauf_id').optional({ nullable: true }).isInt({ min: 1 }),
];

const idValidator = [
  param('id').isInt({ min: 1 }).withMessage('Ungültige ID.'),
];

const listValidator = [
  query('status').optional().isIn([...VALID_STATUS, '']),
  query('firma').optional().trim().isLength({ max: 200 }),
  query('archiviert').optional().isIn(['0', '1']),
];

const kommentarValidator = [
  param('id').isInt({ min: 1 }),
  body('text').trim().notEmpty().withMessage('Text fehlt.').isLength({ max: 2000 }),
];

// ── GET /api/bewerbungen ───────────────────────────────────────────────────────────────────
router.get('/', listValidator, validate, (req, res) => {
  const { status, firma, archiviert } = req.query;
  let sql = 'SELECT * FROM bewerbungen WHERE 1=1';
  const params = [];
  if (status)  { sql += ' AND status = ?';    params.push(status); }
  if (firma)   { sql += ' AND firma LIKE ?';  params.push('%' + firma + '%'); }
  sql += ' AND archiviert = ?';
  params.push(archiviert === '1' ? 1 : 0);
  sql += ' ORDER BY erstellt_am DESC';
  res.json(db.prepare(sql).all(...params));
});

// ── GET /api/bewerbungen/stats/overview ─────────────────────────────────────────────
router.get('/stats/overview', (req, res) => {
  const total   = db.prepare('SELECT COUNT(*) as c FROM bewerbungen WHERE archiviert=0').get().c;
  const overdue = db.prepare("SELECT COUNT(*) as c FROM bewerbungen WHERE archiviert=0 AND status!='angenommen' AND followup_datum < date('now')").get().c;
  const byStatus = db.prepare('SELECT status, COUNT(*) as c FROM bewerbungen WHERE archiviert=0 GROUP BY status').all();
  const dokCount = db.prepare('SELECT COUNT(*) as c FROM dokumente').get().c;
  res.json({ total, overdue, byStatus, dokCount });
});

// ── GET /api/bewerbungen/stats/verlauf ───────────────────────────────────────────────
router.get('/stats/verlauf', (req, res) => {
  const rows = db.prepare(`
    SELECT strftime('%Y-%m', beworben_am) as monat, COUNT(*) as anzahl
    FROM bewerbungen
    WHERE beworben_am IS NOT NULL
    GROUP BY monat
    ORDER BY monat ASC
  `).all();
  res.json(rows);
});

// ── GET /api/bewerbungen/stats/erweitert ─────────────────────────────────────────────
router.get('/stats/erweitert', (req, res) => {
  const abgeschlossen = db.prepare(
    "SELECT COUNT(*) as c FROM bewerbungen WHERE status IN ('angenommen','abgelehnt') AND archiviert=0"
  ).get().c;
  const angenommen = db.prepare(
    "SELECT COUNT(*) as c FROM bewerbungen WHERE status='angenommen' AND archiviert=0"
  ).get().c;
  const erfolgsquote = abgeschlossen > 0 ? Math.round((angenommen / abgeschlossen) * 100) : null;

  const mitInterview = db.prepare(
    "SELECT COUNT(*) as c FROM bewerbungen WHERE status IN ('interview','angenommen') AND archiviert=0"
  ).get().c;
  const total = db.prepare('SELECT COUNT(*) as c FROM bewerbungen WHERE archiviert=0').get().c;
  const interviewQuote = total > 0 ? Math.round((mitInterview / total) * 100) : null;

  const zeitBisInterview = db.prepare(`
    SELECT ROUND(AVG(julianday(aktualisiert_am) - julianday(beworben_am)), 1) as avg_tage
    FROM bewerbungen
    WHERE status IN ('interview','angenommen')
    AND beworben_am IS NOT NULL AND beworben_am != '' AND archiviert=0
  `).get().avg_tage;

  const zeitBisAbsage = db.prepare(`
    SELECT ROUND(AVG(julianday(aktualisiert_am) - julianday(beworben_am)), 1) as avg_tage
    FROM bewerbungen
    WHERE status='abgelehnt'
    AND beworben_am IS NOT NULL AND beworben_am != '' AND archiviert=0
  `).get().avg_tage;

  const quellenStats = db.prepare(`
    SELECT quelle, COUNT(*) as gesamt,
      SUM(CASE WHEN status='angenommen' THEN 1 ELSE 0 END) as angenommen,
      SUM(CASE WHEN status='interview'  THEN 1 ELSE 0 END) as interview,
      SUM(CASE WHEN status='abgelehnt'  THEN 1 ELSE 0 END) as abgelehnt
    FROM bewerbungen WHERE archiviert=0
    GROUP BY quelle ORDER BY gesamt DESC LIMIT 8
  `).all();

  const wochentagHeatmap = db.prepare(`
    SELECT CAST(strftime('%w', beworben_am) AS INTEGER) as wochentag, COUNT(*) as anzahl
    FROM bewerbungen
    WHERE beworben_am IS NOT NULL AND beworben_am != ''
    GROUP BY wochentag ORDER BY wochentag ASC
  `).all();

  const letzten30 = db.prepare(`
    SELECT COUNT(*) as c FROM bewerbungen
    WHERE beworben_am >= date('now', '-30 days') AND archiviert=0
  `).get().c;

  const tageReihe = db.prepare(`
    SELECT DISTINCT date(beworben_am) as tag
    FROM bewerbungen
    WHERE beworben_am IS NOT NULL AND beworben_am != ''
    ORDER BY tag DESC LIMIT 60
  `).all().map(r => r.tag);

  let streak = 0;
  let checkDate = new Date();
  checkDate.setHours(0, 0, 0, 0);
  for (let i = 0; i < tageReihe.length; i++) {
    const d = checkDate.toISOString().slice(0, 10);
    if (tageReihe.includes(d)) { streak++; checkDate.setDate(checkDate.getDate() - 1); }
    else break;
  }

  res.json({ erfolgsquote, interviewQuote, zeitBisInterview, zeitBisAbsage, quellenStats, wochentagHeatmap, letzten30, streak });
});

// ── GET /api/bewerbungen/export/csv ─────────────────────────────────────────────────────
router.get('/export/csv', (req, res) => {
  const rows = db.prepare('SELECT * FROM bewerbungen ORDER BY erstellt_am DESC').all();
  const header = 'id,titel,firma,ort,quelle,status,beworben_am,followup_datum,bewertung,archiviert,url\n';
  const csv = header + rows.map(r =>
    [r.id, r.titel, r.firma, r.ort, r.quelle, r.status, r.beworben_am, r.followup_datum, r.bewertung, r.archiviert, r.url]
      .map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(',')
  ).join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="bewerbungen.csv"');
  res.send('\uFEFF' + csv);
});

// ── GET /api/bewerbungen/:id ────────────────────────────────────────────────────────────────────
router.get('/:id', idValidator, validate, (req, res) => {
  const row = db.prepare('SELECT * FROM bewerbungen WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Nicht gefunden' });
  res.json(row);
});

// ── POST /api/bewerbungen ──────────────────────────────────────────────────────────────────────
router.post('/', postValidator, validate, (req, res) => {
  const { titel, firma, ort, quelle, url, status, beworben_am, followup_datum, notizen, stellenbeschreibung, lebenslauf_id } = req.body;
  const st = VALID_STATUS.includes(status) ? status : 'beworben';
  const result = db.prepare(
    `INSERT INTO bewerbungen (titel,firma,ort,quelle,url,status,beworben_am,followup_datum,notizen,stellenbeschreibung,lebenslauf_id)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`
  ).run(
    titel.trim(), firma.trim(), (ort||'').trim(), (quelle||'').trim(), (url||'').trim(),
    st, beworben_am||'', followup_datum||'', (notizen||'').trim(),
    stellenbeschreibung ? stellenbeschreibung.trim() : null,
    lebenslauf_id || null
  );
  res.status(201).json({ id: result.lastInsertRowid });
});

// ── PUT /api/bewerbungen/:id ──────────────────────────────────────────────────────────────────
router.put('/:id', putValidator, validate, (req, res) => {
  const row = db.prepare('SELECT * FROM bewerbungen WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Nicht gefunden' });
  const fields = ['titel','firma','ort','url','status','beworben_am','followup_datum','notizen','bewertung','archiviert','stellenbeschreibung','lebenslauf_id'];
  const updates = {};
  fields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
  if (updates.status && !VALID_STATUS.includes(updates.status)) delete updates.status;
  if (!Object.keys(updates).length) return res.json(row);
  const setClauses = Object.keys(updates).map(f => `${f} = ?`).join(', ');
  db.prepare(`UPDATE bewerbungen SET ${setClauses}, aktualisiert_am = datetime('now') WHERE id = ?`)
    .run(...Object.values(updates), req.params.id);
  res.json(db.prepare('SELECT * FROM bewerbungen WHERE id = ?').get(req.params.id));
});

// ── DELETE /api/bewerbungen/:id ─────────────────────────────────────────────────────────────────
router.delete('/:id', idValidator, validate, (req, res) => {
  const row = db.prepare('SELECT id FROM bewerbungen WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Nicht gefunden' });
  db.prepare('DELETE FROM bewerbungen WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ── Kommentare ────────────────────────────────────────────────────────────────────────────
router.get('/:id/kommentare', idValidator, validate, (req, res) => {
  res.json(db.prepare('SELECT * FROM kommentare WHERE bewerbung_id = ? ORDER BY erstellt_am ASC').all(req.params.id));
});

router.post('/:id/kommentare', kommentarValidator, validate, (req, res) => {
  const r = db.prepare('INSERT INTO kommentare (bewerbung_id, text) VALUES (?,?)').run(req.params.id, req.body.text.trim());
  res.status(201).json({ id: r.lastInsertRowid });
});

router.delete('/:bewId/kommentare/:id', [
  param('bewId').isInt({ min: 1 }),
  param('id').isInt({ min: 1 }),
], validate, (req, res) => {
  db.prepare('DELETE FROM kommentare WHERE id = ? AND bewerbung_id = ?').run(req.params.id, req.params.bewId);
  res.json({ success: true });
});

module.exports = router;
