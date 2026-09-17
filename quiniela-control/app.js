const DATA_URL = './data.json';
const CAPTURE_URL = './capture-config.json';
const REFRESH_MS = 60000;

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function setHref(id, value) {
  const el = document.getElementById(id);
  if (el && value) el.href = value;
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

function renderParticipants(participants = []) {
  const wrap = document.getElementById('w2-participants');
  if (!wrap) return;

  wrap.replaceChildren();

  participants.forEach((participant) => {
    const status = String(participant.status || 'PENDING').toUpperCase();
    const complete = status === 'COMPLETE';
    const row = document.createElement('div');
    row.className = `participant ${complete ? 'complete' : 'pending'}`;

    const name = document.createElement('span');
    name.className = 'participant-name';
    name.textContent = participant.name || '—';

    const state = document.createElement('span');
    state.className = 'participant-status';
    state.textContent = complete ? 'COMPLETADO' : 'FALTA';

    row.append(name, state);
    wrap.append(row);
  });
}

function render(data, captureConfig) {
  const capture = data.capture || {};
  const w1 = data.week1_closeout || {};
  const operator = data.operator || {};
  const participants = Array.isArray(data.participants) ? data.participants : [];
  const complete = Number(capture.complete || 0);
  const total = Number(capture.total || 9);
  const pct = Math.max(0, Math.min(100, total ? (complete / total) * 100 : 0));

  setText('week-label', `${data.week || captureConfig.week || 'WEEK 2'} · ${data.season || captureConfig.season || '2026'}`);
  setText('capture-count', `${complete}/${total}`);
  setText('missing-count', String(Math.max(0, total - complete)));
  setText('window-status', String(capture.window || captureConfig.status || 'OPEN').toUpperCase() === 'OPEN' ? 'CAPTURA ABIERTA' : 'CAPTURA CERRADA');
  setText('deadline', `CIERRE · ${capture.deadline_label || '16 SEP · 12:00 CDMX'}`);
  setText('last-sync', formatSync(data.last_sync || captureConfig.last_sync));

  const progress = document.getElementById('progress-bar');
  const progressWrap = document.querySelector('.progress');
  if (progress) progress.style.width = `${pct}%`;
  if (progressWrap) {
    progressWrap.setAttribute('aria-valuenow', String(complete));
    progressWrap.setAttribute('aria-valuemax', String(total));
  }

  renderParticipants(participants);

  setText('w1-final', w1.results || '16/16 FINAL');
  setText('w1-score', w1.leader_score || '11/16');
  setHref('w1-results-folder', w1.results_sheet_url || w1.results_folder);
  setHref('w1-summary', w1.summary_x_url);
  setHref('w1-public-picks', w1.public_picks_url);

  setHref('stable-capture', capture.stable_url || captureConfig.stable_url || './captura/');
  setHref('direct-form', capture.form_url || captureConfig.form_url);

  const xState = String(operator.x_asset_status || 'WAITING_FIGMA').toUpperCase();
  setText('x-status', xState === 'READY' ? 'PNG LISTOS' : 'ASSETS PENDIENTES');
  setHref('x-folder', operator.x_asset_url || w1.results_sheet_url);
  setHref('x-summary', operator.x_summary_url || w1.summary_x_url);
  setHref('asset-library', operator.asset_library_url || w1.asset_library_url);
}

async function loadData() {
  try {
    const [dataRes, captureRes] = await Promise.all([
      fetch(`${DATA_URL}?t=${Date.now()}`, { cache: 'no-store' }),
      fetch(`${CAPTURE_URL}?t=${Date.now()}`, { cache: 'no-store' })
    ]);
    if (!dataRes.ok) throw new Error(`DATA HTTP ${dataRes.status}`);
    const data = await dataRes.json();
    const capture = captureRes.ok ? await captureRes.json() : {};
    render(data, capture);
  } catch (err) {
    setText('last-sync', 'SIN CONEXIÓN AL FEED');
    console.error(err);
  }
}

loadData();
setInterval(loadData, REFRESH_MS);
