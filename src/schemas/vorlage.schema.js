'use strict';
const { z } = require('zod');

const TON_WERTE      = ['formell', 'modern', 'kreativ', 'kurz'];
const SPRACHE_WERTE  = ['deutsch', 'englisch'];
const LAENGE_WERTE   = ['kurz', 'mittel', 'lang'];

const VorlageCreateSchema = z.object({
  name:     z.string().min(1).max(200),
  ton:      z.enum(TON_WERTE).default('formell'),
  sprache:  z.enum(SPRACHE_WERTE).default('deutsch'),
  laenge:   z.enum(LAENGE_WERTE).default('mittel'),
  hinweise: z.string().max(1000).optional().default(''),
});

module.exports = { VorlageCreateSchema };
