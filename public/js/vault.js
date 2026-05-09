/* Block 2 – Lebenslauf-Vault */
(function(){

let vaultData = [];

async function ladeVault() {
  try {
    const r = await fetch('/api/vault');
    vaultData = await r.json();
  } catch(e) { vaultData = []; }
  renderVault();
  aktualisiereVaultSelects();
}

function renderVault() {
  const container = document.getElementById('vaultListe');
  if (!container) return;
  if (!vaultData.length) {
    container.innerHTML = '<p class="muted" style="font-size:14px">Noch kein Lebenslauf hochgeladen.</p>';
    return;
  }
  container.innerHTML = vaultData.map(v => `
    <div class="job" style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap" data-id="${v.id}">
      <div>
        <strong style="font-size:15px">${esc(v.name)}</strong>
        <div class="muted" style="font-size:12px;margin-top:3px">
          ${esc(v.originalname)} &middot; ${Math.round(v.groesse/1024)} KB &middot; ${v.hochgeladen_am ? v.hochgeladen_am.slice(0,10) : ''}
        </div>
        ${v.notiz ? `<div style="font-size:13px;margin-top:4px;color:var(--muted)">${esc(v.notiz)}</div>` : ''}
      </div>
      <div style="display:flex;gap:8px">
        <a class="btn btn small" href="/api/vault/${v.id}/download" download>\uD83D\uDCE5 Download</a>
        <button class="btn small" style="color:var(--error);border-color:var(--error)" onclick="window._vaultDelete(${v.id})">\uD83D\uDDD1</button>
      </div>
    </div>`).join('');
}

function aktualisiereVaultSelects() {
  document.querySelectorAll('.vault-select').forEach(sel => {
    const current = sel.value;
    sel.innerHTML = '<option value="">\u2014 kein CV verkn\u00fcpft \u2014</option>' +
      vaultData.map(v => `<option value="${v.id}" ${String(current)===String(v.id)?'selected':''}>${esc(v.name)}</option>`).join('');
  });
}

function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

window._vaultDelete = async function(id) {
  if (!confirm('Lebenslauf l\u00f6schen?')) return;
  await fetch('/api/vault/'+id, { method:'DELETE' });
  ladeVault();
  if (window.toast) window.toast('Gel\u00f6scht');
};

window._vaultUpload = async function() {
  const file  = document.getElementById('vaultDatei')?.files?.[0];
  const name  = document.getElementById('vaultName')?.value?.trim();
  const notiz = document.getElementById('vaultNotiz')?.value?.trim();
  if (!file) return window.toast && window.toast('Bitte eine Datei w\u00e4hlen');
  const fd = new FormData();
  fd.append('datei', file);
  fd.append('name', name || file.name);
  if (notiz) fd.append('notiz', notiz);
  const r = await fetch('/api/vault', { method:'POST', body: fd });
  if (!r.ok) { const e = await r.json(); return window.toast && window.toast('Fehler: '+(e.error||r.status)); }
  if (document.getElementById('vaultDatei')) document.getElementById('vaultDatei').value = '';
  if (document.getElementById('vaultName'))  document.getElementById('vaultName').value  = '';
  if (document.getElementById('vaultNotiz')) document.getElementById('vaultNotiz').value = '';
  ladeVault();
  window.toast && window.toast('Lebenslauf gespeichert \u2713');
};

window.getVaultData   = () => vaultData;
window.ladeVault      = ladeVault;
window.aktualisiereVaultSelects = aktualisiereVaultSelects;

document.addEventListener('DOMContentLoaded', ladeVault);

})();
