const express   = require('express');
const router    = express.Router();
const db        = require('../db/database');

const VALID_STATUS = ['beworben','interview','angenommen','abgelehnt'];

// ── GET /api/bewerbungen ─────────────────────────────────────────────────────
router.get('/', (req, res) => {
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

// ── GET /api/bewerbungen/stats/overview ─────────────────────────────────────
router.get('/stats/overview', (req, res) => {
  const total   = db.prepare('SELECT COUNT(*) as c FROM bewerbungen WHERE archiviert=0').get().c;
  const overdue = db.prepare("SELECT COUNT(*) as c FROM bewerbungen WHERE archiviert=0 AND status!='angenommen' AND followup_datum < date('now')").get().c;
  const byStatus = db.prepare('SELECT status, COUNT(*) as c FROM bewerbungen WHERE archiviert=0 GROUP BY status').all();
  const dokCount = db.prepare('SELECT COUNT(*) as c FROM dokumente').get().c;
  res.json({ total, overdue, byStatus, dokCount });
});

// ── GET /api/bewerbungen/stats/verlauf ──────────────────────────────────────
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

// ── GET /api/bewerbungen/export/csv ─────────────────────────────────────────
router.get('/export/csv', (req, res) => {
  const rows = db.prepare('SELECT * FROM bewerbungen ORDER BY erstellt_am DESC').all();
  const header = 'id,titel,firma,ort,quelle,status,beworben_am,followup_datum,bewertung,archiviert,url\n';
  const csv = header + rows.map(r =>
    [r.id, r.titel, r.firma, r.ort, r.quelle, r.status, r.beworben_am, r.followup_datum, r.bewertung, r.archiviert, r.url]
      .map(v => `"${String(v||'').replace(/"/g,'""')}"`).join(',')
  ).join('\n');
  res.setHeader('Content-Type','text/csv; charset=utf-8');
  res.setHeader('Content-Disposition','attachment; filename="bewerbungen.csv"');
  res.send('\uFEFF' + csv);
});

// ── GET /api/bewerbungen/:id ─────────────────────────────────────────────────
router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM bewerbungen WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Nicht gefunden' });
  res.json(row);
});

// ── POST /api/bewerbungen ────────────────────────────────────────────────────
router.post('/', (req, res) => {
  const { titel, firma, ort, quelle, url, status, beworben_am, followup_datum, notizen, stellenbeschreibung } = req.body;
  if (!titel || !firma) return res.status(400).json({ error: 'Titel und Firma sind Pflichtfelder.' });
  const st = VALID_STATUS.includes(status) ? status : 'beworben';
  const result = db.prepare(
    `INSERT INTO bewerbungen (titel,firma,ort,quelle,url,status,beworben_am,followup_datum,notizen,stellenbeschreibung)
     VALUES (?,?,?,?,?,?,?,?,?,?)`
  ).run(titel, firma, ort||'', quelle||'', url||'', st, beworben_am||'', followup_datum||'', notizen||'', stellenbeschreibung||null);
  res.status(201).json({ id: result.lastInsertRowid });
});

// ── PUT /api/bewerbungen/:id ─────────────────────────────────────────────────
router.put('/:id', (req, res) => {
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

// ── DELETE /api/bewerbungen/:id ──────────────────────────────────────────────
router.delete('/:id', (req, res) => {
  const row = db.prepare('SELECT id FROM bewerbungen WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Nicht gefunden' });
  db.prepare('DELETE FROM bewerbungen WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ── Kommentare ───────────────────────────────────────────────────────────────
router.get('/:id/kommentare', (req, res) => {
  res.json(db.prepare('SELECT * FROM kommentare WHERE bewerbung_id = ? ORDER BY erstellt_am ASC').all(req.params.id));
});
router.post('/:id/kommentare', (req, res) => {
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'Text fehlt.' });
  const r = db.prepare('INSERT INTO kommentare (bewerbung_id, text) VALUES (?,?)').run(req.params.id, text.trim());
  res.status(201).json({ id: r.lastInsertRowid });
});
router.delete('/:bewId/kommentare/:id', (req, res) => {
  db.prepare('DELETE FROM kommentare WHERE id = ? AND bewerbung_id = ?').run(req.params.id, req.params.bewId);
  res.json({ success: true });
});

module.exports = router;
