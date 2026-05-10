'use strict';

const db = require('../db/adapter');

function get() {
  const row = db.get('SELECT * FROM erfahrungen WHERE id = 1');
  if (!row) return { skills: [], stationen: [], zertifikate: [] };
  return {
    skills:      JSON.parse(row.skills      || '[]'),
    stationen:   JSON.parse(row.stationen   || '[]'),
    zertifikate: JSON.parse(row.zertifikate || '[]'),
    aktualisiert_am: row.aktualisiert_am
  };
}

function update(data) {
  const fields = ['skills','stationen','zertifikate'];
  const updates = fields.filter(f => f in data);
  if (updates.length === 0) return get();
  const sql = `UPDATE erfahrungen SET ${updates.map(f => `${f} = ?`).join(', ')}, aktualisiert_am = datetime('now') WHERE id = 1`;
  db.run(sql, updates.map(f => JSON.stringify(data[f])));
  return get();
}

module.exports = { get, update };
