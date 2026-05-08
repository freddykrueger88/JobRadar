const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;
const { version } = require('../package.json');

app.use(express.json());

// Einfaches Rate-Limiting ohne externe Abhängigkeit
const rateLimits = new Map();
app.use('/api', (req, res, next) => {
  const ip = req.ip;
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 Minute
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
app.get('/health', async (req, res) => {
  const db = require('./db/database');
  const http = require('http');
  const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

  // DB-Check
  let dbStatus = 'ok';
  try { db.prepare('SELECT 1').get(); } catch(e) { dbStatus = 'error: ' + e.message; }

  // Ollama-Check
  let ollamaStatus = 'ok';
  try {
    await new Promise((resolve, reject) => {
      const u = new URL(OLLAMA_URL + '/api/tags');
      const req2 = http.get(u.toString(), r => { r.resume(); resolve(); });
      req2.on('error', reject);
      req2.setTimeout(3000, () => { req2.destroy(); reject(new Error('timeout')); });
    });
  } catch(e) { ollamaStatus = 'nicht erreichbar: ' + e.message; }

  const healthy = dbStatus === 'ok' && ollamaStatus === 'ok';
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    version,
    timestamp: new Date().toISOString(),
    checks: { database: dbStatus, ollama: ollamaStatus }
  });
});

// Version
app.get('/api/version', (req, res) => res.json({ version, name: 'JobRadar' }));

app.use('/api/bewerbungen', require('./routes/bewerbungen'));
app.use('/api/profil',      require('./routes/profil'));
app.use('/api/vorlagen',    require('./routes/vorlagen'));
app.use('/api/suche',       require('./routes/suche'));
app.use('/api/ki',          require('./routes/ki'));

app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../public/index.html')));

app.listen(PORT, () => console.log(`🎯 JobRadar läuft auf http://localhost:${PORT}`));
