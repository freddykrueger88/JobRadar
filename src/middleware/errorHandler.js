/**
 * Zentraler Error-Handler
 * Fängt alle unbehandelten Fehler ab und gibt niemals Stack-Traces nach außen.
 */
function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const isProd = process.env.NODE_ENV === 'production';

  if (status >= 500) {
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.path} — ${err.message}`);
    if (!isProd) console.error(err.stack);
  }

  res.status(status).json({
    error: isProd && status >= 500
      ? 'Interner Serverfehler'
      : err.message || 'Unbekannter Fehler'
  });
}

function notFoundHandler(req, res) {
  const isProd = process.env.NODE_ENV === 'production';
  // In Production keine internen Routing-Infos preisgeben
  res.status(404).json({
    error: isProd ? 'Nicht gefunden' : `Route nicht gefunden: ${req.method} ${req.path}`
  });
}

module.exports = { errorHandler, notFoundHandler };
