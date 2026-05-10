'use strict';

const router = require('express').Router();
const multer = require('multer');
const svc    = require('../services/import.service');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const ok = ['.xlsx','.csv','.xls'].some(ext => file.originalname.endsWith(ext));
    cb(null, ok);
  }
});

router.post('/excel', upload.single('datei'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Keine Datei oder falsches Format (.xlsx / .csv)' });
    const ergebnis = await svc.importieren(req.file.buffer, req.file.mimetype);
    res.json(ergebnis);
  } catch (e) { next(e); }
});

// Vorschau: gibt erste 10 Zeilen + erkanntes Mapping zurück
router.post('/vorschau', upload.single('datei'), (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Keine Datei' });
    const rows = svc.parseFile(req.file.buffer, req.file.mimetype);
    const { mapping } = svc.mapSpalten(rows);
    res.json({ vorschau: rows.slice(0, 10), mapping, gesamt: rows.length });
  } catch (e) { next(e); }
});

module.exports = router;
