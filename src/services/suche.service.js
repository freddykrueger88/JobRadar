'use strict';

const db = require('../db/adapter');
const QUELLEN = require('../jobs/quellen');

// Einfacher In-Memory Cache für Suchergebnisse
const cache = new Map();
const CACHE_TTL = 15 * 60 * 1000; // 15 Minuten

async function suche({ suchbegriff, ort, umkreis, quellen } = {}) {
  // Cache-Key generieren
  const cacheKey = JSON.stringify({ suchbegriff, ort, umkreis, quellen });
  const cached = cache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    return cached.data;
  }

  const profil = db.get('SELECT * FROM profil WHERE id = 1');
  const keywords  = (profil?.keywords  || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  const blacklist  = (profil?.blacklist || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

  // Optimierung: Nur URLs laden, keine unnötigen Spalten
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

  // Ergebnis im Cache speichern
  cache.set(cacheKey, {
    timestamp: Date.now(),
    data: jobs
  });

  return jobs;
}

function _matchScore(job, keywords) {
  if (!keywords.length) return 0;
  const text = `${job.titel} ${job.beschreibung || ''} ${(job.tags || []).join(' ')}`.toLowerCase();
  
  // Verbessert: Nur ganze Wörter zählen via Regex (\b = Word Boundary)
  return keywords.filter(k => {
    const regex = new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    return regex.test(text);
  }).length;
}

function _isBlacklisted(job, blacklist) {
  if (!blacklist.length) return false;
  const text = `${job.titel} ${job.firma || ''} ${job.beschreibung || ''}`.toLowerCase();
  
  // Ebenfalls präziser mit Wortgrenzen, um Fehlalarme zu vermeiden
  return blacklist.some(b => {
    const regex = new RegExp(`\\b${b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    return regex.test(text);
  });
}

module.exports = { suche };
