'use strict';

const sucheModule = (() => {
  const QUELLEN_LABELS = {
    arbeitnow:      'Arbeitnow',
    jobicy:         'Jobicy',
    arbeitsagentur: 'Arbeitsagentur',
    themuse:        'The Muse',
    remotive:       'Remotive',
    adzuna:         'Adzuna 🔑',
    jooble:         'Jooble 🔑',
  };

  async function init() {
    _renderShell();
    _bindEvents();
  }

  function _renderShell() {
    document.getElementById('main-content').innerHTML = `
      <div class="suche-page">
        <h1 class="page-title">Stellensuche</h1>
        <form id="suche-form" class="suche-form card">
          <div class="form-row">
            <div class="form-group">
              <label>Suchbegriff</label>
              <input name="q" class="input" placeholder="z.B. IT Support, DevOps…">
            </div>
            <div class="form-group">
              <label>Ort / PLZ</label>
              <input name="ort" class="input" placeholder="z.B. Bremen, 28195">
            </div>
            <div class="form-group">
              <label>Umkreis (km)</label>
              <input name="umkreis" type="number" class="input" value="50" min="0" max="500">
            </div>
          </div>
          <div class="quellen-auswahl">
            ${Object.entries(QUELLEN_LABELS).map(([id, label]) => `
              <label class="checkbox-label">
                <input type="checkbox" name="quellen" value="${id}" checked>
                ${label}
              </label>`).join('')}
          </div>
          <button type="submit" class="btn btn--primary" id="btn-suchen">🔍 Suchen</button>
        </form>
        <div id="suche-ergebnisse" class="suche-ergebnisse"></div>
      </div>`;
  }

  function _bindEvents() {
    document.getElementById('suche-form')?.addEventListener('submit', async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const q       = fd.get('q')   || '';
      const ort     = fd.get('ort') || '';
      const umkreis = fd.get('umkreis') || '50';
      const quellen = fd.getAll('quellen').join(',');
      await _suchen({ q, ort, umkreis, quellen });
    });

    document.getElementById('suche-ergebnisse')?.addEventListener('click', async e => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const { action } = btn.dataset;
      if (action === 'bewerben') {
        const card  = btn.closest('.job-card');
        const titel = card.dataset.titel;
        const firma = card.dataset.firma;
        const url   = card.dataset.url;
        try {
          await api.bewerbungen.create({ titel, firma, url: url || null, quelle: card.dataset.quelle, status: 'beworben', beworben_am: new Date().toISOString().slice(0,10) });
          btn.textContent = '✅ Beworben';
          btn.disabled = true;
          ui.success(`Bewerbung für ${firma} gespeichert!`);
        } catch (err) { ui.error(err.message); }
      }
      if (action === 'ausblenden') {
        btn.closest('.job-card').remove();
      }
    });
  }

  async function _suchen(params) {
    const el = document.getElementById('suche-ergebnisse');
    el.innerHTML = '<p class="loading">⏳ Suche läuft…</p>';
    state.update('suche', { loading: true });
    try {
      const jobs = await api.suche.suchen(params);
      state.update('suche', { loading: false, ergebnisse: jobs });
      _renderErgebnisse(jobs);
    } catch (err) {
      state.update('suche', { loading: false });
      el.innerHTML = `<p class="error">${ui.escHtml(err.message)}</p>`;
    }
  }

  function _renderErgebnisse(jobs) {
    const el = document.getElementById('suche-ergebnisse');
    if (!jobs.length) { el.innerHTML = '<p class="empty">Keine Stellen gefunden.</p>'; return; }
    el.innerHTML = `<p class="suche-count">${jobs.length} Treffer</p>` +
      jobs.map(j => `
        <div class="job-card ${j.bereits_beworben ? 'job-card--applied' : ''} ${j.blacklisted ? 'job-card--blacklisted' : ''}"
             data-titel="${ui.escHtml(j.titel)}" data-firma="${ui.escHtml(j.firma || '')}"
             data-url="${ui.escHtml(j.url || '')}" data-quelle="${ui.escHtml(j.quelle)}">
          <div class="job-card__main">
            <strong>${ui.escHtml(j.titel)}</strong>
            <span>${ui.escHtml(j.firma || '')} ${j.ort ? '• ' + ui.escHtml(j.ort) : ''}</span>
            ${j.match_score > 0 ? `<span class="badge badge--match">⭐ ${j.match_score} Match</span>` : ''}
            ${j.blacklisted       ? '<span class="badge badge--warn">⛔ Blacklist</span>' : ''}
            ${j.bereits_beworben  ? '<span class="badge badge--applied">✅ Bereits beworben</span>' : ''}
          </div>
          <div class="job-card__actions">
            ${j.url ? `<a href="${ui.escHtml(j.url)}" target="_blank" rel="noopener" class="btn btn--sm">🔗 Anzeige</a>` : ''}
            <button class="btn btn--sm btn--primary" data-action="bewerben" ${j.bereits_beworben ? 'disabled' : ''}>📨 Bewerben</button>
            <button class="btn btn--sm" data-action="ausblenden">👁 Ausblenden</button>
          </div>
        </div>`).join('');
  }

  return { init };
})();

window.sucheModule = sucheModule;
