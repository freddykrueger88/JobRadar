'use strict';

const db = require('../db/adapter');

const QUELLEN = require('../jobs/quellen');

async function suche({ suchbegriff, ort, umkreis, quellen } = {}) {
  const profil = db.get('SELECT * FROM profil WHERE id = 1');
  const keywords  = (profil?.keywords  || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  const blacklist  = (profil?.blacklist || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

  const bereitsBeworben = new Set(
    db.all('SELECT url FROM bewerbungen WHERE url IS NOT NULL').map(r => r.url)
  );

  const aktiveQuellen = quellen
    ? QUELLEN.filter(q => quellen.includes(q.id))
    : QUELLEN;

  const ergebnisse = await Promise.allSettled(
    aktiveQuellen.map(q => q.fetch({ suchbegriff, ort, umkreis }))
  );

  const jobs = ergebnisse
    .flatMap((r, i) => {
      if (r.status === 'rejected') {
        console.warn(`[suche] Quelle ${aktiveQuellen[i].id} fehlgeschlagen:`, r.reason?.message);
        return [];
      }
      return r.value.map(j => ({ ...j, quelle: aktiveQuellen[i].id }));
    })
    .map(job => ({
      ...job,
      match_score:       _matchScore(job, keywords),
      blacklisted:       _isBlacklisted(job, blacklist),
      bereits_beworben:  bereitsBeworben.has(job.url)
    }))
    .sort((a, b) => b.match_score - a.match_score);

  return jobs;
}

function _matchScore(job, keywords) {
  if (!keywords.length) return 0;
  const text = `${job.titel} ${job.beschreibung || ''} ${(job.tags || []).join(' ')}`.toLowerCase();
  return keywords.filter(k => text.includes(k)).length;
}

function _isBlacklisted(job, blacklist) {
  if (!blacklist.length) return false;
  const text = `${job.titel} ${job.firma || ''} ${job.beschreibung || ''}`.toLowerCase();
  return blacklist.some(b => text.includes(b));
}

module.exports = { suche };
