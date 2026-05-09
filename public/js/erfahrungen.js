// ── Erfahrungen (Skills, Stationen, Zertifikate) ──
// Daten werden in localStorage gespeichert (Option A)
// und beim KI-Request via getErfahrungenKontext() als Text-Block mitgegeben.

const EXP_KEY = 'jobradar_erfahrungen';

function loadErfahrungenData() {
  try { return JSON.parse(localStorage.getItem(EXP_KEY)) || { skills:[], stationen:[], zertifikate:[] }; }
  catch(e) { return { skills:[], stationen:[], zertifikate:[] }; }
}

function saveErfahrungenData(data) {
  localStorage.setItem(EXP_KEY, JSON.stringify(data));
}

// ── SKILLS ──
function renderSkills() {
  const data = loadErfahrungenData();
  const el = document.getElementById('skillsList');
  if (!el) return;
  if (!data.skills.length) {
    el.innerHTML = '<p class="muted" style="font-size:14px">Noch keine Skills eingetragen.</p>';
    return;
  }
  const levelColor = { 'Anf\u00e4nger':'var(--muted)', 'Fortgeschritten':'var(--accent)', 'Experte':'var(--success)' };
  el.innerHTML = '<div class="chips" style="gap:8px">' +
    data.skills.map((s, i) =>
      `<span class="chip" style="border-color:${levelColor[s.level]||'var(--accent)'};display:inline-flex;align-items:center;gap:6px">
        <strong>${esc(s.name)}</strong>
        <span style="font-size:12px;opacity:.8">${esc(s.level)}</span>
        <button onclick="deleteSkill(${i})" style="background:none;border:none;cursor:pointer;color:var(--muted);font-size:14px;padding:0;line-height:1">&times;</button>
      </span>`
    ).join('') + '</div>';
}

window.addSkill = function() {
  const name = document.getElementById('skillName')?.value.trim();
  const level = document.getElementById('skillLevel')?.value || 'Fortgeschritten';
  if (!name) { window.toast && window.toast('Bitte einen Skill-Namen eingeben', 'warn'); return; }
  const data = loadErfahrungenData();
  if (data.skills.find(s => s.name.toLowerCase() === name.toLowerCase())) {
    window.toast && window.toast('Skill bereits vorhanden', 'warn'); return;
  }
  data.skills.push({ name, level });
  saveErfahrungenData(data);
  document.getElementById('skillName').value = '';
  renderSkills();
  window.toast && window.toast(name + ' hinzugef\u00fcgt \u2713');
};

window.deleteSkill = function(i) {
  const data = loadErfahrungenData();
  const name = data.skills[i]?.name || '';
  data.skills.splice(i, 1);
  saveErfahrungenData(data);
  renderSkills();
  window.toast && window.toast(name + ' entfernt');
};

// Enter-Taste im Skill-Input
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('skillName')?.addEventListener('keydown', e => { if (e.key === 'Enter') window.addSkill(); });
});

// ── BERUFSSTATIONEN ──
function renderStationen() {
  const data = loadErfahrungenData();
  const el = document.getElementById('stationenList');
  if (!el) return;
  if (!data.stationen.length) {
    el.innerHTML = '<p class="muted" style="font-size:14px">Noch keine Stationen eingetragen.</p>';
    return;
  }
  el.innerHTML = data.stationen.map((s, i) => `
    <div class="card" style="margin-bottom:12px;border-left:3px solid var(--accent)">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
        <div>
          <strong>${esc(s.rolle)}</strong> &middot; <span class="muted">${esc(s.firma)}</span>
          <div class="muted" style="font-size:13px;margin-top:2px">${esc(s.von||'')}${s.bis?' – '+esc(s.bis):' – heute'}</div>
        </div>
        <button class="btn small" style="color:var(--error);border-color:var(--error);flex-shrink:0" onclick="deleteStation(${i})">&#x1F5D1;</button>
      </div>
      ${s.taetigkeiten ? `<div style="margin-top:10px;font-size:14px;white-space:pre-wrap">${esc(s.taetigkeiten)}</div>` : ''}
    </div>`
  ).join('');
}

window.addStation = function() {
  const firma = document.getElementById('stFirma')?.value.trim();
  const rolle = document.getElementById('stRolle')?.value.trim();
  const von   = document.getElementById('stVon')?.value;
  const bis   = document.getElementById('stBis')?.value;
  const taetigkeiten = document.getElementById('stTaetigkeiten')?.value.trim();
  if (!firma || !rolle) { window.toast && window.toast('Firma und Rolle sind Pflichtfelder', 'warn'); return; }
  const data = loadErfahrungenData();
  data.stationen.unshift({ firma, rolle, von, bis, taetigkeiten });
  saveErfahrungenData(data);
  ['stFirma','stRolle','stVon','stBis','stTaetigkeiten'].forEach(id => { const el = document.getElementById(id); if(el) el.value=''; });
  renderStationen();
  window.toast && window.toast(rolle + ' bei ' + firma + ' hinzugef\u00fcgt \u2713');
};

window.deleteStation = function(i) {
  const data = loadErfahrungenData();
  data.stationen.splice(i, 1);
  saveErfahrungenData(data);
  renderStationen();
  window.toast && window.toast('Station entfernt');
};

// ── ZERTIFIKATE ──
function renderZertifikate() {
  const data = loadErfahrungenData();
  const el = document.getElementById('zertifikateList');
  if (!el) return;
  if (!data.zertifikate.length) {
    el.innerHTML = '<p class="muted" style="font-size:14px">Noch keine Eintr\u00e4ge.</p>';
    return;
  }
  el.innerHTML = '<div class="stack" style="gap:8px">' +
    data.zertifikate.map((z, i) => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:var(--surface2);border-radius:8px">
        <div>
          <strong>${esc(z.titel)}</strong>
          <span class="muted" style="font-size:13px;margin-left:10px">${esc(z.institution||'')}${z.jahr?' &middot; '+esc(z.jahr):''}</span>
        </div>
        <button class="btn small" style="color:var(--error);border-color:var(--error)" onclick="deleteZertifikat(${i})">&#x1F5D1;</button>
      </div>`
    ).join('') + '</div>';
}

window.addZertifikat = function() {
  const titel = document.getElementById('zertTitel')?.value.trim();
  const jahr  = document.getElementById('zertJahr')?.value.trim();
  const institution = document.getElementById('zertInstitution')?.value.trim();
  if (!titel) { window.toast && window.toast('Bitte einen Titel eingeben', 'warn'); return; }
  const data = loadErfahrungenData();
  data.zertifikate.push({ titel, jahr, institution });
  saveErfahrungenData(data);
  ['zertTitel','zertJahr','zertInstitution'].forEach(id => { const el = document.getElementById(id); if(el) el.value=''; });
  renderZertifikate();
  window.toast && window.toast(titel + ' hinzugef\u00fcgt \u2713');
};

window.deleteZertifikat = function(i) {
  const data = loadErfahrungenData();
  data.zertifikate.splice(i, 1);
  saveErfahrungenData(data);
  renderZertifikate();
  window.toast && window.toast('Eintrag entfernt');
};

// ── Speichern-Button (zeigt nur Toast, Daten sind schon live gespeichert) ──
window.saveErfahrungen = function() {
  window.toast && window.toast('Erfahrungen gespeichert \u2713');
};

// ── KI-Kontext (wird von app.js beim KI-Request genutzt) ──
window.getErfahrungenKontext = function() {
  const data = loadErfahrungenData();
  let ctx = '';

  if (data.skills.length) {
    const grouped = {};
    data.skills.forEach(s => { (grouped[s.level] = grouped[s.level]||[]).push(s.name); });
    ctx += '## Skills\n';
    ['Experte','Fortgeschritten','Anf\u00e4nger'].forEach(lvl => {
      if (grouped[lvl]?.length) ctx += `- ${lvl}: ${grouped[lvl].join(', ')}\n`;
    });
    ctx += '\n';
  }

  if (data.stationen.length) {
    ctx += '## Berufserfahrung\n';
    data.stationen.forEach(s => {
      const zeitraum = (s.von||'')+(s.bis?' – '+s.bis:' – heute');
      ctx += `### ${s.rolle} bei ${s.firma}${zeitraum?' ('+zeitraum+')':''}\n`;
      if (s.taetigkeiten) ctx += s.taetigkeiten.split('\n').filter(Boolean).map(l=>'- '+l.replace(/^[\u2022\-*]\s*/,'')).join('\n') + '\n';
      ctx += '\n';
    });
  }

  if (data.zertifikate.length) {
    ctx += '## Ausbildung & Zertifikate\n';
    data.zertifikate.forEach(z => {
      ctx += `- ${z.titel}${z.institution?' ('+z.institution+')':''}${z.jahr?' '+z.jahr:''}\n`;
    });
    ctx += '\n';
  }

  return ctx.trim();
};

// Tab-Init
window.loadErfahrungen = function() {
  renderSkills();
  renderStationen();
  renderZertifikate();
};
