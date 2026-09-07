const DATA_URL = './data.json';
const REFRESH_MS = 60000;

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function formatSync(value) {
  if (!value) return '—';
  try {
    const d = new Date(value);
    return new Intl.DateTimeFormat('es-MX', {
      timeZone: 'America/Mexico_City',
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    }).format(d).toUpperCase() + ' CDMX';
  } catch { return value; }
}

function renderParticipants(items) {
  const root = document.getElementById('participants');
  root.innerHTML = '';
  items.forEach(item => {
    const row = document.createElement('div');
    row.className = `participant ${item.status === 'COMPLETE' ? 'complete' : 'pending'}`;
    row.innerHTML = `
      <span class="participant-name">${item.name}</span>
      <span class="participant-status">${item.status === 'COMPLETE' ? 'RECIBIDO' : 'PENDIENTE'}</span>
    `;
    root.appendChild(row);
  });
}

function renderGames(items) {
  const root = document.getElementById('games');
  root.innerHTML = '';
  items.forEach(item => {
    const final = item.status === 'FINAL';
    const row = document.createElement('div');
    row.className = `game ${final ? 'final' : 'scheduled'}`;
    row.innerHTML = `
      <div class="game-main">
        <span class="game-matchup">${item.matchup}</span>
        <span class="game-kickoff">${item.kickoff_cdmx}</span>
      </div>
      <span class="game-result">${final ? `FINAL · ${item.winner}` : item.status}</span>
    `;
    root.appendChild(row);
  });
}

function normalizeStatus(value) {
  const s = String(value || 'HOLD').toUpperCase();
  if (s.includes('READY') || s.includes('PASS')) return 'ready';
  if (s.includes('RETAIN') || s.includes('RETENER') || s.includes('ERROR')) return 'blocked';
  return 'hold';
}

function renderFunnel(data) {
  const root = document.getElementById('funnel');
  const steps = [
    ['01', 'CAPTURA', data.capture.complete === 9 && data.capture.window === 'CLOSED' ? 'READY' : 'HOLD'],
    ['02', 'DATA SYSTEM', data.pipeline.data_system || 'READY'],
    ['03', 'CONSENSUS', data.pipeline.consensus || 'HOLD'],
    ['04', 'PRODUCCIÓN', data.pipeline.production || 'HOLD'],
    ['05', 'QA / PUBLICACIÓN', data.pipeline.publication || 'HOLD'],
    ['06', 'RESULTADOS', data.results.final === 16 ? 'READY' : 'HOLD']
  ];
  root.innerHTML = '';
  steps.forEach(([index,name,status]) => {
    const row = document.createElement('div');
    const cls = normalizeStatus(status);
    row.className = 'funnel-step';
    row.innerHTML = `
      <span class="step-index">${index}</span>
      <span class="step-name">${name}</span>
      <span class="step-status ${cls}">${status}</span>
    `;
    root.appendChild(row);
  });
}

function renderProduction(data) {
  const production = data.production || {};
  const outputs = production.outputs || [];
  setText('package-status', production.package_status || 'HOLD');
  setText('delivery-target', production.delivery_target || 'MAR 15 SEP · 07:00 CDMX');
  setText('production-rule', production.rule || 'La pieza pasa por 04 y 05. Publicar sigue requiriendo autorización de Dirección.');

  const statusNode = document.getElementById('package-status');
  if (statusNode) statusNode.className = `section-stat package-${normalizeStatus(production.package_status)}`;

  const root = document.getElementById('production-outputs');
  if (!root) return;
  root.innerHTML = '';

  outputs.forEach(item => {
    const cls = normalizeStatus(item.status);
    const row = document.createElement('div');
    row.className = `production-output ${cls}`;
    const action = item.url && cls === 'ready'
      ? `<a href="${item.url}" rel="noopener">ABRIR PIEZA →</a>`
      : `<span class="output-wait">${item.next || 'ESPERANDO DATA'}</span>`;
    row.innerHTML = `
      <div>
        <span class="output-label">${item.label}</span>
        <span class="output-meta">${item.target || ''}</span>
      </div>
      <div class="output-state">
        <strong>${item.status || 'HOLD'}</strong>
        ${action}
      </div>
    `;
    root.appendChild(row);
  });
}

function render(data) {
  setText('week-label', `${data.week} · ${data.season}`);
  setText('capture-count', `${data.capture.complete}/${data.capture.total}`);
  setText('missing-count', String(data.capture.total - data.capture.complete));
  setText('window-status', data.capture.window === 'OPEN' ? 'CAPTURA ABIERTA' : 'CAPTURA CERRADA');
  setText('deadline', `CIERRE · ${data.capture.deadline_label}`);
  setText('final-count', `${data.results.final}/${data.results.total}`);
  setText('last-sync', formatSync(data.last_sync));

  const progress = document.getElementById('progress-bar');
  const progressWrap = document.querySelector('.progress');
  const pct = Math.max(0, Math.min(100, (data.capture.complete / data.capture.total) * 100));
  progress.style.width = `${pct}%`;
  progressWrap.setAttribute('aria-valuenow', String(data.capture.complete));
  progressWrap.setAttribute('aria-valuemax', String(data.capture.total));

  renderParticipants(data.participants);
  renderGames(data.games);
  renderFunnel(data);
  renderProduction(data);

  const privacy = document.getElementById('privacy-note');
  privacy.textContent = data.capture.window === 'OPEN'
    ? 'Los picks individuales permanecen ocultos mientras la captura esté abierta.'
    : 'Captura cerrada. La publicación de picks, consensus y resultados sigue los gates 04 → 05.';
}

async function loadData() {
  try {
    const res = await fetch(`${DATA_URL}?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    render(data);
  } catch (err) {
    setText('last-sync', 'SIN CONEXIÓN AL FEED');
    console.error(err);
  }
}

loadData();
setInterval(loadData, REFRESH_MS);
