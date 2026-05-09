// ── Dokumente UI ─────────────────────────────────────────────────────────────

const DOK_TYPEN = [
  { value: 'anschreiben', label: '📝 Anschreiben' },
  { value: 'lebenslauf',  label: '📄 Lebenslauf'  },
  { value: 'sonstiges',  label: '📎 Sonstiges'   },
];

function formatBytes(bytes) {
  if (bytes < 1024)        return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function dokTypLabel(typ) {
  return DOK_TYPEN.find(t => t.value === typ)?.label || '📎 ' + typ;
}

async function ladeDoKumente(bewerbungId) {
  try {
    return await api('/api/dokumente/' + bewerbungId);
  } catch(e) {
    return [];
  }
}

function renderDokumenteListe(docs, bewerbungId) {
  if (!docs.length) {
    return `<p class="muted" style="font-size:14px;margin:0">Noch keine Dokumente hochgeladen.</p>`;
  }
  return docs.map(d => `
    <div style="display:flex;justify-content:space-between;align-items:center;
                padding:8px 12px;background:var(--surface2);border-radius:8px;margin-bottom:6px">
      <div style="min-width:0">
        <div style="font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
          ${dokTypLabel(d.typ)} &nbsp;<span style="font-weight:400">${esc(d.originalname)}</span>
        </div>
        <div class="muted" style="font-size:12px;margin-top:2px">
          ${formatBytes(d.groesse)} · ${esc((d.hochgeladen_am||'').slice(0,16).replace('T',' '))}
        </div>
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0;margin-left:12px">
        <a href="/api/dokumente/download/${d.id}" download="${esc(d.originalname)}"
           class="btn small" title="Herunterladen">⬇ Download</a>
        <button class="btn small" style="color:var(--error);border-color:var(--error)"
                onclick="deleteDokument(${d.id}, ${bewerbungId})" title="Löschen">🗑</button>
      </div>
    </div>
  `).join('');
}

window.openDokumenteModal = async function(bewerbungId, firmaName) {
  const docs = await ladeDoKumente(bewerbungId);

  const modalId = 'modal-dok-' + bewerbungId;
  const existing = document.getElementById(modalId);
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.id = modalId;
  modal.innerHTML = `
    <div class="modal" style="max-width:560px;width:100%">
      <button class="modal-close" onclick="document.getElementById('${modalId}').remove()">✕</button>
      <h2 style="margin-bottom:4px">📎 Dokumente</h2>
      <p class="muted" style="font-size:13px;margin-bottom:16px">${esc(firmaName || '')}</p>

      <!-- Dateiliste -->
      <div id="dok-liste-${bewerbungId}">
        ${renderDokumenteListe(docs, bewerbungId)}
      </div>

      <!-- Upload-Bereich -->
      <div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--border)">
        <h3 style="margin-bottom:12px;font-size:15px">Datei hochladen</h3>
        <div style="display:flex;flex-direction:column;gap:10px">
          <select id="dok-typ-${bewerbungId}" class="form-input">
            ${DOK_TYPEN.map(t => `<option value="${t.value}">${t.label}</option>`).join('')}
          </select>
          <div id="dok-dropzone-${bewerbungId}"
               style="border:2px dashed var(--border);border-radius:10px;padding:24px;
                      text-align:center;cursor:pointer;transition:border-color .2s;
                      color:var(--muted);font-size:14px"
               onclick="document.getElementById('dok-file-${bewerbungId}').click()"
               ondragover="event.preventDefault();this.style.borderColor='var(--accent)'"
               ondragleave="this.style.borderColor='var(--border)'"
               ondrop="handleDokDrop(event,${bewerbungId})">
            📂 Klicken oder Datei hierher ziehen<br>
            <span style="font-size:12px">PDF, DOCX, DOC, PNG, JPEG · max. 10 MB</span>
          </div>
          <input type="file" id="dok-file-${bewerbungId}" style="display:none"
                 accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                 onchange="uploadDokument(${bewerbungId})">
          <div id="dok-progress-${bewerbungId}" style="display:none">
            <div style="height:4px;background:var(--surface2);border-radius:2px;overflow:hidden">
              <div id="dok-bar-${bewerbungId}"
                   style="height:100%;width:0%;background:var(--accent);transition:width .3s"></div>
            </div>
            <p class="muted" style="font-size:12px;margin-top:6px" id="dok-status-${bewerbungId}">Wird hochgeladen…</p>
          </div>
        </div>
      </div>
    </div>`;

  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
};

window.uploadDokument = async function(bewerbungId) {
  const fileInput = document.getElementById('dok-file-' + bewerbungId);
  const typ       = document.getElementById('dok-typ-'  + bewerbungId)?.value || 'sonstiges';
  const progress  = document.getElementById('dok-progress-' + bewerbungId);
  const bar       = document.getElementById('dok-bar-'      + bewerbungId);
  const status    = document.getElementById('dok-status-'   + bewerbungId);

  if (!fileInput?.files?.length) return;
  const file = fileInput.files[0];

  // 10 MB Limit client-seitig
  if (file.size > 10 * 1024 * 1024) {
    toast('Datei zu groß – max. 10 MB', 'error');
    return;
  }

  const fd = new FormData();
  fd.append('datei', file);
  fd.append('typ', typ);

  if (progress) progress.style.display = 'block';
  if (bar)      bar.style.width = '30%';
  if (status)   status.textContent = 'Wird hochgeladen…';

  try {
    const xhr = new XMLHttpRequest();
    await new Promise((resolve, reject) => {
      xhr.upload.onprogress = e => {
        if (e.lengthComputable && bar)
          bar.style.width = Math.round((e.loaded / e.total) * 100) + '%';
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText));
        else reject(new Error(JSON.parse(xhr.responseText)?.error || 'Upload fehlgeschlagen'));
      };
      xhr.onerror = () => reject(new Error('Netzwerkfehler'));
      xhr.open('POST', '/api/dokumente/' + bewerbungId);
      xhr.send(fd);
    });

    if (bar)    bar.style.width = '100%';
    if (status) status.textContent = '✓ Hochgeladen!';
    toast('Dokument hochgeladen ✓');

    // Liste neu laden
    const docs = await ladeDoKumente(bewerbungId);
    const liste = document.getElementById('dok-liste-' + bewerbungId);
    if (liste) liste.innerHTML = renderDokumenteListe(docs, bewerbungId);

    setTimeout(() => { if (progress) progress.style.display = 'none'; }, 2000);
    fileInput.value = '';
  } catch(e) {
    toast('Upload-Fehler: ' + e.message, 'error');
    if (status) status.textContent = '✗ ' + e.message;
    setTimeout(() => { if (progress) progress.style.display = 'none'; }, 3000);
  }
};

window.handleDokDrop = async function(event, bewerbungId) {
  event.preventDefault();
  const dz = document.getElementById('dok-dropzone-' + bewerbungId);
  if (dz) dz.style.borderColor = 'var(--border)';
  const fileInput = document.getElementById('dok-file-' + bewerbungId);
  if (!fileInput || !event.dataTransfer?.files?.length) return;
  // DataTransfer auf Input übertragen
  const dt = new DataTransfer();
  dt.items.add(event.dataTransfer.files[0]);
  fileInput.files = dt.files;
  await uploadDokument(bewerbungId);
};

window.deleteDokument = async function(docId, bewerbungId) {
  if (!confirm('Dokument wirklich löschen?')) return;
  try {
    await api('/api/dokumente/' + docId, 'DELETE');
    toast('Dokument gelöscht');
    const docs  = await ladeDoKumente(bewerbungId);
    const liste = document.getElementById('dok-liste-' + bewerbungId);
    if (liste) liste.innerHTML = renderDokumenteListe(docs, bewerbungId);
  } catch(e) {
    toast('Fehler beim Löschen', 'error');
  }
};
