'use strict';

const bewerbungenModule = (() => {
  const STATUS_LABELS = {
    beworben:  '📨 Beworben',
    interview: '🎤 Interview',
    angebot:   '🎉 Angebot',
    abgelehnt: '❌ Abgelehnt',
  };

  let _filter = { status: '', firma: '', archiviert: 0 };
  let _list   = [];

  async function init() {
    _renderShell();
    await _load();
    _bindEvents();
  }

  function _renderShell() {
    document.getElementById('main-content').innerHTML = `
      <div class="bewerbungen-page">
        <div class="page-header">
          <h1 class="page-title">Bewerbungen</h1>
          <button class="btn btn--primary" id="btn-neue-bew">+ Neue Bewerbung</button>
        </div>
        <div class="filter-bar">
          <input  type="text"   id="filter-firma"  placeholder="Firma filtern…" class="input">
          <select id="filter-status" class="input">
            <option value="">Alle Status</option>
            ${Object.entries(STATUS_LABELS).map(([v,l]) => `<option value="${v}">${l}</option>`).join('')}
          </select>
          <label class="checkbox-label">
            <input type="checkbox" id="filter-archiviert"> Archiviert
          </label>
        </div>
        <div id="bew-list" class="bew-list"></div>
      </div>

      <!-- Detail-Modal -->
      <dialog id="modal-bew" class="modal">
        <div class="modal__header">
          <h2 class="modal__title">Bewerbung</h2>
          <button class="modal__close" data-close-modal="modal-bew">&times;</button>
        </div>
        <div class="modal__body" id="modal-bew-body"></div>
      </dialog>

      <!-- Formular-Modal -->
      <dialog id="modal-bew-form" class="modal">
        <div class="modal__header">
          <h2 class="modal__title" id="form-title">Neue Bewerbung</h2>
          <button class="modal__close" data-close-modal="modal-bew-form">&times;</button>
        </div>
        <div class="modal__body">
          <form id="bew-form" class="form">
            <div class="form-group">
              <label>Stelle *</label>
              <input name="titel" class="input" required maxlength="200">
            </div>
            <div class="form-group">
              <label>Firma *</label>
              <input name="firma" class="input" required maxlength="200">
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Ort</label>
                <input name="ort" class="input" maxlength="200">
              </div>
              <div class="form-group">
                <label>Status</label>
                <select name="status" class="input">
                  ${Object.entries(STATUS_LABELS).map(([v,l]) => `<option value="${v}">${l}</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Beworben am</label>
                <input name="beworben_am" type="date" class="input">
              </div>
              <div class="form-group">
                <label>Follow-up</label>
                <input name="followup_datum" type="date" class="input">
              </div>
            </div>
            <div class="form-group">
              <label>URL</label>
              <input name="url" type="url" class="input">
            </div>
            <div class="form-group">
              <label>Notizen</label>
              <textarea name="notizen" class="input textarea" rows="3" maxlength="5000"></textarea>
            </div>
            <input type="hidden" name="id">
            <div class="form-actions">
              <button type="button" class="btn btn--secondary" data-close-modal="modal-bew-form">Abbrechen</button>
              <button type="submit" class="btn btn--primary">Speichern</button>
            </div>
          </form>
        </div>
      </dialog>`;
  }

  async function _load() {
    const el = document.getElementById('bew-list');
    if (!el) return;
    try {
      _list = await api.bewerbungen.list(_filter);
      state.set('bewerbungen', _list);
      _renderList(_list);
    } catch (e) { ui.error(e.message); }
  }

  function _renderList(list) {
    const el = document.getElementById('bew-list');
    if (!el) return;
    if (!list.length) { el.innerHTML = '<p class="empty">Keine Bewerbungen gefunden.</p>'; return; }
    el.innerHTML = list.map(b => `
      <div class="bew-card" data-id="${b.id}">
        <div class="bew-card__main">
          <strong class="bew-card__firma">${ui.escHtml(b.firma)}</strong>
          <span  class="bew-card__titel">${ui.escHtml(b.titel)}</span>
          ${b.ort ? `<span class="bew-card__ort">📍 ${ui.escHtml(b.ort)}</span>` : ''}
        </div>
        <div class="bew-card__meta">
          <span class="badge badge--${b.status}">${STATUS_LABELS[b.status] || b.status}</span>
          ${b.followup_datum ? `<span class="bew-card__followup">⏰ ${ui.formatDate(b.followup_datum)}</span>` : ''}
        </div>
        <div class="bew-card__actions">
          <button class="btn btn--sm" data-action="edit"   data-id="${b.id}">✏️</button>
          <button class="btn btn--sm" data-action="detail" data-id="${b.id}">👁</button>
          <button class="btn btn--sm btn--danger" data-action="delete" data-id="${b.id}">🗑</button>
        </div>
      </div>`).join('');
  }

  async function _showDetail(id) {
    try {
      const b = await api.bewerbungen.get(id);
      document.getElementById('modal-bew-body').innerHTML = `
        <h3>${ui.escHtml(b.firma)} — ${ui.escHtml(b.titel)}</h3>
        <p><strong>Status:</strong> ${STATUS_LABELS[b.status] || b.status}</p>
        <p><strong>Ort:</strong> ${ui.escHtml(b.ort || '–')}</p>
        <p><strong>Beworben am:</strong> ${ui.formatDate(b.beworben_am)}</p>
        <p><strong>Follow-up:</strong> ${ui.formatDate(b.followup_datum)}</p>
        ${b.url ? `<p><a href="${ui.escHtml(b.url)}" target="_blank" rel="noopener">🔗 Stellenanzeige</a></p>` : ''}
        ${b.anschreiben ? `<details><summary>Anschreiben</summary><pre class="anschreiben-pre">${ui.escHtml(b.anschreiben)}</pre></details>` : ''}
        ${b.notizen ? `<p><strong>Notizen:</strong> ${ui.escHtml(b.notizen)}</p>` : ''}
        <hr>
        <h4>Kommentare</h4>
        <ul class="kommentar-list" id="kommentar-list-${id}">
          ${(b.kommentare || []).map(k => `
            <li class="kommentar-item" data-kid="${k.id}">
              <span class="kommentar-date">${ui.formatDate(k.erstellt_am)}</span>
              <span>${ui.escHtml(k.text)}</span>
              <button class="btn btn--xs btn--danger" data-action="del-kommentar" data-bid="${id}" data-kid="${k.id}">✕</button>
            </li>`).join('')}
        </ul>
        <div class="kommentar-form">
          <input id="kommentar-input-${id}" class="input" placeholder="Kommentar hinzufügen…" maxlength="2000">
          <button class="btn btn--sm btn--primary" data-action="add-kommentar" data-bid="${id}">+</button>
        </div>`;
      ui.openModal('modal-bew');
    } catch (e) { ui.error(e.message); }
  }

  function _openForm(bew = null) {
    const form = document.getElementById('bew-form');
    form.reset();
    document.getElementById('form-title').textContent = bew ? 'Bewerbung bearbeiten' : 'Neue Bewerbung';
    if (bew) {
      ['titel','firma','ort','status','beworben_am','followup_datum','url','notizen','id'].forEach(f => {
        if (form[f]) form[f].value = bew[f] ?? '';
      });
    }
    ui.openModal('modal-bew-form');
  }

  function _bindEvents() {
    // Filter
    document.getElementById('filter-firma')?.addEventListener('input', ui.debounce(e => {
      _filter.firma = e.target.value; _load();
    }));
    document.getElementById('filter-status')?.addEventListener('change', e => {
      _filter.status = e.target.value; _load();
    });
    document.getElementById('filter-archiviert')?.addEventListener('change', e => {
      _filter.archiviert = e.target.checked ? 1 : 0; _load();
    });

    // Neue Bewerbung
    document.getElementById('btn-neue-bew')?.addEventListener('click', () => _openForm());

    // Delegiertes Event auf der Liste
    document.getElementById('bew-list')?.addEventListener('click', async e => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const { action, id } = btn.dataset;
      const numId = +id;
      if (action === 'detail') { await _showDetail(numId); }
      if (action === 'edit')   {
        const bew = await api.bewerbungen.get(numId);
        _openForm(bew);
      }
      if (action === 'delete') {
        if (!await ui.confirm('Bewerbung wirklich löschen?')) return;
        try { await api.bewerbungen.remove(numId); ui.success('Gelöscht'); _load(); }
        catch (err) { ui.error(err.message); }
      }
    });

    // Kommentare (delegiert auf Modal)
    document.getElementById('modal-bew-body')?.addEventListener('click', async e => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const { action, bid, kid } = btn.dataset;
      if (action === 'add-kommentar') {
        const input = document.getElementById(`kommentar-input-${bid}`);
        if (!input?.value.trim()) return;
        try {
          await api.bewerbungen.addKommentar(+bid, input.value.trim());
          input.value = '';
          await _showDetail(+bid);
        } catch (err) { ui.error(err.message); }
      }
      if (action === 'del-kommentar') {
        try { await api.bewerbungen.deleteKommentar(+bid, +kid); await _showDetail(+bid); }
        catch (err) { ui.error(err.message); }
      }
    });

    // Modal-Close-Buttons
    document.addEventListener('click', e => {
      const closeId = e.target.dataset.closeModal;
      if (closeId) ui.closeModal(closeId);
    });

    // Formular absenden
    document.getElementById('bew-form')?.addEventListener('submit', async e => {
      e.preventDefault();
      const fd   = new FormData(e.target);
      const data = Object.fromEntries(fd.entries());
      const id   = data.id ? +data.id : null;
      delete data.id;
      // Leere Felder als null
      Object.keys(data).forEach(k => { if (data[k] === '') data[k] = null; });
      try {
        if (id) { await api.bewerbungen.update(id, data); ui.success('Gespeichert'); }
        else    { await api.bewerbungen.create(data);      ui.success('Bewerbung erstellt'); }
        ui.closeModal('modal-bew-form');
        _load();
      } catch (err) { ui.error(err.message); }
    });
  }

  return { init };
})();

window.bewerbungenModule = bewerbungenModule;
