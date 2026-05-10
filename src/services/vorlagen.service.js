'use strict';

const db = require('../db/adapter');

function getAll() {
  return db.all('SELECT id,name,ton,sprache,laenge,hinweise,erstellt_am FROM vorlagen ORDER BY id');
}

function create({ name, ton = 'formell', sprache = 'deutsch', laenge = 'mittel', hinweise = '' }) {
  const result = db.run(
    'INSERT INTO vorlagen (name,ton,sprache,laenge,hinweise) VALUES (?,?,?,?,?)',
    [name, ton, sprache, laenge, hinweise]
  );
  return getById(result.lastInsertRowid);
}

function getById(id) {
  return db.get('SELECT id,name,ton,sprache,laenge,hinweise,erstellt_am FROM vorlagen WHERE id = ?', [id]) ?? null;
}

function remove(id) {
  const result = db.run('DELETE FROM vorlagen WHERE id = ?', [id]);
  return result.changes > 0;
}

module.exports = { getAll, create, getById, remove };
