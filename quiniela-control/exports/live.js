const DATA='../data.json';
let current=null;
const $=id=>document.getElementById(id);

function formatTime(value){
  if(!value) return 'SIN HORA';
  try{
    return new Intl.DateTimeFormat('es-MX',{timeZone:'America/Mexico_City',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(value)).toUpperCase()+' CDMX';
  }catch{return value;}
}

function refreshImages(stamp){
  const map=[
    ['picks-image','./w3-picks-board.png'],
    ['results-live-image','./w3-results-live.png'],
    ['weekly-image','./w3-ranking-weekly.png'],
    ['season-image','./w3-ranking-season.png']
  ];
  return Promise.all(map.map(([id,src])=>new Promise(resolve=>{
    const img=$(id);
    if(!img){resolve();return;}
    const done=()=>resolve();
    img.addEventListener('load',done,{once:true});
    img.addEventListener('error',done,{once:true});
    img.src=src+'?t='+stamp;
  })));
}

async function load(manual=false){
  const btn=$('refresh-now');
  const status=$('refresh-status');
  if(manual){
    if(btn) btn.disabled=true;
    if(status) status.textContent='ACTUALIZANDO… revisando datos, resultados y archivos.';
  }
  try{
    const stamp=Date.now();
    const r=await fetch(DATA+'?t='+stamp,{cache:'no-store'});
    if(!r.ok) throw new Error('HTTP '+r.status);
    current=await r.json();
    $('asset-week').textContent='QUINIELA · '+current.week+' · '+current.season;
    $('asset-status').textContent='PUBLICATION READY · '+current.capture.complete+'/'+current.capture.total+' · '+current.results.final+'/'+current.results.total+' FINAL';
    await refreshImages(stamp);
    if(status){
      status.textContent=(manual?'ACTUALIZACIÓN COMPLETA · ':'ÚLTIMA SINCRONIZACIÓN · ')+formatTime(current.last_sync);
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
