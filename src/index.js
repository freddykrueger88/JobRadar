const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;
const { version } = require('../package.json');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Sicherheits-Header (ohne helmet)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});

app.use(express.json({ limit: '500kb' }));

// Einfaches Rate-Limiting
const rateLimits = new Map();
app.use('/api', (req, res, next) => {
  const ip = req.ip;
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 120;
  if (!rateLimits.has(ip)) rateLimits.set(ip, []);
  const requests = rateLimits.get(ip).filter(t => now - t < windowMs);
  requests.push(now);
  rateLimits.set(ip, requests);
  if (requests.length > maxRequests) {
    return res.status(429).json({ error: 'Zu viele Anfragen. Bitte kurz warten.' });
  }
  next();
});

app.use(express.static(path.join(__dirname, '../public')));

// Health-Check
app.get('/health', async (req, res, next) => {
  try {
    const db = require('./db/database');
    const http = require('http');
    const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
    let dbStatus = 'ok';
    try { db.prepare('SELECT 1').get(); } catch(e) { dbStatus = 'error: ' + e.message; }
    let ollamaStatus = 'ok';
    try {
      await new Promise((resolve, reject) => {
        const u = new URL(OLLAMA_URL + '/api/tags');
        const r = http.get(u.toString(), res2 => { res2.resume(); resolve(); });
        r.on('error', reject);
        r.setTimeout(3000, () => { r.destroy(); reject(new Error('timeout')); });
      });
    } catch(e) { ollamaStatus = 'nicht erreichbar: ' + e.message; }
    const healthy = dbStatus === 'ok';
    res.status(healthy ? 200 : 503).json({
      status: healthy ? 'ok' : 'degraded',
      version,
      timestamp: new Date().toISOString(),
      checks: { database: dbStatus, ollama: ollamaStatus }
    });
  } catch(e) { next(e); }
});

app.get('/api/version', (req, res) => res.json({ version, name: 'JobRadar' }));

app.use('/api/bewerbungen', require('./routes/bewerbungen'));
app.use('/api/profil',      require('./routes/profil'));
app.use('/api/vorlagen',    require('./routes/vorlagen'));
app.use('/api/suche',       require('./routes/suche'));
app.use('/api/ki',          require('./routes/ki'));

// SPA-Fallback: alle nicht-API-Routen → index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// 404 + zentraler Error-Handler
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => console.log(`🎯 JobRadar läuft auf http://localhost:${PORT}`));
