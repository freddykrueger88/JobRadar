'use strict';

const db = require('../db/adapter');

function get() {
  return db.get('SELECT * FROM einstellungen WHERE id = 1');
}

function update(data) {
  const fields = [
    'ki_modell','ki_stil','ki_sprache','ki_laenge','ki_hinweise',
    'push_aktiv','push_intervall_min',
    'suche_umkreis_km','suche_auto_aktiv','dark_mode'
  ];
  const updates = fields.filter(f => f in data);
  if (updates.length === 0) return get();
  const sql = `UPDATE einstellungen SET ${updates.map(f => `${f} = ?`).join(', ')}, aktualisiert_am = datetime('now') WHERE id = 1`;
  db.run(sql, updates.map(f => data[f]));
  return get();
}

module.exports = { get, update };
