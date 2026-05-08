const express = require('express');
const router = express.Router();
const https = require('https');
const http = require('http');

function httpGet(url, headers={}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const lib = u.protocol === 'https:' ? https : http;
    const req = lib.get(url, { headers }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { resolve({}); } });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

async function arbeitnow(rolle, ort, n, umkreis) {
  const data = await httpGet('https://www.arbeitnow.com/api/job-board-api');
  return (data.data||[]).slice(0,80).map(j=>({
    titel: j.title, firma: j.company_name, ort: j.location,
    beschreibung: (j.description||'').replace(/<[^>]*>/g,' ').slice(0,300),
    url: j.url, tags: j.tags||[], remote: j.remote, quelle: 'Arbeitnow'
  }));
}

async function jobicy(rolle, ort, n, umkreis) {
  const q = encodeURIComponent(rolle.split(',')[0].trim());
  const data = await httpGet(`https://jobicy.com/api/v2/remote-jobs?count=${n}&keyword=${q}`);
  return (data.jobs||[]).map(j=>({
    titel: j.jobTitle, firma: j.companyName, ort: j.jobGeo||'Remote',
    beschreibung: (j.jobExcerpt||j.jobDescription||'').replace(/<[^>]*>/g,' ').slice(0,300),
    url: j.url||j.jobUrl, tags: j.jobTags||[], remote: true, quelle: 'Jobicy'
  }));
}

async function arbeitsagentur(rolle, ort, n, umkreis) {
  const params = new URLSearchParams({
    was: rolle.split(',')[0].trim(),
    wo: ort.split(',')[0].trim(),
    page: '1',
    size: String(n),
    veroeffentlichtseit: '30'
  });
  if (umkreis && parseInt(umkreis) > 0) {
    params.set('umkreis', String(parseInt(umkreis)));
  }
  const data = await httpGet(`https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v4/jobs?${params}`, {'X-API-Key':'jobboerse-jobsuche'});
  return (data.stellenangebote||[]).map(j=>({
    titel: j.titel||j.beruf||j.refnr, firma: j.arbeitgeber||'Unbekannt',
    ort: j.arbeitsort ? (j.arbeitsort.plz||'')+' '+(j.arbeitsort.ort||'') : '',
    beschreibung: (j.beruflicheTaetigkeit||j.aufgaben||'').slice(0,300),
    url: j.externeUrl||`https://www.arbeitsagentur.de/jobsuche/jobdetail/${j.refnr||''}`,
    tags: [j.berufsfeld||''].filter(Boolean), remote: false, quelle: 'Arbeitsagentur'
  }));
}

async function themuse(rolle, ort, n, umkreis) {
  const q = encodeURIComponent(rolle.split(',')[0].trim());
  const data = await httpGet(`https://www.themuse.com/api/public/jobs?page=1&descending=true&category=${q}`);
  return (data.results||[]).map(j=>({
    titel: j.name, firma: j.company?.name||'', ort: (j.locations||[]).map(x=>x.name).join(', '),
    beschreibung: (j.contents||'').replace(/<[^>]*>/g,' ').slice(0,300),
    url: j.refs?.landing_page||'', tags: [...(j.levels||[]).map(x=>x.name),...(j.categories||[]).map(x=>x.name)],
    remote: false, quelle: 'The Muse'
  }));
}

async function remotive(rolle, ort, n, umkreis) {
  const q = encodeURIComponent(rolle.split(',')[0].trim());
  const data = await httpGet(`https://remotive.com/api/remote-jobs?search=${q}&limit=${n}`);
  return (data.jobs||[]).map(j=>({
    titel: j.title, firma: j.company_name, ort: j.candidate_required_location||'Remote',
    beschreibung: (j.description||'').replace(/<[^>]*>/g,' ').slice(0,300),
    url: j.url, tags: (j.tags||[]).concat([j.job_type||'']).filter(Boolean), remote: true, quelle: 'Remotive'
  }));
}

async function adzuna(rolle, ort, n, umkreis) {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) throw new Error('ADZUNA_APP_ID / ADZUNA_APP_KEY nicht gesetzt');
  const q = encodeURIComponent(rolle.split(',')[0].trim());
  const loc = encodeURIComponent(ort.split(',')[0].trim() || 'Deutschland');
  // Adzuna: distance in km
  const dist = umkreis && parseInt(umkreis) > 0 ? `&distance=${parseInt(umkreis)}` : '';
  const data = await httpGet(`https://api.adzuna.com/v1/api/jobs/de/search/1?app_id=${appId}&app_key=${appKey}&results_per_page=${n}&what=${q}&where=${loc}${dist}&content-type=application/json`);
  return (data.results||[]).map(j=>({
    titel: j.title, firma: j.company?.display_name||'', ort: j.location?.display_name||'',
    beschreibung: (j.description||'').replace(/<[^>]*>/g,' ').slice(0,300),
    url: j.redirect_url||'', tags: [j.category?.label||''].filter(Boolean), remote: false, quelle: 'Adzuna'
  }));
}

async function jooble(rolle, ort, n, umkreis) {
  const apiKey = process.env.JOOBLE_API_KEY;
  if (!apiKey) throw new Error('JOOBLE_API_KEY nicht gesetzt');
  const body = JSON.stringify({ keywords: rolle.split(',')[0].trim(), location: ort.split(',')[0].trim()||'Deutschland', page: '1', resultsOnPage: String(n) });
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'jooble.org', path: `/api/${apiKey}`, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve((parsed.jobs||[]).map(j=>({
            titel: j.title, firma: j.company||'', ort: j.location||'',
            beschreibung: (j.snippet||'').replace(/<[^>]*>/g,' ').slice(0,300),
            url: j.link||'', tags: [j.type||''].filter(Boolean), remote: (j.title||'').toLowerCase().includes('remote'), quelle: 'Jooble'
          })));
        } catch(e) { reject(new Error('Jooble Parse-Fehler')); }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Jooble Timeout')); });
    req.write(body); req.end();
  });
}

const QUELLEN = { arbeitnow, jobicy, arbeitsagentur, themuse, remotive, adzuna, jooble };

router.get('/', async (req, res) => {
  const { quelle='all', rolle='Linux Administrator', ort='Remote', count='15', umkreis='0' } = req.query;
  const n = Math.min(30, parseInt(count,10)||15);
  const results = []; const errors = [];
  const toFetch = quelle === 'all' ? Object.keys(QUELLEN) : [quelle];
  await Promise.allSettled(toFetch.map(async q => {
    if (!QUELLEN[q]) return;
    try { results.push(...(await QUELLEN[q](rolle, ort, n, umkreis))); }
    catch(e) { errors.push(`${q}: ${e.message}`); }
  }));
  res.json({ results, errors });
});

router.get('/quellen', (req, res) => {
  res.json([
    { id: 'arbeitnow',      name: 'Arbeitnow',      kostenlos: true, keyRequired: false },
    { id: 'jobicy',         name: 'Jobicy',          kostenlos: true, keyRequired: false },
    { id: 'arbeitsagentur', name: 'Arbeitsagentur',  kostenlos: true, keyRequired: false },
    { id: 'themuse',        name: 'The Muse',        kostenlos: true, keyRequired: false },
    { id: 'remotive',       name: 'Remotive',        kostenlos: true, keyRequired: false },
    { id: 'adzuna',         name: 'Adzuna',          kostenlos: true, keyRequired: true,  configured: !!(process.env.ADZUNA_APP_ID) },
    { id: 'jooble',         name: 'Jooble',          kostenlos: true, keyRequired: true,  configured: !!(process.env.JOOBLE_API_KEY) },
  ]);
});

module.exports = router;
