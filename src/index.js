'use strict';

require('dotenv').config();
const express    = require('express');
const path       = require('path');
const rateLimit  = require('express-rate-limit');
const helmet     = require('helmet');
const { version } = require('../package.json');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Datenbank + Migrationen beim Start
require('./db/database');

const app    = express();
const PORT   = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

// ── Security
app.use(helmet());

// ── Body-Parser
app.use(express.json({ limit: '512kb' }));
app.use(express.urlencoded({ extended: false, limit: '512kb' }));

// ── Rate-Limiting
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000, max: 200,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Zu viele Anfragen – bitte kurz warten.' }
}));
app.use('/api/ki/', rateLimit({
  windowMs: 5 * 60 * 1000, max: 20,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'KI-Limit erreicht – bitte 5 Minuten warten.' }
}));

// ── Statische Dateien
app.use(express.static(path.join(__dirname, '../public'), { maxAge: '1d', etag: true }));

// ── Health
app.get('/health', (req, res) => {
  if (isProd && !['localhost','127.0.0.1'].includes(req.hostname)) return res.status(404).end();
  const db = require('./db/adapter');
  let dbOk = false;
  try { db.get('SELECT 1'); dbOk = true; } catch (_) {}
  res.status(dbOk ? 200 : 503).json({ version, checks: { db: dbOk ? 'ok' : 'error' } });
});

// ── API-Routen
app.use('/api/bewerbungen',   require('./routes/bewerbungen'));
app.use('/api/bewerbungen/:id/dokumente', require('./routes/dokumente'));  // mergeParams
app.use('/api/suche',         require('./routes/suche'));
app.use('/api/ki',            require('./routes/ki'));
app.use('/api/profil',        require('./routes/profil'));
app.use('/api/erfahrungen',   require('./routes/erfahrungen'));
app.use('/api/vault',         require('./routes/vault'));
app.use('/api/import',        require('./routes/import'));
app.use('/api/einstellungen', require('./routes/einstellungen'));
app.use('/api/push',          require('./routes/push'));
app.use('/api/vorlagen',      require('./routes/vorlagen'));

// ── SPA-Fallback (vor den Error-Handlern, nach allen API-Routen)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ── Fehler-Handler (immer zuletzt)
app.use(notFoundHandler);
app.use(errorHandler);

if (require.main === module) {
  app.listen(PORT, () => console.log(`🎯 JobRadar v${version} läuft auf Port ${PORT}`));
}

module.exports = app;
