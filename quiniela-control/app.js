const DATA_URL='./data.json'; const REFRESH_MS=60000;
const $=id=>document.getElementById(id);
function setText(id,v){const e=$(id);if(e)e.textContent=v}
function setHref(id,v){const e=$(id);if(e&&v)e.href=v}
function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function fmtSync(v){if(!v)return'—';try{return new Intl.DateTimeFormat('es-MX',{timeZone:'America/Mexico_City',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(v)).toUpperCase()+' CDMX'}catch{return v}}
function weeklyTable(data){
  if(Array.isArray(data.weekly_standings)) return [...data.weekly_standings].map(x=>({...x,pending:Math.max(0,(data.results?.total||0)-(data.results?.final||0))})).sort((a,b)=>b.correct-a.correct||a.wrong-b.wrong||a.name.localeCompare(b.name));
  return (data.participants||[]).map(p=>({name:p.name,correct:0,wrong:0,pending:data.results?.total||0}));
}
function renderParticipants(list=[]){
  const wrap=$('participants');wrap.replaceChildren();
  list.forEach(p=>{const row=document.createElement('div');const ok=String(p.status).toUpperCase()==='COMPLETE';row.className='participant '+(ok?'complete':'pending');row.innerHTML='<span class="participant-name">'+esc(p.name)+'</span><span class="participant-status">'+(ok?'RECIBIDO':'FALTA')+'</span>';wrap.append(row)});
}
function renderGames(games=[]){
  const wrap=$('games');wrap.replaceChildren();
  games.forEach(g=>{const row=document.createElement('div');row.className='result-row '+(g.winner?'final':'scheduled');row.innerHTML='<div><strong>'+esc(g.id)+' · '+esc(g.matchup)+'</strong><span>'+esc(g.time)+'</span></div><div class="game-state">'+(g.winner?'<b>GANÓ '+esc(g.winner)+'</b><span>'+esc(g.score||'FINAL')+'</span>':'<b>PENDIENTE</b><span>'+esc(g.status||'SCHEDULED')+'</span>')+'</div>';wrap.append(row)});
}
function renderRanking(data){
  const rows=weeklyTable(data); const wrap=$('weekly-ranking'); wrap.replaceChildren();
  const anyFinal=(data.results?.final||0)>0;
  rows.forEach((r,i)=>{const el=document.createElement('div');el.className='rank-row';el.innerHTML='<span class="rank-pos">'+(i+1)+'</span><strong>'+esc(r.name)+'</strong><span>'+r.correct+' ✓</span><span>'+r.wrong+' ×</span>';wrap.append(el)});
  setText('ranking-status',anyFinal?((data.results.final===data.results.total)?'FINAL':'EN VIVO'):'PENDING');
}
function render(data){
 const c=data.capture||{}, total=Number(c.total||9), complete=Number(c.complete||0), pct=total?Math.round(complete/total*100):0;
 setText('week-label',data.week+' · '+data.season);setText('capture-count',complete+'/'+total);setText('missing-count',Math.max(0,total-complete));
 setText('window-status',String(c.window).toUpperCase()==='OPEN'?'CAPTURA ABIERTA':'CAPTURA CERRADA');setText('deadline','CIERRE · '+(c.deadline_label||'—'));
 setText('final-count',data.results?.final??0);setText('game-count',data.results?.total??(data.games||[]).length);
 setText('gate-status',data.publication?.gate||'HOLD');setText('last-sync',fmtSync(data.last_sync));setText('sync-mode',(data.sync_mode||'MANUAL').replaceAll('_',' '));
 setHref('stable-capture',c.stable_url);setHref('direct-form',c.form_url);setHref('data-system',data.operator?.data_system_url);
 const p=$('progress-bar');if(p)p.style.width=pct+'%';const pw=document.querySelector('.progress');if(pw){pw.setAttribute('aria-valuenow',String(complete));pw.setAttribute('aria-valuemax',String(total))}
 renderParticipants(data.participants||[]);renderGames(data.games||[]);renderRanking(data);
 setText('capture-rule',(c.received_picks||0)+'/'+(c.expected_picks||0)+' picks registrados · '+(c.missing_picks||0)+' pendientes.');
}
async function load(){try{const r=await fetch(DATA_URL+'?t='+Date.now(),{cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status);render(await r.json())}catch(e){setText('last-sync','SIN CONEXIÓN AL FEED');console.error(e)}}
load();setInterval(load,REFRESH_MS);