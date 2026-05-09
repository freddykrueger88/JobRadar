require('dotenv').config();
const express = require('express');
const path = require('path');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Body-Parser ──
app.use(express.json({ limit: '512kb' }));
app.use(express.urlencoded({ extended: false, limit: '512kb' }));

// ── Rate-Limiting ──
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Zu viele Anfragen – bitte kurz warten.' }
});
const kiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'KI-Limit erreicht – bitte 5 Minuten warten.' }
});
app.use('/api/', apiLimiter);
app.use('/api/ki/', kiLimiter);

// ── Statische Dateien ──
app.use(express.static(path.join(__dirname, '../public'), {
  maxAge: '1d',
  etag: true,
}));

// ── Routen ──
app.use('/api/bewerbungen', require('./routes/bewerbungen'));
app.use('/api/vorlagen',    require('./routes/vorlagen'));
app.use('/api/profil',      require('./routes/profil'));
app.use('/api/erfahrungen', require('./routes/erfahrungen'));
app.use('/api/ki',          require('./routes/ki'));
app.use('/api/suche',       require('./routes/suche'));

// ── Fehler-Handler ──
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Interner Fehler' });
});

// ── SPA-Fallback ──
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => console.log(`JobRadar läuft auf Port ${PORT}`));
