'use strict';

const isProd = process.env.NODE_ENV === 'production';

function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Nicht gefunden' });
}

function errorHandler(err, req, res, _next) {
  console.error('[error]', err);
  const status  = err.status || err.statusCode || 500;
  const message = isProd && status === 500 ? 'Interner Serverfehler' : err.message;
  res.status(status).json({ error: message });
}

module.exports = { notFoundHandler, errorHandler };
