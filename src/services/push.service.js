'use strict';

const webpush = require('web-push');
const db = require('../db/adapter');

// VAPID-Keys werden beim ersten Start automatisch generiert und in .env geschrieben
// oder aus Umgebungsvariablen gelesen
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL || 'jobradar@localhost'}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

function getPublicKey() {
  return process.env.VAPID_PUBLIC_KEY || null;
}

function saveSubscription({ endpoint, p256dh, auth }) {
  db.run(
    'INSERT OR REPLACE INTO push_subscriptions (endpoint, p256dh, auth) VALUES (?,?,?)',
    [endpoint, p256dh, auth]
  );
}

function removeSubscription(endpoint) {
  db.run('DELETE FROM push_subscriptions WHERE endpoint = ?', [endpoint]);
}

async function sendToAll(title, body, url = '/') {
  if (!process.env.VAPID_PUBLIC_KEY) return;
  const subs = db.all('SELECT * FROM push_subscriptions');
  const payload = JSON.stringify({ title, body, url });

  await Promise.allSettled(
    subs.map(async sub => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
      } catch (err) {
        // Abgelaufene Subscriptions entfernen
        if (err.statusCode === 410) removeSubscription(sub.endpoint);
      }
    })
  );
}

module.exports = { getPublicKey, saveSubscription, removeSubscription, sendToAll };
