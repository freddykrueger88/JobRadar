'use strict';
const { z } = require('zod');

const STATUS_WERTE = ['beworben','interview','angebot','abgelehnt','archiviert'];

const BewerbungCreateSchema = z.object({
  titel:               z.string().min(1).max(200),
  firma:               z.string().min(1).max(200),
  ort:                 z.string().max(200).optional().nullable(),
  quelle:              z.string().max(100).optional().nullable(),
  url:                 z.string().url().optional().nullable().or(z.literal('')),
  status:              z.enum(STATUS_WERTE).default('beworben'),
  beworben_am:         z.string().optional().nullable(),
  followup_datum:      z.string().optional().nullable(),
  bewertung:           z.number().int().min(1).max(5).optional().nullable(),
  notizen:             z.string().max(5000).optional().nullable(),
  anschreiben:         z.string().optional().nullable(),
  stellenbeschreibung: z.string().max(10000).optional().nullable(),
  lebenslauf_id:       z.number().int().optional().nullable(),
});

const BewerbungUpdateSchema = BewerbungCreateSchema.partial();

const KommentarSchema = z.object({
  text: z.string().min(1).max(2000),
});

module.exports = { BewerbungCreateSchema, BewerbungUpdateSchema, KommentarSchema };
