'use strict';

/**
 * Zod-Validierungs-Middleware
 * Verwendung: router.post('/', validate(MeinSchema), handler)
 */
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validierungsfehler',
        details: result.error.errors.map(e => ({
          feld:    e.path.join('.'),
          problem: e.message
        }))
      });
    }
    req.body = result.data;
    next();
  };
}

module.exports = { validate };
