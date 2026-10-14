/* PMX QUINIELA · Asset desk · uses verified index states, never promotes RIGHTS_HOLD assets. */
(() => {
  'use strict';
  const ROOT = './exports/';
  const privateRepo='https://github.com/ibrahimsantana/pmx-video-factory/blob/main/quiniela-control/exports/';
  const privateRaw='https://github.com/ibrahimsantana/pmx-video-factory/raw/refs/heads/main/quiniela-control/exports/';
  // These URLs require GitHub access. Private operational QA files are NOT public assets.
  const figma='https://www.figma.com/design/RAoegEENwTH2L7gb3yydIq/?node-id=';
  const slotMeta={
    results:{name:'RESULTADOS FINALES',dim:'1600 × 2000',node:'3357-2147661',privateFile:'w5-results-live.png'},
    weekly:{name:'RANKING SEMANAL',dim:'1080 × 1350',node:'3357-2139371',privateFile:'w5-ranking-weekly.png'},
    season:{name:'RANKING GENERAL',dim:'1080 × 1350',node:'3357-2139425',privateFile:'w5-ranking-season.png'},
    picks:{name:'TODOS LOS PICKS',dim:'1600 × 2000',node:'3147-903160',file:'w5-picks-board.png'}
  };
  const $=id=>document.getElementById(id);
  function tag(name,className,txt) {
    const n=document.createElement(name);
    if(className)n.className=className;
    if(txt!==undefined)n.textContent=txt;
    return n;
  }
  function action(label,href,downloadName,secondary=false) {
    const a=tag('a',secondary?'secondary':'',label);
    a.href=href;
    if(downloadName)a.download=downloadName;
    if(href.startsWith('https://')){a.rel='noopener noreferrer';a.target='_blank';}
    return a;
  }
  async function exists(url){
    try{const r=await fetch(url+'?t='+Date.now(),{method:'HEAD',cache:'no-store'});return r.ok;}catch{return false;}
  }
  async function renderAssets(){
    const wrap=$('pmx-download-list'),mobile=$('pmx-mobile-links');
    if(!wrap||!mobile)return;
    try {
      const response=await fetch(ROOT+'asset-index.json?t='+Date.now(),{cache:'no-store'});
      if(!response.ok)throw new Error('INDEX_HTTP_'+response.status);
      const index=await response.json();
      const record=index.weeks?.['5'];
      if(!record||record.week!==5)throw new Error('W5_NOT_IN_INDEX');
      const entries=[];
      for(const kind of ['results','weekly','season','picks']){
        const meta=slotMeta[kind],asset=record.assets?.[kind]||{state:'WAITING_EVENT'};
        const item=tag('div','pmx-file');item.dataset.state=asset.state;
        const info=tag('div','');
        info.append(tag('strong','pmx-file-title',meta.name),tag('span','pmx-file-meta','WEEK 5 · '+meta.dim));
        const actions=tag('div','pmx-file-actions');
        const publicFile=kind==='picks'?meta.file:asset.href?.replace(/^\.\//,'');
        const ready=asset.state==='READY' && /^w5-[a-z-]+\.png$/.test(publicFile||'') && await exists(ROOT+publicFile);
        let status;
        if(ready){
          status='DISPONIBLE · PNG VERIFICADO';
          actions.append(action('DESCARGAR PNG ↗',ROOT+publicFile,'PMX_W5_'+kind.toUpperCase()+'.png'));
        }else if(kind==='results'&&asset.state==='RIGHTS_HOLD'&&asset.private_qa==='PASS'){
          status='PASS PRIVADO · PUBLICACIÓN BLOQUEADA POR DERECHOS';
          actions.append(action('DESCARGAR PNG · PRIVADO ↗',privateRaw+meta.privateFile,'PMX_W5_RESULTADOS_FINAL.png'));
          actions.append(action('VER ORIGINAL PRIVADO ↗',privateRepo+meta.privateFile,null,true));
          actions.append(action('VER EN FIGMA ↗',figma+meta.node,null,true));
        }else if(kind==='weekly'||kind==='season'){
          status=asset.state==='READY'?'PNG EN REVISIÓN · ACCESO PRIVADO':'QA PENDIENTE · DESCARGA INTERNA · NO PUBLICAR';
          actions.append(action('VER EN FIGMA ↗',figma+meta.node));
          actions.append(action('DESCARGAR PNG · PRIVADO ↗',privateRaw+meta.privateFile,'PMX_W5_'+kind.toUpperCase()+'.png',true));
        }else{
          status=asset.state==='RIGHTS_HOLD'?'RETENIDO POR DERECHOS':asset.state==='QA_PENDING'?'QA PENDIENTE':'ESPERANDO ENTREGA';
        }
        info.append(tag('span','pmx-file-state',status));
        item.append(info,actions);entries.push(item);
      }
      wrap.replaceChildren(...entries);
      mobile.replaceChildren();
      const files=[1,2,3].map(n=>'w5-picks-mobile-'+n+'.png');
      let mobileCount=0;
      for(const [i,file] of files.entries()){
        if(!await exists(ROOT+file))continue;
        const row=tag('div','pmx-mobile-file');
        row.append(tag('span','', 'MÓVIL '+(i+1)+' · 1080 × 1920'),
          action('DESCARGAR PNG ↗',ROOT+file,'PMX_W5_PICKS_MOVIL_'+(i+1)+'.png'));
        mobile.append(row);mobileCount++;
      }
      const fold=$('pmx-mobile-files');
      if(fold)fold.hidden=mobileCount===0;
      const preview=$('pmx-picks-thumb');
      if(preview){
        const p=record.assets?.picks;
        const ok=p?.state==='READY'&&await exists(ROOT+'w5-picks-board.png');
        preview.hidden=!ok;
      }
    }catch(err){
      wrap.replaceChildren(tag('p','pmx-assets-intro','No se pudo consultar el estado verificado. Abre el archivo de semanas para revisarlo.'));
      console.error('PMX_ASSETS',err);
    }
  }
  document.addEventListener('DOMContentLoaded',()=>{
    renderAssets();
    $('refresh-control')?.addEventListener('click',renderAssets);
  });
})();
