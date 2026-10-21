const DATA_URL='./data.json'; const REFRESH_MS=60000;
let lastSeenSync=null;
const $=id=>document.getElementById(id);
function setText(id,v){const e=$(id);if(e)e.textContent=v}
function setHref(id,v){const e=$(id);if(e&&v)e.href=v}
function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function fmtSync(v){if(!v)return'—';try{return new Intl.DateTimeFormat('es-MX',{timeZone:'America/Mexico_City',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(v)).toUpperCase()+' CDMX'}catch{return v}}
function weeklyTable(data){
  if(Array.isArray(data.weekly_standings)) return [...data.weekly_standings].map(x=>({...x,pending:Math.max(0,(data.results?.total||0)-(data.results?.final||0))})).sort((a,b)=>b.correct-a.correct||a.wrong-b.wrong||a.name.localeCompare(b.name));
  return (data.participants||[]).map(p=>({name:p.name,correct:0,wrong:0,pending:data.results?.total||0}));
}

function renderRankList(id,rows=[]){
  const wrap=$(id); if(!wrap) return; wrap.replaceChildren();
  const sorted=[...rows].sort((a,b)=>b.correct-a.correct||a.wrong-b.wrong||a.name.localeCompare(b.name));
  let last=null,rank=0;
  sorted.forEach(r=>{if(last===null||r.correct!==last){rank++;last=r.correct}const el=document.createElement('div');el.className='rank-row';el.innerHTML='<span class="rank-pos">'+rank+'</span><strong>'+esc(r.name)+'</strong><span>'+r.correct+' ✓</span><span>'+r.wrong+' ×</span>';wrap.append(el)});
}
function renderPrevious(w4){
  if(!w4) return;
  const n=Number(w4.week_number||4);
  setText('w4-heading','RESULTADOS · WEEK '+n);
  const foldLabel=document.querySelector('.archive-section .section-collapse > summary');
  if(foldLabel)foldLabel.textContent='ÚLTIMO CIERRE · WEEK '+n+' · RESULTADOS Y RANKINGS';
  const closedFold=document.querySelector('.archive-section .section-collapse');
  if(closedFold && !closedFold.dataset.initialized){
    closedFold.open=true;
    closedFold.dataset.initialized='1';
  }
  const area=document.querySelector('#w4-heading')?.closest('.section');
  if(area){ const e=area.querySelector('.eyebrow');if(e)e.textContent='ÚLTIMO CIERRE · WEEK '+n;const heads=area.querySelectorAll('.section-head .eyebrow');if(heads[1])heads[1].textContent='WEEK '+n;if(heads[2])heads[2].textContent='TEMPORADA · TRAS WEEK '+n; const spans=area.querySelectorAll('.section-stat'); if(spans[0])spans[0].textContent=(w4.results?.final||0)+'/'+(w4.results?.total||0)+' FINAL'; if(spans[2])spans[2].textContent='TRAS WEEK '+n; }
  setText('w4-final-count',w4.results?.final??0);
  const leader=[...(w4.weekly_standings||[])].sort((a,b)=>b.correct-a.correct||a.wrong-b.wrong)[0];
  setText('w4-summary','Week '+n+' · '+(w4.results?.final??0)+'/'+(w4.results?.total??16)+' FINAL · '+(leader?leader.name+' lidera la semana con '+leader.correct+'/'+(w4.results?.scored??w4.results?.total??0)+' aciertos posibles':'ranking final disponible')+'.');
  const wrap=$('w4-games'); if(wrap){wrap.replaceChildren();(w4.games||[]).forEach(g=>{const row=document.createElement('div');row.className='result-row final';row.innerHTML='<div><strong>'+esc(g.id)+' · '+esc(g.matchup)+'</strong><span>'+esc(g.time)+'</span></div><div class="game-state"><b>'+((g.status==='TIE'||g.winner==='TIE'||(!g.winner&&g.score))?'EMPATE · PUSH':'GANÓ '+esc(g.winner||'—'))+'</b><span>'+esc(g.score||'FINAL')+'</span></div>';wrap.append(row)})}
  renderRankList('w4-weekly-ranking',w4.weekly_standings||[]);
  renderRankList('w4-season-ranking',w4.season_standings||[]);
}

function renderParticipants(list=[]){
  const wrap=$('participants');if(!wrap)return;wrap.replaceChildren();
  list.forEach(p=>{const row=document.createElement('div');const ok=String(p.status).toUpperCase().startsWith('COMPLETE');row.className='participant '+(ok?'complete':'pending');row.innerHTML='<span class="participant-name">'+esc(p.name)+'</span><span class="participant-status">'+(ok?'RECIBIDO':'FALTA')+'</span>';wrap.append(row)});
}
function renderRosterSummary(list=[]){
  const sent=list.filter(p=>String(p.status).toUpperCase().startsWith('COMPLETE')).map(p=>p.name);
  const pending=list.filter(p=>!String(p.status).toUpperCase().startsWith('COMPLETE')).map(p=>p.name);
  setText('sent-names',sent.length?sent.join(' · '):'NINGUNO');
  setText('pending-names',pending.length?pending.join(' · '):'NINGUNO');
}
// Captura vigente se lee por separado del cierre W5 y nunca modifica sus resultados.
function renderFutureCapture(snapshot){
  const c=snapshot?.capture;
  if(!c)return;
  const total=Number(c.total||9), complete=Number(c.complete||0);
  setText('week-label',snapshot.week+' · '+snapshot.season+' · CAPTURA');
  setText('capture-count',complete+'/'+total);
  setText('missing-count',Math.max(0,total-complete));
  setText('window-status',snapshot.week+' '+(String(c.window).toUpperCase()==='OPEN'?'ABIERTA':'CERRADA'));
  setText('deadline','CIERRE · '+(c.deadline_label||'—'));
  setHref('stable-capture',c.stable_url);
  setHref('direct-form',c.form_url);
  const p=$('progress-bar');if(p)p.style.width=(total?Math.round(100*complete/total):0)+'%';
  const pw=document.querySelector('.progress');
  if(pw){pw.setAttribute('aria-valuenow',String(complete));pw.setAttribute('aria-valuemax',String(total));}
  renderParticipants(snapshot.participants||[]);
  renderRosterSummary(snapshot.participants||[]);
  setText('w6-confirmed',complete+'/'+total+' RESPUESTAS COMPLETAS VERIFICADAS · '+Math.max(0,total-complete)+' PENDIENTES');
  setText('last-jotform-check','CORTE VERIFICADO · '+(c.submission_integrity?.evidence_date||'PENDIENTE'));
  const fold=$('capture-details');
  if(fold){fold.open=true;fold.dataset.initialized='1';}
  setText('capture-rule',complete+'/'+total+' envíos completos verificados por Jotform · '+(c.received_picks||0)+' de '+(c.expected_picks||0)+' selecciones respondidas. Primera respuesta/ID y picks aún pendientes de conciliación.');
  setText('sync-mode','CAPTURA SEMANAL · ESTADO EN VIVO');
}
// Read-only overlay from the existing push/backend Redis receipts. Never shows selections.
async function refreshLiveReceipts(snapshot,stamp){
  if(!snapshot)return {status:'NO_ACTIVE_CAPTURE'};
  try{
    const url='https://packersmexicogithubio-push-backend.vercel.app/api/capture-status?form_id='+encodeURIComponent(snapshot.capture.form_id)+'&week='+encodeURIComponent(snapshot.week_number)+'&t='+stamp;
    const response=await fetch(url,{cache:'no-store'});
    if(!response.ok)throw Error('CAPTURE_STATUS_HTTP_'+response.status);
    const live=await response.json();
    if(!live.ok||Number(live.week)!==Number(snapshot.week_number)||
       String(live.form_id)!==String(snapshot.capture?.form_id))throw Error('CAPTURE_STATUS_FORM_MISMATCH');

    const verified=new Set((live.verified_participants||[]).map(x=>String(x.name||'').toUpperCase()));
    const participants=(snapshot.participants||[]).map(p=>({
      ...p,status:verified.has(String(p.name).toUpperCase())?'COMPLETE_VERIFIED_LIVE':p.status
    }));
    const total=Number(live.total||snapshot.capture.total||9);
    const complete=Number(live.verified_count||participants.filter(p=>String(p.status).startsWith('COMPLETE')).length);
    renderParticipants(participants);
    renderRosterSummary(participants);
    setText('capture-count',complete+'/'+total);
    setText('missing-count',Math.max(0,total-complete));
    setText('w6-confirmed',complete+'/'+total+' RESPUESTAS COMPLETAS VERIFICADAS · '+Math.max(0,total-complete)+' PENDIENTES');
    setText('last-jotform-check','ÚLTIMA VERIFICACIÓN · '+fmtSync(live.checked_at)+(live.last_verified_at?' · ÚLTIMO ENVÍO VALIDADO '+fmtSync(live.last_verified_at):''));
    const p=$('progress-bar');if(p)p.style.width=(total?Math.round(100*complete/total):0)+'%';
    const pw=document.querySelector('.progress');if(pw){pw.setAttribute('aria-valuenow',String(complete));pw.setAttribute('aria-valuemax',String(total));}
    const waiting=(live.webhook_received_unreconciled||[]);
    setText('capture-rule',complete+'/'+total+' participantes verificados · '+(complete*14)+' de '+(total*14)+' selecciones completas. Picks privados; primera respuesta válida se conserva en backend.');
    return {
      status:live.backend_status||'CAPTURE_STATUS_UNKNOWN',
      pending:waiting.length,
      checkedAt:live.checked_at||null,
      lastVerifiedAt:live.last_verified_at||null,
      lastPush:live.last_push||null
    };
  }catch(err){
    console.warn('W6_LIVE_STATUS_UNAVAILABLE',String(err));
    return {status:'BACKEND_UNAVAILABLE'};
  }
}
function renderGames(games=[]){
  const wrap=$('games');wrap.replaceChildren();
  games.forEach(g=>{const row=document.createElement('div');row.className='result-row '+(g.winner?'final':'scheduled');row.innerHTML='<div><strong>'+esc(g.id)+' · '+esc(g.matchup)+'</strong><span>'+esc(g.time)+'</span></div><div class="game-state">'+(g.winner?'<b>GANÓ '+esc(g.winner)+'</b><span>'+esc(g.score||'FINAL')+'</span>':(g.status==='LIVE'||g.status==='IN_PROGRESS')?'<b>EN VIVO</b><span>'+esc(g.live_score||'')+' '+esc(g.live_detail||'')+'</span>':'<b>PENDIENTE</b><span>'+esc(g.status||'SCHEDULED')+'</span>')+'</div>';wrap.append(row)});
}
function renderRanking(data){
  const rows=weeklyTable(data); const wrap=$('weekly-ranking'); wrap.replaceChildren();
  const anyFinal=(data.results?.final||0)>0;
  let last=null,rank=0;rows.forEach(r=>{if(last===null||r.correct!==last){rank++;last=r.correct}const el=document.createElement('div');el.className='rank-row';el.innerHTML='<span class="rank-pos">'+rank+'</span><strong>'+esc(r.name)+'</strong><span>'+r.correct+' ✓</span><span>'+r.wrong+' ×</span>';wrap.append(el)});
  setText('ranking-status',anyFinal?((data.results.final===data.results.total)?'FINAL':'EN VIVO'):'PENDING');
}
function render(data){
 const c=data.capture||{}, total=Number(c.total||9), complete=Number(c.complete||0), pct=total?Math.round(complete/total*100):0;
 const picksLink=$('current-picks-link'); if(picksLink)picksLink.textContent='IMÁGENES Y DESCARGAS →';
 setText('week-label',data.week+' · '+data.season);setText('capture-count',complete+'/'+total);setText('missing-count',Math.max(0,total-complete));
 setText('window-status',String(c.window).toUpperCase()==='OPEN'?(data.week+' ABIERTA'):(data.week+' CERRADA'));setText('deadline','CIERRE · '+(c.deadline_label||'—'));
 setText('final-count',data.results?.final??0);setText('game-count',data.results?.total??(data.games||[]).length);
 setText('gate-status',data.publication?.gate||'HOLD');setText('last-sync',fmtSync(data.last_sync));setText('sync-mode',(data.sync_mode||'MANUAL').replaceAll('_',' '));
 setHref('stable-capture',c.stable_url);setHref('direct-form',c.form_url);setHref('data-system',data.operator?.data_system_url);
 const p=$('progress-bar');if(p)p.style.width=pct+'%';const pw=document.querySelector('.progress');if(pw){pw.setAttribute('aria-valuenow',String(complete));pw.setAttribute('aria-valuemax',String(total))}
 const membersFold=$('capture-details');
 if(membersFold && !membersFold.dataset.initialized){membersFold.open=complete<total;membersFold.dataset.initialized='1';}
 renderParticipants(data.participants||[]);renderGames(data.games||[]);renderRanking(data);
 setText('capture-rule',(c.received_picks||0)+'/'+(c.expected_picks||0)+' picks registrados · '+(c.missing_picks||0)+' pendientes.');
}
async function refreshPublishedAssets(stamp){
 const assets=[
  './exports/w4-picks-board.png',
  './exports/w4-ranking-weekly.png',
  './exports/w4-ranking-season.png'
 ];
 await Promise.all(assets.map(src=>fetch(src+'?t='+stamp,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('ASSET '+r.status)})));
}
async function load(manual=false){
 const btn=$('refresh-control'), msg=$('refresh-message');
 if(manual){
   if(btn) btn.disabled=true;
   if(msg) msg.textContent='ACTUALIZANDO… trayendo información y piezas más recientes.';
 }
 try{
   const stamp=Date.now();
   const r=await fetch(DATA_URL+'?t='+stamp,{cache:'no-store'});
   if(!r.ok) throw new Error('HTTP '+r.status);
   const data=await r.json();
   // La última semana finalizada puede ser la semana principal del feed.
   const isFinal=Number(data.results?.total)>0 &&
     Number(data.results?.final)===Number(data.results?.total);
   let closed=isFinal?data:null;
   if(!closed){
     const ir=await fetch('./exports/asset-index.json?t='+stamp,{cache:'no-store'});
     const idx=ir.ok?await ir.json():{};
     const week=Number(idx.last_completed_week||Math.max(1,Number(data.week_number||5)-1));
     const rr=await fetch('./weeks/week-'+String(week).padStart(2,'0')+'.json?t='+stamp,{cache:'no-store'});
     if(rr.ok){
       const candidate=await rr.json();
       if(Number(candidate.results?.total)>0 &&
         Number(candidate.results?.final)===Number(candidate.results?.total))closed=candidate;
     }
   }
   // Resolve live capture from the active weekly config. Do not pin it to W6:
   // after W6 is FINAL, W7's independent form must drive the live roster.
   let futureCapture=null;
   const configResp=await fetch('./capture-config.json?t='+stamp,{cache:'no-store'});
   if(configResp.ok){
     const activeConfig=await configResp.json();
     const captureWeek=Number(activeConfig.week_number);
     if(Number.isInteger(captureWeek) && captureWeek>Number(data.week_number) && captureWeek<=18){
       const filename='./weeks/week-'+String(captureWeek).padStart(2,'0')+'.json?t='+stamp;
       const snapshotResp=await fetch(filename,{cache:'no-store'});
       if(snapshotResp.ok){
         const snap=await snapshotResp.json();
         if(Number(snap.week_number)===captureWeek &&
            String(snap.capture?.form_id)===String(activeConfig.form_id) &&
            snap.capture?.form_id && snap.capture?.window==='OPEN'){
           futureCapture=snap;
         }
       }
     }
   }
   const previousSync=lastSeenSync;
   render(data); if(closed)renderPrevious(closed);
   if(futureCapture)renderFutureCapture(futureCapture);
   const receiptCheck=await refreshLiveReceipts(futureCapture,stamp);
   lastSeenSync=data.last_sync||null;
   if(msg){
     if(futureCapture){
       const verified=futureCapture.capture?.submission_integrity?.evidence_date||'SIN FECHA';
       const liveText=receiptCheck.status==='BACKEND_UNAVAILABLE'
         ? 'BACKEND SIN RESPUESTA · MOSTRANDO CORTE PUBLICADO'
         : 'BACKEND '+receiptCheck.status.replaceAll('_',' ');
       const pushText=receiptCheck.lastPush
         ? ' · ÚLTIMO PUSH RODRIGO '+String(receiptCheck.lastPush.rodrigo_status||'UNKNOWN')+' ('+String(receiptCheck.lastPush.participant||'')+')'
         : '';
       msg.textContent=(manual?'VERIFICACIÓN TERMINADA · ':'')+futureCapture.week+' · '+verified+' · '+liveText+pushText+' · ACTUALIZADO '+fmtSync(receiptCheck.checkedAt||new Date().toISOString());
     }else if(manual){
       msg.textContent=(previousSync&&previousSync===lastSeenSync)
         ? 'PANEL RECARGADO · SIN CAMBIOS NUEVOS · ÚLTIMO SYNC '+fmtSync(data.last_sync)
         : 'PANEL ACTUALIZADO · ÚLTIMO SYNC '+fmtSync(data.last_sync);
     }else{
       msg.textContent='ÚLTIMO ESTADO SINCRONIZADO · '+fmtSync(data.last_sync);
     }
   }
   if(manual&&$('view-refresh')) $('view-refresh').textContent=fmtSync(new Date().toISOString());
 }catch(e){
   setText('last-sync','SIN CONEXIÓN AL FEED');
   if(msg) msg.textContent='NO SE PUDO ACTUALIZAR INFORMACIÓN Y PIEZAS · intenta otra vez.';
   console.error(e);
 }finally{
   if(btn) btn.disabled=false;
 }
}
if($('view-refresh')) $('view-refresh').textContent='AL ABRIR';
const refreshBtn=$('refresh-control');
if(refreshBtn) refreshBtn.addEventListener('click',()=>load(true));
load(false);setInterval(()=>load(false),REFRESH_MS);