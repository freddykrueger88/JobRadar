'use strict';

const router = require('express').Router({ mergeParams: true });
const multer = require('multer');
const path   = require('path');
const { v4: uuid } = require('uuid');
const svc    = require('../services/dokumente.service');
const fs     = require('fs');

fs.mkdirSync(svc.UPLOAD_DIR, { recursive: true });

// Erlaubte MIME-Types für Bewerbungsdokumente
const ALLOWED_MIMETYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.oasis.opendocument.text',
  'image/jpeg',
  'image/png',
  'text/plain',
]);
const ALLOWED_EXTENSIONS = new Set(['.pdf', '.doc', '.docx', '.odt', '.jpg', '.jpeg', '.png', '.txt']);

const storage = multer.diskStorage({
  destination: svc.UPLOAD_DIR,
  filename: (_, file, cb) => cb(null, `${uuid()}${path.extname(file.originalname).toLowerCase()}`)
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_MIMETYPES.has(file.mimetype) || !ALLOWED_EXTENSIONS.has(ext)) {
      return cb(Object.assign(new Error('Nur PDF, DOC, DOCX, ODT, JPG, PNG und TXT erlaubt'), { status: 400 }));
    }
    cb(null, true);
  }
});

router.get('/', (req, res, next) => {
  try { res.json(svc.getAllForBewerbung(+req.params.id)); }
  catch (e) { next(e); }
});

router.post('/', upload.single('datei'), (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Keine Datei' });
    res.status(201).json(svc.create(+req.params.id, {
      dateiname:    req.file.filename,
      originalname: req.file.originalname,
      mimetype:     req.file.mimetype,
      groesse:      req.file.size,
      typ:          req.body.typ
    }));
  } catch (e) { next(e); }
});

router.get('/:did/download', (req, res, next) => {
  try {
    const info = svc.getFilePath(+req.params.did);
    if (!info) return res.status(404).json({ error: 'Nicht gefunden' });
    res.download(info.filePath, info.originalname);
  } catch (e) { next(e); }
});

router.delete('/:did', (req, res, next) => {
  try { svc.remove(+req.params.did); res.status(204).end(); }
  catch (e) { next(e); }
});

module.exports = router;
