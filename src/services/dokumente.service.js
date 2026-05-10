'use strict';

const db  = require('../db/adapter');
const fs  = require('fs');
const path = require('path');

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../../data/uploads/dokumente');

function getAllForBewerbung(bewerbungId) {
  return db.all('SELECT * FROM dokumente WHERE bewerbung_id = ? ORDER BY hochgeladen_am DESC', [bewerbungId]);
}

function create(bewerbungId, fileInfo) {
  const { dateiname, originalname, mimetype, groesse, typ } = fileInfo;
  const result = db.run(
    'INSERT INTO dokumente (bewerbung_id, dateiname, originalname, mimetype, groesse, typ) VALUES (?,?,?,?,?,?)',
    [bewerbungId, dateiname, originalname, mimetype, groesse, typ ?? 'sonstiges']
  );
  return db.get('SELECT * FROM dokumente WHERE id = ?', [result.lastInsertRowid]);
}

function remove(id) {
  const dok = db.get('SELECT * FROM dokumente WHERE id = ?', [id]);
  if (!dok) return;
  const filePath = path.resolve(UPLOAD_DIR, dok.dateiname);
  // Path-Traversal-Schutz
  if (filePath.startsWith(path.resolve(UPLOAD_DIR))) {
    try { fs.unlinkSync(filePath); } catch (_) {}
  }
  db.run('DELETE FROM dokumente WHERE id = ?', [id]);
}

function getFilePath(id) {
  const dok = db.get('SELECT * FROM dokumente WHERE id = ?', [id]);
  if (!dok) return null;
  const filePath = path.resolve(UPLOAD_DIR, dok.dateiname);
  if (!filePath.startsWith(path.resolve(UPLOAD_DIR))) return null; // Traversal-Schutz
  return { filePath, originalname: dok.originalname, mimetype: dok.mimetype };
}

module.exports = { getAllForBewerbung, create, remove, getFilePath, UPLOAD_DIR };
