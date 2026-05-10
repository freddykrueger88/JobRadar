'use strict';

const db   = require('../db/adapter');
const fs   = require('fs');
const path = require('path');

const VAULT_DIR = process.env.VAULT_DIR || path.join(__dirname, '../../data/uploads/vault');

function getAll() {
  return db.all('SELECT * FROM lebenslauf_vault ORDER BY hochgeladen_am DESC');
}

function create(fileInfo) {
  const { name, dateiname, originalname, groesse, notiz } = fileInfo;
  const result = db.run(
    'INSERT INTO lebenslauf_vault (name, dateiname, originalname, groesse, notiz) VALUES (?,?,?,?,?)',
    [name, dateiname, originalname, groesse, notiz ?? null]
  );
  return db.get('SELECT * FROM lebenslauf_vault WHERE id = ?', [result.lastInsertRowid]);
}

function remove(id) {
  const entry = db.get('SELECT * FROM lebenslauf_vault WHERE id = ?', [id]);
  if (!entry) return;
  const filePath = path.resolve(VAULT_DIR, entry.dateiname);
  if (filePath.startsWith(path.resolve(VAULT_DIR))) {
    try { fs.unlinkSync(filePath); } catch (_) {}
  }
  db.run('DELETE FROM lebenslauf_vault WHERE id = ?', [id]);
}

function getFilePath(id) {
  const entry = db.get('SELECT * FROM lebenslauf_vault WHERE id = ?', [id]);
  if (!entry) return null;
  const filePath = path.resolve(VAULT_DIR, entry.dateiname);
  if (!filePath.startsWith(path.resolve(VAULT_DIR))) return null;
  return { filePath, originalname: entry.originalname };
}

module.exports = { getAll, create, remove, getFilePath, VAULT_DIR };
