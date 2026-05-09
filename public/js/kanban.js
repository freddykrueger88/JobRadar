/* Block 3 – Kanban-Board */
(function(){

const SPALTEN = [
  { key:'beworben',   label:'\uD83D\uDCE8 Beworben',   color:'#1d4ed8' },
  { key:'interview',  label:'\uD83D\uDCAC Interview',  color:'#854d0e' },
  { key:'angenommen', label:'\u2705 Angenommen', color:'#15803d' },
  { key:'abgelehnt',  label:'\u274C Abgelehnt',  color:'#b91c1c' },
];

async function ladeKanban() {
  const board = document.getElementById('kanbanBoard');
  if (!board) return;
  board.innerHTML = '<p class="muted" style="padding:24px">Lade\u2026</p>';
  let rows = [];
  try {
    const r = await fetch('/api/bewerbungen?archiviert=0');
    rows = await r.json();
  } catch(e) {
    board.innerHTML = '<p class="muted">Fehler beim Laden.</p>';
    return;
  }
  renderKanban(rows);
}

function renderKanban(rows) {
  const board = document.getElementById('kanbanBoard');
  if (!board) return;
  const grouped = {};
  SPALTEN.forEach(s => { grouped[s.key] = []; });
  rows.forEach(r => { if (grouped[r.status]) grouped[r.status].push(r); });

  board.innerHTML = SPALTEN.map(s => `
    <div class="kanban-col">
      <div class="kanban-col-header" style="border-top:3px solid ${s.color}">
        <span>${s.label}</span>
        <span class="kanban-count">${grouped[s.key].length}</span>
      </div>
      <div class="kanban-cards" id="kcol-${s.key}">
        ${grouped[s.key].map(b => karteHTML(b)).join('') || '<div class="kanban-empty">Keine</div>'}
      </div>
    </div>`).join('');
}

function karteHTML(b) {
  const idx = SPALTEN.findIndex(s => s.key === b.status);
  const kannLinks  = idx > 0;
  const kannRechts = idx < SPALTEN.length - 1;
  const fds = b.followup_datum ? new Date(b.followup_datum) : null;
  const heute = new Date(); heute.setHours(0,0,0,0);
  const istFaellig = fds && fds < heute;
  return `<div class="kanban-card${istFaellig?' kanban-overdue':''}" data-id="${b.id}">
    <div class="kanban-card-title">${esc(b.titel)}</div>
    <div class="kanban-card-firma muted">${esc(b.firma)}${b.ort?' &middot; '+esc(b.ort):''}</div>
    ${b.beworben_am ? `<div class="kanban-card-date muted">${b.beworben_am.slice(0,10)}</div>` : ''}
    ${istFaellig ? '<div style="font-size:11px;color:var(--error);margin-top:3px">\uD83D\uDD34 Follow-up f\u00e4llig</div>' : ''}
    <div class="kanban-card-actions">
      ${kannLinks  ? `<button class="btn small" title="Zur\u00fcck" onclick="window._kanbanMove(${b.id},-1)">\u2190</button>` : '<span></span>'}
      ${kannRechts ? `<button class="btn small" title="Weiter"  onclick="window._kanbanMove(${b.id}, 1)">\u2192</button>` : '<span></span>'}
    </div>
  </div>`;
}

function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

window._kanbanMove = async function(id, dir) {
  let rows = [];
  try { const r = await fetch('/api/bewerbungen?archiviert=0'); rows = await r.json(); } catch(e) { return; }
  const b = rows.find(r => r.id === id);
  if (!b) return;
  const idx = SPALTEN.findIndex(s => s.key === b.status);
  const neu = SPALTEN[idx + dir];
  if (!neu) return;
  await fetch('/api/bewerbungen/'+id, {
    method:'PUT',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ status: neu.key })
  });
  ladeKanban();
  window.toast && window.toast(b.titel.slice(0,30)+' \u2192 '+neu.label);
};

window.ladeKanban = ladeKanban;

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.tab === 'kanban') ladeKanban();
    });
  });
});

})();
