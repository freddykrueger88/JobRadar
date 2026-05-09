/* Block 1 – Stellenanzeige-Snapshot */

window.zeigeSnapshot = function(beschreibung) {
  const existing = document.getElementById('modalSnapshot');
  if (existing) existing.remove();
  const safe = String(beschreibung || '').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const modal = document.createElement('div');
  modal.id = 'modalSnapshot';
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
    <div class="modal" style="max-width:640px">
      <button class="modal-close" onclick="document.getElementById('modalSnapshot').remove()">&#x2715;</button>
      <h2>\uD83D\uDCCB Gespeicherte Stellenanzeige</h2>
      <p class="muted" style="font-size:13px;margin-bottom:14px">Snapshot beim Bewerben gespeichert – auch wenn die Stelle offline ist.</p>
      <div style="background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:16px;max-height:60vh;overflow-y:auto;font-size:14px;line-height:1.7;white-space:pre-wrap">${safe || '<span style="color:var(--muted)">Kein Snapshot vorhanden.</span>'}</div>
      <div style="margin-top:14px;display:flex;gap:10px">
        <button class="btn" onclick="navigator.clipboard.writeText(${JSON.stringify(beschreibung||'')}).then(()=>window.toast&&window.toast('Kopiert \u2713'))">Kopieren</button>
        <button class="btn" onclick="document.getElementById('modalSnapshot').remove()">Schlie\u00dfen</button>
      </div>
    </div>`;
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
};
