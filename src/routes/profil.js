const express = require('express');
const router = express.Router();
const db = require('../db/database');

router.get('/', (req, res) => {
  const p = db.prepare('SELECT * FROM profil WHERE id=1').get();
  res.json(p || {});
});

router.put('/', (req, res) => {
  const { name, email, rollen, ort, keywords, blacklist, kurzprofil, staerken } = req.body;
  db.prepare(`UPDATE profil SET name=?,email=?,rollen=?,ort=?,keywords=?,blacklist=?,kurzprofil=?,staerken=? WHERE id=1`)
    .run(name||'',email||'',rollen||'',ort||'',keywords||'',blacklist||'',kurzprofil||'',staerken||'');
  res.json({ ok: true });
});

module.exports = router;
