// ── Settings: 5 Blöcke ──

const SETTINGS_KEY = 'jr_settings';

function getSettings() {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}; } catch(e) { return {}; }
}
function saveSetting(key, value) {
  const s = getSettings();
  s[key] = value;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}
function getSetting(key, fallback) {
  const v = getSettings()[key];
  return v !== undefined ? v : fallback;
}
window.getSetting = getSetting;
window.saveSetting = saveSetting;

// ── Block 1: Suche ──
window.applySearchDefaults = function() {
  const radius = getSetting('defaultRadius', '25');
  const quelle = getSetting('defaultQuelle', 'all');
  const count  = getSetting('defaultCount', '15');
  const el = document.getElementById('sucheUmkreis');
  const el2 = document.getElementById('sucheQuelle');
  const el3 = document.getElementById('sucheCount');
  if (el) el.value = radius;
  if (el2) el2.value = quelle;
  if (el3) el3.value = count;
};

// ── Block 2: KI ──
window.applyKiDefaults = function() {
  const model   = getSetting('defaultKiModel', '');
  const sprache = getSetting('defaultKiSprache', '');
  const stilId  = getSetting('defaultKiStil', '');
  const elM = document.getElementById('kiModel');
  const elS = document.getElementById('vorlagenSelect');
  if (elM && model) elM.value = model;
  if (elS && stilId !== '') elS.value = stilId;
};

// ── Block 3: Bewerbungen – Auto-Archivierung ──
window.runAutoArchive = async function(silent=false) {
  const days = parseInt(getSetting('autoArchiveDays', 0));
  if (!days || days <= 0) return;
  try {
    const res = await fetch('/api/bewerbungen?archiviert=0');
    const list = await res.json();
    const cutoff = new Date(Date.now() - days * 86400000).toISOString().slice(0,10);
    const toArchive = list.filter(b =>
      b.beworben_am && b.beworben_am < cutoff &&
      b.status !== 'angenommen' && !b.archiviert
    );
    for (const b of toArchive) {
      await fetch('/api/bewerbungen/'+b.id, {
        method:'PUT', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({archiviert:1})
      });
    }
    if (!silent && toArchive.length > 0)
      window.toast && window.toast(toArchive.length + ' Bewerbung(en) automatisch archiviert');
  } catch(e) { console.warn('Auto-Archiv Fehler:', e); }
};

// ── Block 4: Daten ──
window.exportBackup = async function() {
  try {
    const [bewerbungen, profil, vorlagen] = await Promise.all([
      fetch('/api/bewerbungen?archiviert=0').then(r=>r.json()),
      fetch('/api/profil').then(r=>r.json()),
      fetch('/api/vorlagen').then(r=>r.json())
    ]);
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      bewerbungen, profil, vorlagen,
      settings: getSettings()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'jobradar-backup-' + new Date().toISOString().slice(0,10) + '.json';
    a.click();
    window.toast && window.toast('Backup exportiert ✓');
  } catch(e) { window.toast && window.toast('Export fehlgeschlagen', 'error'); }
};

window.importBackup = function() {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = '.json';
  input.onchange = async e => {
    const file = e.target.files[0]; if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.version || !data.bewerbungen) throw new Error('Ungültige Backup-Datei');
      if (!confirm('Backup importieren? Bestehende Daten werden NICHT überschrieben – nur fehlende werden ergänzt.')) return;
      // Profil
      if (data.profil) await fetch('/api/profil', {method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data.profil)});
      // Vorlagen
      if (data.vorlagen?.length) {
        for (const v of data.vorlagen) {
          await fetch('/api/vorlagen', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(v)});
        }
      }
      // Settings
      if (data.settings) localStorage.setItem(SETTINGS_KEY, JSON.stringify(data.settings));
      window.toast && window.toast('Backup importiert ✓');
      setTimeout(() => location.reload(), 1500);
    } catch(e) { window.toast && window.toast('Import fehlgeschlagen: ' + e.message, 'error'); }
  };
  input.click();
};

window.resetDatabase = function() {
  if (!confirm('⚠️ ALLE Bewerbungen, Vorlagen und das Profil werden UNWIDERRUFLICH gelöscht!\n\nWirklich fortfahren?')) return;
  if (!confirm('Letzter Check: Wirklich alles löschen?')) return;
  fetch('/api/bewerbungen/reset', {method:'POST'})
    .then(() => { window.toast && window.toast('Datenbank zurückgesetzt'); setTimeout(()=>location.reload(), 1500); })
    .catch(() => window.toast && window.toast('Reset fehlgeschlagen – Endpunkt nicht vorhanden', 'error'));
};

// ── Block 5: UI ──
window.applyUiSettings = function() {
  const compact = getSetting('compactView', false);
  document.documentElement.classList.toggle('compact-view', compact);
};

// ── Settings Page: Werte laden ──
window.initSettingsPage = function() {
  const s = getSettings();
  // Suche
  const sr = document.getElementById('setDefaultRadius'); if(sr) sr.value = s.defaultRadius ?? '25';
  const sq = document.getElementById('setDefaultQuelle'); if(sq) sq.value = s.defaultQuelle ?? 'all';
  const sc = document.getElementById('setDefaultCount');  if(sc) sc.value = s.defaultCount  ?? '15';
  // KI
  const sm = document.getElementById('setDefaultKiModel');    if(sm) sm.value = s.defaultKiModel  ?? '';
  const sl = document.getElementById('setDefaultKiSprache');  if(sl) sl.value = s.defaultKiSprache ?? '';
  // Bewerbungen
  const sa = document.getElementById('setAutoArchiveDays');   if(sa) sa.value = s.autoArchiveDays ?? 0;
  const sf = document.getElementById('setFollowupDays');      if(sf) sf.value = s.followupDays    ?? 14;
  // UI
  const cv = document.getElementById('setCompactView');       if(cv) cv.checked = s.compactView  ?? false;
};

window.saveSettingsBlock = function(block) {
  if (block === 'suche') {
    saveSetting('defaultRadius', document.getElementById('setDefaultRadius')?.value ?? '25');
    saveSetting('defaultQuelle', document.getElementById('setDefaultQuelle')?.value ?? 'all');
    saveSetting('defaultCount',  document.getElementById('setDefaultCount')?.value  ?? '15');
    window.applySearchDefaults();
    window.toast && window.toast('Suche-Einstellungen gespeichert ✓');
  }
  if (block === 'ki') {
    saveSetting('defaultKiModel',   document.getElementById('setDefaultKiModel')?.value   ?? '');
    saveSetting('defaultKiSprache', document.getElementById('setDefaultKiSprache')?.value ?? '');
    window.applyKiDefaults();
    window.toast && window.toast('KI-Einstellungen gespeichert ✓');
  }
  if (block === 'bewerbungen') {
    saveSetting('autoArchiveDays', parseInt(document.getElementById('setAutoArchiveDays')?.value) || 0);
    saveSetting('followupDays',    parseInt(document.getElementById('setFollowupDays')?.value)    || 14);
    window.toast && window.toast('Bewerbungs-Einstellungen gespeichert ✓');
  }
  if (block === 'ui') {
    const compact = document.getElementById('setCompactView')?.checked ?? false;
    saveSetting('compactView', compact);
    window.applyUiSettings();
    window.toast && window.toast('Oberfläche gespeichert ✓');
  }
};
