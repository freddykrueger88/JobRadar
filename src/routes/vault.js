'use strict';

const router = require('express').Router();
const multer = require('multer');
const path   = require('path');
const { v4: uuid } = require('uuid');
const svc    = require('../services/vault.service');
const fs     = require('fs');

fs.mkdirSync(svc.VAULT_DIR, { recursive: true });

// Erlaubte MIME-Types für CV-Uploads
const ALLOWED_MIMETYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.oasis.opendocument.text',
  'text/plain',
]);
const ALLOWED_EXTENSIONS = new Set(['.pdf', '.doc', '.docx', '.odt', '.txt']);

const storage = multer.diskStorage({
  destination: svc.VAULT_DIR,
  filename: (_, file, cb) => cb(null, `${uuid()}${path.extname(file.originalname).toLowerCase()}`)
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_MIMETYPES.has(file.mimetype) || !ALLOWED_EXTENSIONS.has(ext)) {
      return cb(Object.assign(new Error('Nur PDF, DOC, DOCX, ODT und TXT erlaubt'), { status: 400 }));
    }
    cb(null, true);
  }
});

router.get('/', (req, res, next) => {
  try { res.json(svc.getAll()); }
  catch (e) { next(e); }
});

router.post('/', upload.single('datei'), (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Keine Datei' });
    res.status(201).json(svc.create({
      name:         req.body.name || req.file.originalname,
      dateiname:    req.file.filename,
      originalname: req.file.originalname,
      groesse:      req.file.size,
      notiz:        req.body.notiz
    }));
  } catch (e) { next(e); }
});

router.get('/:id/download', (req, res, next) => {
  try {
    const info = svc.getFilePath(+req.params.id);
    if (!info) return res.status(404).json({ error: 'Nicht gefunden' });
    res.download(info.filePath, info.originalname);
  } catch (e) { next(e); }
});

router.delete('/:id', (req, res, next) => {
  try { svc.remove(+req.params.id); res.status(204).end(); }
  catch (e) { next(e); }
});

module.exports = router;
