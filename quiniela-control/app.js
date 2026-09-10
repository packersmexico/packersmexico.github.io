const DATA_URL = './data.json';
const ARCHIVE_URL = './archive.json';
const REFRESH_MS = 60000;

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]));
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

function renderParticipants(items = []) {
  const root = document.getElementById('participants');
  root.innerHTML = '';
  items.forEach(item => {
    const row = document.createElement('div');
    row.className = `participant ${item.status === 'COMPLETE' ? 'complete' : 'pending'}`;
    row.innerHTML = `
      <span class="participant-name">${escapeHtml(item.name)}</span>
      <span class="participant-status">${item.status === 'COMPLETE' ? 'RECIBIDO' : 'PENDIENTE'}</span>
    `;
    root.appendChild(row);
  });
}

function renderGames(items = []) {
  const root = document.getElementById('games');
  root.innerHTML = '';
  items.forEach(item => {
    const final = item.status === 'FINAL';
    const row = document.createElement('div');
    row.className = `game ${final ? 'final' : 'scheduled'}`;
    row.innerHTML = `
      <div class="game-main">
        <span class="game-matchup">${escapeHtml(item.matchup)}</span>
        <span class="game-kickoff">${escapeHtml(item.kickoff_cdmx)}</span>
      </div>
      <span class="game-result">${final ? `FINAL · ${escapeHtml(item.winner)}` : escapeHtml(item.status)}</span>
    `;
    root.appendChild(row);
  });
}

function normalizeStatus(value) {
  const s = String(value || 'HOLD').toUpperCase();
  if (s.includes('READY') || s.includes('PASS') || s.includes('COMPLETE') || s.includes('LOCKED')) return 'ready';
  if (s.includes('RETAIN') || s.includes('RETENER') || s.includes('ERROR') || s.includes('BLOCKER')) return 'blocked';
  return 'hold';
}

function renderFunnel(data) {
  const root = document.getElementById('funnel');
  const total = Number(data.results?.total || data.games?.length || 0);
  const steps = [
    ['01', 'CAPTURA', data.capture.complete === data.capture.total && data.capture.window === 'CLOSED' ? 'READY' : 'HOLD'],
    ['02', 'DATA SYSTEM', data.pipeline.data_system || 'READY'],
    ['03', 'PICKS / CONSENSUS', data.pipeline.consensus || data.pipeline.picks || 'HOLD'],
    ['04', 'PRODUCCIÓN / QA', data.pipeline.production || data.production?.package_status || 'HOLD'],
    ['05', 'QA / PUBLICACIÓN', data.pipeline.publication || 'HOLD'],
    ['06', 'RESULTADOS', total > 0 && data.results.final === total ? 'READY' : `${data.results.final}/${total} FINAL`]
  ];
  root.innerHTML = '';
  steps.forEach(([index,name,status]) => {
    const row = document.createElement('div');
    const cls = normalizeStatus(status);
    row.className = 'funnel-step';
    row.innerHTML = `
      <span class="step-index">${index}</span>
      <span class="step-name">${name}</span>
      <span class="step-status ${cls}">${escapeHtml(status)}</span>
    `;
    root.appendChild(row);
  });
}

function outputActions(item) {
  const links = [];
  if (item.canva_url) links.push(`<a href="${escapeHtml(item.canva_url)}" rel="noopener">CANVA →</a>`);
  if (item.drive_url) links.push(`<a href="${escapeHtml(item.drive_url)}" rel="noopener">DRIVE →</a>`);
  if (item.url && item.url !== item.canva_url && item.url !== item.drive_url) links.push(`<a href="${escapeHtml(item.url)}" rel="noopener">ABRIR →</a>`);
  if (links.length) return `<div class="output-actions">${links.join('')}</div>`;
  return `<span class="output-wait">${escapeHtml(item.next || 'ESPERANDO DATA')}</span>`;
}

function renderProduction(data) {
  const production = data.production || {};
  const outputs = production.outputs || [];
  setText('package-status', production.package_status || 'HOLD');
  setText('delivery-target', production.delivery_target || 'SIGUIENTE GATE OPERATIVO');
  setText('production-rule', production.rule || '04 produce y hace QA; 05 valida. El click final sigue siendo humano.');

  const statusNode = document.getElementById('package-status');
  if (statusNode) statusNode.className = `section-stat package-${normalizeStatus(production.package_status)}`;

  const root = document.getElementById('production-outputs');
  if (!root) return;
  root.innerHTML = '';

  outputs.forEach(item => {
    const cls = normalizeStatus(item.status);
    const row = document.createElement('div');
    row.className = `production-output ${cls}`;
    const preview = item.preview_url
      ? `<a class="output-preview" href="${escapeHtml(item.preview_url)}" rel="noopener"><img src="${escapeHtml(item.preview_url)}" alt="Preview ${escapeHtml(item.label)}" loading="lazy"></a>`
      : '';
    row.innerHTML = `
      ${preview}
      <div>
        <span class="output-label">${escapeHtml(item.label)}</span>
        <span class="output-meta">${escapeHtml(item.target || '')}</span>
      </div>
      <div class="output-state">
        <strong>${escapeHtml(item.status || 'HOLD')}</strong>
        ${outputActions(item)}
      </div>
    `;
    root.appendChild(row);
  });
}

function renderHistory(archive) {
  const root = document.getElementById('season-history');
  if (!root) return;
  const weeks = Array.isArray(archive?.weeks) ? [...archive.weeks].sort((a,b) => Number(b.week_number)-Number(a.week_number)) : [];
  root.innerHTML = '';
  if (!weeks.length) {
    root.innerHTML = '<p class="history-empty">Aún no hay semanas registradas.</p>';
    return;
  }
  weeks.forEach(week => {
    const card = document.createElement('article');
    const cls = normalizeStatus(week.status);
    const outputs = (week.outputs || []).map(item => {
      const links = [];
      if (item.url) links.push(`<a href="${escapeHtml(item.url)}" rel="noopener">CANVA / DOC →</a>`);
      if (item.drive_url) links.push(`<a href="${escapeHtml(item.drive_url)}" rel="noopener">DRIVE →</a>`);
      const action = links.length ? `<span class="history-output-actions">${links.join('')}</span>` : '<span>—</span>';
      return `<div class="history-output"><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.status)}</strong>${action}</div>`;
    }).join('');
    card.className = `history-week ${cls}`;
    card.innerHTML = `
      <div class="history-week-head">
        <div><p class="eyebrow">${escapeHtml(week.status)}</p><h3>${escapeHtml(week.week)}</h3></div>
        <span>${escapeHtml(week.results || '')}</span>
      </div>
      <p class="history-meta">${escapeHtml(week.capture || '')}</p>
      <div class="history-outputs">${outputs}</div>
      <div class="history-links">
        ${week.package_url ? `<a href="${escapeHtml(week.package_url)}" rel="noopener">PAQUETE DRIVE →</a>` : ''}
        ${week.public_url ? `<a href="${escapeHtml(week.public_url)}" rel="noopener">VER PICKS PÚBLICOS →</a>` : ''}
        ${week.snapshot_url ? `<a href="${escapeHtml(week.snapshot_url)}" rel="noopener">VER DETALLE SEMANA →</a>` : ''}
      </div>
    `;
    root.appendChild(card);
  });
}

function render(data) {
  const total = Number(data.results?.total || data.games?.length || 0);
  setText('week-label', `${data.week} · ${data.season}`);
  setText('capture-count', `${data.capture.complete}/${data.capture.total}`);
  setText('missing-count', String(data.capture.total - data.capture.complete));
  setText('window-status', data.capture.window === 'OPEN' ? 'CAPTURA ABIERTA' : 'CAPTURA CERRADA');
  setText('deadline', `CIERRE · ${data.capture.deadline_label}`);
  setText('final-count', `${data.results.final}/${total}`);
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
    : 'Captura cerrada. Picks, consensus y resultados conservan los gates 04 → 05 antes de publicación.';
}

async function loadData() {
  try {
    const [dataRes, archiveRes] = await Promise.all([
      fetch(`${DATA_URL}?t=${Date.now()}`, { cache: 'no-store' }),
      fetch(`${ARCHIVE_URL}?t=${Date.now()}`, { cache: 'no-store' })
    ]);
    if (!dataRes.ok) throw new Error(`DATA HTTP ${dataRes.status}`);
    const data = await dataRes.json();
    render(data);
    if (archiveRes.ok) renderHistory(await archiveRes.json());
  } catch (err) {
    setText('last-sync', 'SIN CONEXIÓN AL FEED');
    console.error(err);
  }
}

loadData();
setInterval(loadData, REFRESH_MS);
