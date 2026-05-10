'use strict';

const db = require('../db/adapter');

function getAll({ archiviert = 0, status, firma, limit = 100, offset = 0 } = {}) {
  let sql = 'SELECT * FROM bewerbungen WHERE archiviert = ?';
  const params = [archiviert ? 1 : 0];
  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (firma)  { sql += ' AND firma LIKE ?'; params.push(`%${firma}%`); }
  sql += ' ORDER BY erstellt_am DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  return db.all(sql, params);
}

function getById(id) {
  const b = db.get('SELECT * FROM bewerbungen WHERE id = ?', [id]);
  if (!b) return null;
  b.kommentare = db.all('SELECT * FROM kommentare WHERE bewerbung_id = ? ORDER BY erstellt_am ASC', [id]);
  b.dokumente  = db.all('SELECT * FROM dokumente  WHERE bewerbung_id = ? ORDER BY hochgeladen_am DESC', [id]);
  return b;
}

function create(data) {
  const { titel, firma, ort, quelle, url, status, beworben_am,
          followup_datum, bewertung, notizen, anschreiben,
          stellenbeschreibung, lebenslauf_id } = data;
  const result = db.run(
    `INSERT INTO bewerbungen
       (titel,firma,ort,quelle,url,status,beworben_am,followup_datum,
        bewertung,notizen,anschreiben,stellenbeschreibung,lebenslauf_id)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [titel, firma, ort ?? null, quelle ?? null, url ?? null,
     status ?? 'beworben', beworben_am ?? null, followup_datum ?? null,
     bewertung ?? null, notizen ?? null, anschreiben ?? null,
     stellenbeschreibung ?? null, lebenslauf_id ?? null]
  );
  return getById(result.lastInsertRowid);
}

function update(id, data) {
  const fields = [
    'titel','firma','ort','quelle','url','status','beworben_am',
    'followup_datum','bewertung','notizen','anschreiben',
    'stellenbeschreibung','archiviert','lebenslauf_id'
  ];
  const updates = fields.filter(f => f in data);
  if (updates.length === 0) return getById(id);
  const sql = `UPDATE bewerbungen SET ${updates.map(f => `${f} = ?`).join(', ')}, aktualisiert_am = datetime('now') WHERE id = ?`;
  db.run(sql, [...updates.map(f => data[f]), id]);
  return getById(id);
}

function remove(id) {
  db.run('DELETE FROM bewerbungen WHERE id = ?', [id]);
}

function addKommentar(bewerbungId, text) {
  const result = db.run(
    'INSERT INTO kommentare (bewerbung_id, text) VALUES (?, ?)',
    [bewerbungId, text]
  );
  return db.get('SELECT * FROM kommentare WHERE id = ?', [result.lastInsertRowid]);
}

function deleteKommentar(id) {
  db.run('DELETE FROM kommentare WHERE id = ?', [id]);
}

function getStats() {
  const total      = db.get('SELECT COUNT(*) as n FROM bewerbungen WHERE archiviert = 0');
  const byStatus   = db.all('SELECT status, COUNT(*) as n FROM bewerbungen WHERE archiviert = 0 GROUP BY status');
  const followups  = db.all("SELECT * FROM bewerbungen WHERE archiviert = 0 AND followup_datum IS NOT NULL AND followup_datum <= date('now', '+3 days') ORDER BY followup_datum ASC");
  const overdue    = db.all("SELECT * FROM bewerbungen WHERE archiviert = 0 AND followup_datum < date('now')");
  return { total: total.n, byStatus, followups, overdue };
}

function exportCsv() {
  return db.all('SELECT id,titel,firma,ort,quelle,url,status,beworben_am,followup_datum,bewertung,notizen FROM bewerbungen ORDER BY erstellt_am DESC');
}

module.exports = { getAll, getById, create, update, remove, addKommentar, deleteKommentar, getStats, exportCsv };
