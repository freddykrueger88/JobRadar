const express = require('express');
const router = express.Router();
const db = require('../db/database');

router.get('/', (req, res) => {
  const { status, firma, archiviert } = req.query;
  let query = 'SELECT * FROM bewerbungen WHERE 1=1';
  const params = [];
  if (status) { query += ' AND status = ?'; params.push(status); }
  if (firma)  { query += ' AND LOWER(firma) LIKE ?'; params.push('%'+firma.toLowerCase()+'%'); }
  query += archiviert === '1' ? ' AND archiviert = 1' : ' AND archiviert = 0';
  query += ' ORDER BY beworben_am DESC';
  res.json(db.prepare(query).all(...params));
});

router.post('/', (req, res) => {
  const { titel, firma, ort, quelle, url, status, beworben_am, followup_datum, notizen, anschreiben } = req.body;
  const r = db.prepare(`INSERT INTO bewerbungen (titel,firma,ort,quelle,url,status,beworben_am,followup_datum,notizen,anschreiben)
    VALUES (?,?,?,?,?,?,?,?,?,?)`).run(titel,firma,ort||'',quelle||'',url||'',status||'beworben',
    beworben_am||new Date().toISOString().slice(0,10), followup_datum||'', notizen||'', anschreiben||'');
  db.prepare('INSERT INTO kommentare (bewerbung_id, text) VALUES (?, ?)').run(r.lastInsertRowid, 'Bewerbung eingereicht');
  res.json({ id: r.lastInsertRowid });
});

router.put('/:id', (req, res) => {
  const prev = db.prepare('SELECT status FROM bewerbungen WHERE id=?').get(req.params.id);
  const { status, followup_datum, bewertung, notizen, anschreiben, archiviert } = req.body;
  db.prepare(`UPDATE bewerbungen SET
    status=COALESCE(?,status), followup_datum=COALESCE(?,followup_datum),
    bewertung=COALESCE(?,bewertung), notizen=COALESCE(?,notizen),
    anschreiben=COALESCE(?,anschreiben), archiviert=COALESCE(?,archiviert),
    aktualisiert_am=datetime('now') WHERE id=?`
  ).run(status||null,followup_datum||null,bewertung||null,notizen||null,anschreiben||null,archiviert!=null?archiviert:null,req.params.id);
  if (status && prev && status !== prev.status) {
    db.prepare('INSERT INTO kommentare (bewerbung_id, text) VALUES (?, ?)').run(req.params.id, 'Status geändert: '+prev.status+' → '+status);
  }
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM bewerbungen WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

router.get('/:id/kommentare', (req, res) => {
  res.json(db.prepare('SELECT * FROM kommentare WHERE bewerbung_id=? ORDER BY erstellt_am ASC').all(req.params.id));
});
router.post('/:id/kommentare', (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Text fehlt' });
  const r = db.prepare('INSERT INTO kommentare (bewerbung_id, text) VALUES (?, ?)').run(req.params.id, text);
  res.json({ id: r.lastInsertRowid });
});
router.delete('/:bewId/kommentare/:id', (req, res) => {
  db.prepare('DELETE FROM kommentare WHERE id=? AND bewerbung_id=?').run(req.params.id, req.params.bewId);
  res.json({ ok: true });
});

router.get('/stats/overview', (req, res) => {
  const today = new Date().toISOString().slice(0,10);
  const total = db.prepare("SELECT COUNT(*) as c FROM bewerbungen WHERE archiviert=0").get().c;
  const byStatus = db.prepare("SELECT status, COUNT(*) as c FROM bewerbungen WHERE archiviert=0 GROUP BY status").all();
  const overdue = db.prepare("SELECT COUNT(*) as c FROM bewerbungen WHERE archiviert=0 AND followup_datum < ? AND status != 'angenommen'").get(today).c;
  const dueSoon = db.prepare("SELECT COUNT(*) as c FROM bewerbungen WHERE archiviert=0 AND followup_datum BETWEEN ? AND date(?,'+'||3||' days') AND status != 'angenommen'").get(today,today).c;
  res.json({ total, byStatus, overdue, dueSoon });
});

router.get('/export/csv', (req, res) => {
  const rows = db.prepare('SELECT * FROM bewerbungen ORDER BY beworben_am DESC').all();
  const header = ['id','titel','firma','ort','quelle','url','status','beworben_am','followup_datum','bewertung','notizen','archiviert'];
  const csv = [header.join(','), ...rows.map(r => header.map(k => '"'+(String(r[k]||'').replace(/"/g,'""'))+'"').join(','))].join('\n');
  res.setHeader('Content-Type','text/csv;charset=utf-8');
  res.setHeader('Content-Disposition','attachment;filename="bewerbungen.csv"');
  res.send(csv);
});

module.exports = router;
