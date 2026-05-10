'use strict';

const router = require('express').Router();
const svc    = require('../services/push.service');

router.get('/vapid-public-key', (req, res) => {
  const key = svc.getPublicKey();
  if (!key) return res.status(503).json({ error: 'Push nicht konfiguriert' });
  res.json({ publicKey: key });
});

router.post('/subscribe', (req, res, next) => {
  try {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth)
      return res.status(400).json({ error: 'Ungültige Subscription' });
    svc.saveSubscription({ endpoint, p256dh: keys.p256dh, auth: keys.auth });
    res.status(201).json({ ok: true });
  } catch (e) { next(e); }
});

router.delete('/subscribe', (req, res, next) => {
  try {
    svc.removeSubscription(req.body.endpoint);
    res.status(204).end();
  } catch (e) { next(e); }
});

module.exports = router;
