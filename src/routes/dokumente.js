const express = require('express');
const router  = express.Router();
const path    = require('path');
const fs      = require('fs');
const multer  = require('multer');
const db      = require('../db/database');

// ── Upload-Verzeichnis ──────────────────────────────────────────────────────
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../../data/uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ── Multer-Konfiguration ────────────────────────────────────────────────────
const ERLAUBTE_TYPEN = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ts   = Date.now();
    const ext  = path.extname(file.originalname);
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${ts}_${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (ERLAUBTE_TYPEN.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Nicht erlaubter Dateityp. Erlaubt: PDF, DOCX, DOC, PNG, JPEG'));
    }
  },
});

// ── GET /api/dokumente/:bewerbungId ─────────────────────────────────────────
// Alle Dokumente einer Bewerbung auflisten
router.get('/:bewerbungId', (req, res) => {
  const { bewerbungId } = req.params;
  const docs = db
    .prepare('SELECT * FROM dokumente WHERE bewerbung_id = ? ORDER BY hochgeladen_am DESC')
    .all(bewerbungId);
  res.json(docs);
});

// ── POST /api/dokumente/:bewerbungId ────────────────────────────────────────
// Datei hochladen und mit Bewerbung verknüpfen
router.post('/:bewerbungId', upload.single('datei'), (req, res) => {
  const { bewerbungId } = req.params;

  // Bewerbung muss existieren
  const bewerbung = db.prepare('SELECT id FROM bewerbungen WHERE id = ?').get(bewerbungId);
  if (!bewerbung) {
    // Hochgeladene Datei wieder löschen
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(404).json({ error: 'Bewerbung nicht gefunden.' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'Keine Datei übermittelt.' });
  }

  const { originalname, filename, mimetype, size } = req.file;
  const typ = req.body.typ || 'sonstiges'; // z.B. anschreiben | lebenslauf | sonstiges

  const result = db
    .prepare(
      `INSERT INTO dokumente (bewerbung_id, dateiname, originalname, mimetype, groesse, typ)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(bewerbungId, filename, originalname, mimetype, size, typ);

  res.status(201).json({
    id: result.lastInsertRowid,
    bewerbung_id: Number(bewerbungId),
    dateiname: filename,
    originalname,
    mimetype,
    groesse: size,
    typ,
  });
});

// ── GET /api/dokumente/download/:id ─────────────────────────────────────────
// Datei herunterladen
router.get('/download/:id', (req, res) => {
  const doc = db.prepare('SELECT * FROM dokumente WHERE id = ?').get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Dokument nicht gefunden.' });

  const filePath = path.join(UPLOAD_DIR, doc.dateiname);
  if (!fs.existsSync(filePath)) {
    return res.status(410).json({ error: 'Datei nicht mehr vorhanden.' });
  }

  res.setHeader('Content-Disposition', `attachment; filename="${doc.originalname}"`);
  res.setHeader('Content-Type', doc.mimetype);
  res.sendFile(filePath);
});

// ── DELETE /api/dokumente/:id ────────────────────────────────────────────────
// Dokument löschen (DB-Eintrag + Datei)
router.delete('/:id', (req, res) => {
  const doc = db.prepare('SELECT * FROM dokumente WHERE id = ?').get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Dokument nicht gefunden.' });

  // Datei vom Dateisystem löschen
  const filePath = path.join(UPLOAD_DIR, doc.dateiname);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  db.prepare('DELETE FROM dokumente WHERE id = ?').run(req.params.id);
  res.json({ success: true, deleted: req.params.id });
});

// ── Multer-Fehler abfangen ───────────────────────────────────────────────────
router.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'Datei zu groß. Maximum: 10 MB.' });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err) return res.status(400).json({ error: err.message });
  _next();
});

module.exports = router;
