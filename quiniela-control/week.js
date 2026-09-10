function esc(value) {
  return String(value ?? '').replace(/[&<>'\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]));
}

function formatSync(value) {
  if (!value) return '—';
  try {
    const d = new Date(value);
    return new Intl.DateTimeFormat('es-MX', {
      timeZone:'America/Mexico_City', day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'
    }).format(d).toUpperCase() + ' CDMX';
  } catch { return value; }
}

function normalizeStatus(value) {
  const s = String(value || '').toUpperCase();
  if (s.includes('READY') || s.includes('PASS') || s.includes('COMPLETE') || s.includes('LOCKED')) return 'ready';
  if (s.includes('BLOCKER') || s.includes('ERROR') || s.includes('RETENER')) return 'blocked';
  return 'hold';
}

function actions(item) {
  const links = [];
  if (item.canva_url) links.push(`<a href="${esc(item.canva_url)}" rel="noopener">CANVA →</a>`);
  if (item.drive_url) links.push(`<a href="${esc(item.drive_url)}" rel="noopener">DRIVE →</a>`);
  if (item.url && item.url !== item.canva_url && item.url !== item.drive_url) links.push(`<a href="${esc(item.url)}" rel="noopener">ABRIR →</a>`);
  return links.length ? `<div class="output-actions">${links.join('')}</div>` : '<span class="output-wait">ESPERANDO</span>';
}

async function loadWeek() {
  const params = new URLSearchParams(location.search);
  const n = Math.max(1, Number(params.get('week') || 1));
  const file = `./weeks/week-${String(n).padStart(2,'0')}.json?t=${Date.now()}`;
  try {
    const res = await fetch(file, {cache:'no-store'});
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    document.getElementById('detail-season').textContent = `TEMPORADA ${data.season}`;
    document.getElementById('detail-week').textContent = data.week;
    document.getElementById('detail-capture').textContent = `${data.capture.complete}/${data.capture.total}`;
    document.getElementById('detail-results').textContent = `${data.results.final}/${data.results.total} FINAL`;
    document.getElementById('detail-sync').textContent = `SYNC · ${formatSync(data.last_sync)}`;
    document.getElementById('detail-invitado').textContent = `INVITADO · ${data.capture.invitado || 'OFF'}`;
    document.getElementById('detail-package').textContent = data.production?.package_status || '—';

    const participants = document.getElementById('detail-participants');
    participants.innerHTML = (data.participants || []).map(p => `
      <div class="participant ${p.status === 'COMPLETE' ? 'complete' : 'pending'}">
        <span class="participant-name">${esc(p.name)}</span>
        <span class="participant-status">${p.status === 'COMPLETE' ? 'RECIBIDO' : 'PENDIENTE'}</span>
      </div>
    `).join('');

    const outputs = document.getElementById('detail-outputs');
    outputs.innerHTML = (data.production?.outputs || []).map(item => {
      const cls = normalizeStatus(item.status);
      return `
        <div class="production-output ${cls}">
          <div>
            <span class="output-label">${esc(item.label)}</span>
            <span class="output-meta">${esc(item.target || '')}</span>
          </div>
          <div class="output-state">
            <strong>${esc(item.status || 'HOLD')}</strong>
            ${actions(item)}
          </div>
        </div>`;
    }).join('');

    const pub = document.getElementById('detail-public');
    if (data.public_url) {
      pub.href = data.public_url;
      pub.hidden = false;
    }
  } catch (err) {
    document.getElementById('detail-week').textContent = 'SEMANA NO DISPONIBLE';
    console.error(err);
  }
}

loadWeek();
