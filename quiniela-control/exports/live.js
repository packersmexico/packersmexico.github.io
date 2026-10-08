const DATA='../data.json';
let current=null;
const $=id=>document.getElementById(id);

function formatTime(value){
  if(!value) return 'SIN HORA';
  try{
    return new Intl.DateTimeFormat('es-MX',{timeZone:'America/Mexico_City',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(value)).toUpperCase()+' CDMX';
  }catch{return value;}
}

function renderLiveResults(data){
  const wrap=$('live-game-list');
  if(!wrap)return;
  wrap.replaceChildren();
  const games=data.games||[];
  const finals=games.filter(g=>g.status==='FINAL' && g.winner);
  $('live-game-count').textContent=finals.length+'/'+games.length+' FINAL';
  $('live-title').textContent=(data.week||'SEMANA ACTUAL')+' · RESULTADOS EN VIVO';
  for(const g of games){
    const row=document.createElement('div');row.className='live-game-row';
    const left=document.createElement('strong');left.textContent=g.id+' · '+g.matchup;
    const right=document.createElement('span');right.textContent=g.status==='FINAL'?('FINAL · '+(g.score||g.winner)):('PENDIENTE · '+g.time);
    row.append(left,right);wrap.append(row);
  }
  const note=$('live-results-note');
  if(note)note.textContent='Fuente: última sincronización '+formatTime(data.last_sync)+'. Datos y aciertos no autorizan imágenes ni publicación automática.';
}

async function approvedVisualPackage(week){
  try{
    const url='../figma-week-'+String(week).padStart(2,'0')+'.json?t='+Date.now();
    const r=await fetch(url,{cache:'no-store'});
    if(!r.ok)return null;
    const m=await r.json();
    if(Number(m.week)!==Number(week) || m.publication_ready!==true)return null;
    if(!String(m.qa?.visual_review||'').includes('PASS'))return null;
    if(!String(m.gate||'').includes('QA_PASS'))return null;
    const keys=['picks','results','weekly','season'];
    for(const k of keys){
      const target=m.output_targets?.[k];
      if(!target || !/^quiniela-control\/exports\/[\w-]+\.png$/.test(target))return null;
      const test=await fetch('./'+target.split('/').pop()+'?t='+Date.now(),{method:'HEAD',cache:'no-store'});
      if(!test.ok)return null;
    }
    return m;
  }catch(e){return null}
}

function refreshImages(stamp,manifest){
  const map=[
    ['picks-image',manifest?.output_targets?.picks?'./'+manifest.output_targets.picks.split('/').pop():'./w4-picks-board.png'],
    ['results-image',manifest?.output_targets?.results?'./'+manifest.output_targets.results.split('/').pop():'./w4-results-live.png'],
    ['weekly-image',manifest?.output_targets?.weekly?'./'+manifest.output_targets.weekly.split('/').pop():'./w4-ranking-weekly.png'],
    ['season-image',manifest?.output_targets?.season?'./'+manifest.output_targets.season.split('/').pop():'./w4-ranking-season.png']
  ];
  return Promise.all(map.map(([id,src])=>new Promise(resolve=>{
    const img=$(id);
    if(!img){resolve();return;}
    const done=()=>resolve();
    img.addEventListener('load',done,{once:true});
    img.addEventListener('error',done,{once:true});
    const a=img.closest('.asset')?.querySelector('a[download]');
    if(a) a.href=src;
    img.src=src+'?t='+stamp;
  })));
}

async function load(manual=false){
  const btn=$('refresh-now');
  const status=$('refresh-status');
  if(manual){
    if(btn) btn.disabled=true;
    if(status) status.textContent='ACTUALIZANDO… cargando información y piezas más recientes.';
  }
  try{
    const stamp=Date.now();
    const r=await fetch(DATA+'?t='+stamp,{cache:'no-store'});
    if(!r.ok) throw new Error('HTTP '+r.status);
    current=await r.json();
    renderLiveResults(current);
    const latestApproved=await approvedVisualPackage(Number(current.week_number));
    const displayedAssets=latestApproved || await approvedVisualPackage(4);
    $('asset-week').textContent='QUINIELA · '+current.week+' · '+current.season;
    $('asset-status').textContent='SEMANA ACTIVA · '+current.capture.complete+'/'+current.capture.total+' · PNG ACTUAL: '+(latestApproved?'WEEK '+current.week_number+' QA PASS':'SOLO WEEK 4 · NUEVOS PNG PENDIENTES')+'';
    await refreshImages(stamp,displayedAssets);
    if(status){
      status.textContent=(manual?'DATOS RECARGADOS · PNG APROBADOS REVISADOS · SYNC ':'ÚLTIMA SINCRONIZACIÓN · ')+formatTime(current.last_sync);
    }
  }catch(e){
    console.error(e);
    if(status) status.textContent='NO SE PUDO ACTUALIZAR · intenta de nuevo.';
  }finally{
    if(btn) btn.disabled=false;
  }
}
document.addEventListener('DOMContentLoaded',()=>{
  const btn=$('refresh-now');
  if(btn) btn.addEventListener('click',()=>load(true));
  load(false);
  setInterval(()=>load(false),60000);
});
