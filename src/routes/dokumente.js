'use strict';

const router = require('express').Router({ mergeParams: true });
const multer = require('multer');
const path   = require('path');
const { v4: uuid } = require('uuid');
const svc    = require('../services/dokumente.service');
const fs     = require('fs');

fs.mkdirSync(svc.UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: svc.UPLOAD_DIR,
  filename: (_, file, cb) => cb(null, `${uuid()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

router.get('/',    (req, res, next) => {
  try { res.json(svc.getAllForBewerbung(+req.params.id)); }
  catch (e) { next(e); }
});

router.post('/',   upload.single('datei'), (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Keine Datei' });
    res.status(201).json(svc.create(+req.params.id, {
      dateiname:   req.file.filename,
      originalname: req.file.originalname,
      mimetype:    req.file.mimetype,
      groesse:     req.file.size,
      typ:         req.body.typ
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
