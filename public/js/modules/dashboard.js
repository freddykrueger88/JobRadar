'use strict';

const dashboard = (() => {
  let _chart = null;

  async function init() {
    _render();
    await _load();
  }

  function _render() {
    const main = document.getElementById('main-content');
    main.innerHTML = `
      <div class="dashboard">
        <h1 class="page-title">Dashboard</h1>
        <div class="kpi-grid" id="kpi-grid">
          <div class="kpi-card skeleton"></div>
          <div class="kpi-card skeleton"></div>
          <div class="kpi-card skeleton"></div>
          <div class="kpi-card skeleton"></div>
          <div class="kpi-card skeleton"></div>
        </div>
        <div class="dashboard-charts">
          <div class="card">
            <h2 class="card__title">Status-Verteilung</h2>
            <canvas id="status-chart" width="400" height="220"></canvas>
          </div>
          <div class="card">
            <h2 class="card__title">⏰ Fällige Follow-ups</h2>
            <ul id="followup-list" class="followup-list"></ul>
          </div>
        </div>
      </div>`;
  }

  async function _load() {
    try {
      const stats = await api.bewerbungen.stats();
      state.set('stats', stats);
      _renderKpi(stats);
      _renderFollowups(stats.followups || []);
      _renderChart(stats.byStatus || []);
    } catch (e) {
      ui.error('Dashboard konnte nicht geladen werden: ' + e.message);
    }
  }

  function _renderKpi(stats) {
    const statusMap = {
      beworben:  { label: 'Beworben',  icon: '📨' },
      interview: { label: 'Interview', icon: '🎤' },
      angebot:   { label: 'Angebot',   icon: '🎉' },
      abgelehnt: { label: 'Abgelehnt', icon: '❌' },
    };
    const byStatus = Object.fromEntries((stats.byStatus || []).map(r => [r.status, r.n]));
    const kpis = [
      { label: 'Gesamt',    value: stats.total || 0,              icon: '📋' },
      { label: 'Überfällig',value: stats.overdue?.length || 0,   icon: '🔴' },
      { label: 'Interview', value: byStatus.interview || 0,      icon: '🎤' },
      { label: 'Angebot',   value: byStatus.angebot   || 0,      icon: '🎉' },
      { label: 'Abgelehnt', value: byStatus.abgelehnt || 0,      icon: '❌' },
    ];
    document.getElementById('kpi-grid').innerHTML = kpis.map(k => `
      <div class="kpi-card">
        <span class="kpi-card__icon">${k.icon}</span>
        <span class="kpi-card__value">${k.value}</span>
        <span class="kpi-card__label">${k.label}</span>
      </div>`).join('');
  }

  function _renderFollowups(list) {
    const el = document.getElementById('followup-list');
    if (!list.length) { el.innerHTML = '<li class="empty">Keine fälligen Follow-ups 🎉</li>'; return; }
    el.innerHTML = list.map(b => `
      <li class="followup-item">
        <span class="followup-item__date">${ui.formatDate(b.followup_datum)}</span>
        <a href="#bewerbungen" data-id="${b.id}" class="followup-item__title">${ui.escHtml(b.firma)} — ${ui.escHtml(b.titel)}</a>
      </li>`).join('');
  }

  function _renderChart(byStatus) {
    const canvas = document.getElementById('status-chart');
    if (!canvas || !window.Chart) return;
    if (_chart) _chart.destroy();
    const labels = byStatus.map(r => r.status);
    const data   = byStatus.map(r => r.n);
    const colors = ['#3b82f6','#f59e0b','#10b981','#ef4444','#8b5cf6'];
    _chart = new Chart(canvas, {
      type: 'doughnut',
      data: { labels, datasets: [{ data, backgroundColor: colors }] },
      options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    });
  }

  return { init };
})();

window.dashboard = dashboard;
