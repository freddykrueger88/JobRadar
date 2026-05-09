// ── Dashboard Charts & Stats ──────────────────────────────────────────────

window.loadDashboardCharts = async function () {
  try {
    const [stats, verlauf] = await Promise.all([
      api('/api/bewerbungen/stats/overview'),
      api('/api/bewerbungen/stats/verlauf').catch(() => [])
    ]);

    renderStatusChart(stats.byStatus || []);
    renderVerlaufChart(verlauf || []);
    renderDokumenteCount();
  } catch (e) {
    console.warn('Dashboard-Charts Fehler:', e.message);
  }
};

function renderStatusChart(byStatus) {
  const canvas = document.getElementById('chartStatus');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const labels = { beworben: 'Beworben', interview: 'Interview', angenommen: 'Angenommen', abgelehnt: 'Abgelehnt' };
  const colors = { beworben: '#01696f', interview: '#f59e0b', angenommen: '#10b981', abgelehnt: '#ef4444' };

  const data = ['beworben', 'interview', 'angenommen', 'abgelehnt'].map(s => ({
    label: labels[s],
    value: (byStatus.find(x => x.status === s)?.c || 0),
    color: colors[s]
  })).filter(d => d.value > 0);

  if (!data.length) { canvas.parentElement.style.display = 'none'; return; }

  const total = data.reduce((a, b) => a + b.value, 0);
  const cx = canvas.width / 2, cy = canvas.height / 2;
  const r = Math.min(cx, cy) - 30;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  let start = -Math.PI / 2;
  data.forEach(d => {
    const slice = (d.value / total) * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, start, start + slice);
    ctx.closePath();
    ctx.fillStyle = d.color;
    ctx.fill();
    ctx.strokeStyle = 'var(--surface)';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Label
    const mid = start + slice / 2;
    const lx = cx + (r * 0.65) * Math.cos(mid);
    const ly = cy + (r * 0.65) * Math.sin(mid);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (d.value > 0) ctx.fillText(d.value, lx, ly);
    start += slice;
  });

  // Legende
  const legend = document.getElementById('chartStatusLegend');
  if (legend) {
    legend.innerHTML = data.map(d =>
      `<span style="display:inline-flex;align-items:center;gap:5px;margin-right:14px;font-size:13px">
        <span style="width:12px;height:12px;border-radius:3px;background:${d.color};display:inline-block"></span>
        ${d.label} (${d.value})
      </span>`
    ).join('');
  }
}

function renderVerlaufChart(verlauf) {
  const canvas = document.getElementById('chartVerlauf');
  if (!canvas || !verlauf.length) {
    if (canvas) canvas.parentElement.style.display = 'none';
    return;
  }
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const pad = { top: 20, right: 20, bottom: 40, left: 36 };

  // letzte 8 Monate
  const sorted = verlauf.slice(-8);
  const max = Math.max(...sorted.map(d => d.anzahl), 1);

  ctx.clearRect(0, 0, W, H);

  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;
  const barW = (chartW / sorted.length) * 0.55;
  const gap  = (chartW / sorted.length);

  // Gitter
  ctx.strokeStyle = 'rgba(128,128,128,0.15)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + chartH - (i / 4) * chartH;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
    ctx.fillStyle = 'var(--muted, #888)';
    ctx.font = '11px system-ui';
    ctx.textAlign = 'right';
    ctx.fillText(Math.round((i / 4) * max), pad.left - 6, y + 4);
  }

  // Balken
  sorted.forEach((d, i) => {
    const x = pad.left + i * gap + (gap - barW) / 2;
    const barH = (d.anzahl / max) * chartH;
    const y = pad.top + chartH - barH;

    // Gradient
    const grad = ctx.createLinearGradient(0, y, 0, y + barH);
    grad.addColorStop(0, '#01696f');
    grad.addColorStop(1, '#01969e');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(x, y, barW, barH, [4, 4, 0, 0]);
    ctx.fill();

    // Wert oben
    if (d.anzahl > 0) {
      ctx.fillStyle = 'var(--fg, #111)';
      ctx.font = 'bold 12px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(d.anzahl, x + barW / 2, y - 6);
    }

    // X-Label
    ctx.fillStyle = 'var(--muted, #888)';
    ctx.font = '11px system-ui';
    ctx.textAlign = 'center';
    const label = (d.monat || '').slice(5); // MM
    const monate = ['','Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
    ctx.fillText(monate[parseInt(label)] || label, x + barW / 2, H - pad.bottom + 16);
  });
}

async function renderDokumenteCount() {
  try {
    const counts = await api('/api/dokumente/stats').catch(() => null);
    if (!counts) return;
    const el = document.getElementById('statDokumente');
    if (el) el.textContent = counts.total || 0;
  } catch(e) {}
}
