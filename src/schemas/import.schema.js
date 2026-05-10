'use strict';
const { z } = require('zod');

const ImportMappingSchema = z.object({
  titel:       z.string().optional(),
  firma:       z.string().optional(),
  ort:         z.string().optional(),
  status:      z.string().optional(),
  beworben_am: z.string().optional(),
  url:         z.string().optional(),
  notizen:     z.string().optional(),
  quelle:      z.string().optional(),
}).optional();

module.exports = { ImportMappingSchema };
