'use strict';

const db = require('../db/adapter');

function get() {
  return db.get('SELECT * FROM profil WHERE id = 1');
}

function update(data) {
  const fields = ['name','email','rollen','ort','keywords','blacklist','kurzprofil','staerken'];
  const updates = fields.filter(f => f in data);
  if (updates.length === 0) return get();
  const sql = `UPDATE profil SET ${updates.map(f => `${f} = ?`).join(', ')} WHERE id = 1`;
  db.run(sql, updates.map(f => data[f]));
  return get();
}

module.exports = { get, update };
