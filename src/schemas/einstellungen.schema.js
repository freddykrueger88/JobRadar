'use strict';
const { z } = require('zod');

const EinstellungenSchema = z.object({
  ki_modell:          z.string().min(1).max(100).optional(),
  ki_stil:            z.enum(['formell','modern','kurz']).optional(),
  ki_sprache:         z.enum(['deutsch','englisch']).optional(),
  ki_laenge:          z.enum(['kurz','mittel','lang']).optional(),
  ki_hinweise:        z.string().max(1000).optional().nullable(),
  push_aktiv:         z.boolean().optional(),
  push_intervall_min: z.number().int().min(5).max(1440).optional(),
  suche_umkreis_km:   z.number().int().min(0).max(500).optional(),
  suche_auto_aktiv:   z.boolean().optional(),
  dark_mode:          z.enum(['auto','dark','light']).optional(),
}).strict();

module.exports = { EinstellungenSchema };
