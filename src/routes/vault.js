const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const db       = require('../db/database');

const VAULT_DIR = process.env.VAULT_PATH || path.join(__dirname, '../../data/vault');
fs.mkdirSync(VAULT_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, VAULT_DIR),
  filename:    (req, file, cb) => {
    const ts   = Date.now();
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${ts}_${safe}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['application/pdf','application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ].includes(file.mimetype);
    cb(ok ? null : new Error('Nur PDF/DOCX erlaubt'), ok);
  }
});

// GET  /api/vault
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM lebenslauf_vault ORDER BY hochgeladen_am DESC').all();
  res.json(rows);
});

// POST /api/vault
router.post('/', upload.single('datei'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Keine Datei.' });
  const name = (req.body.name || req.file.originalname).trim().slice(0, 200);
  const notiz = (req.body.notiz || '').trim().slice(0, 500);
  const r = db.prepare(
    'INSERT INTO lebenslauf_vault (name, dateiname, originalname, groesse, notiz) VALUES (?,?,?,?,?)'
  ).run(name, req.file.filename, req.file.originalname, req.file.size, notiz || null);
  res.status(201).json({ id: r.lastInsertRowid, name, dateiname: req.file.filename });
});

// GET  /api/vault/:id/download
router.get('/:id/download', (req, res) => {
  const row = db.prepare('SELECT * FROM lebenslauf_vault WHERE id=?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Nicht gefunden' });
  const filePath = path.join(VAULT_DIR, row.dateiname);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Datei fehlt' });
  res.download(filePath, row.originalname);
});

// DELETE /api/vault/:id
router.delete('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM lebenslauf_vault WHERE id=?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Nicht gefunden' });
  try { fs.unlinkSync(path.join(VAULT_DIR, row.dateiname)); } catch(e) {}
  db.prepare('DELETE FROM lebenslauf_vault WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
