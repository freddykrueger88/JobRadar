const express = require('express');
const router = express.Router();
const db = require('../db/database');

router.get('/', (req, res) => res.json(db.prepare('SELECT * FROM vorlagen ORDER BY id').all()));

router.post('/', (req, res) => {
  const { name, einleitung, schluss } = req.body;
  const r = db.prepare('INSERT INTO vorlagen (name,einleitung,schluss) VALUES (?,?,?)').run(name||'Neu',einleitung||'',schluss||'');
  res.json({ id: r.lastInsertRowid });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM vorlagen WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
