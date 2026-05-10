'use strict';

/**
 * Parst einen Route-Parameter als positive Integer.
 * Gibt null zurück wenn der Wert kein gültiger Integer ist.
 * Verwendung: const id = parseId(req.params.id); if (!id) return res.status(400).json(...)
 */
function parseId(param) {
  const n = parseInt(param, 10);
  if (isNaN(n) || n <= 0 || String(n) !== String(param)) return null;
  return n;
}

module.exports = { parseId };
