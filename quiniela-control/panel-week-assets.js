/* Quiniela operator download desk: index-driven W1..WN, never exposes private assets. */
(() => {
  'use strict';
  const ROOT='./exports/';
  const LABELS={picks:'TODOS LOS PICKS',results:'RESULTADOS FINALES',weekly:'RANKING SEMANAL',season:'RANKING GLOBAL'};
  const SIZE={picks:'1600 × 2000',results:'1600 × 2000',weekly:'1080 × 1350',season:'1080 × 1350'};
  const $=id=>document.getElementById(id);
  const tag=(name,cls,text)=>{const x=document.createElement(name);if(cls)x.className=cls;if(text!==undefined)x.textContent=text;return x;};
  async function exists(file){
    try{return (await fetch(ROOT+file,{method:'HEAD',cache:'no-store'})).ok;}
    catch{return false;}
  }
  function validPublicHref(href,week){
    const m=typeof href==='string' && /^\.\/(w(\d{1,2})-[a-z0-9-]+\.png)$/.exec(href);
    return m&&Number(m[2])===week?m[1]:null;
  }
  async function draw(index,week){
    const record=index.weeks?.[String(week)];
    if(!record)return;
    const wrap=$('pmx-download-list'),mobile=$('pmx-mobile-links');
    if(!wrap||!mobile)return;
    const keys=Object.keys(index.weeks||{}).filter(k=>Number.isInteger(Number(k))).map(Number).sort((a,b)=>b-a);
    const selectorRow=tag('div','pmx-file');
    const select=tag('select','pmx-week-selector');
    select.id='pmx-week-selector';select.setAttribute('aria-label','Seleccionar semana de Quiniela');
    for(const n of keys){const option=document.createElement('option');option.value=String(n);option.textContent='WEEK '+n;option.selected=n===week;select.append(option);}
    select.addEventListener('change',()=>draw(index,Number(select.value)));
    selectorRow.append(tag('strong','pmx-file-title','SELECCIONAR SEMANA'),select);
    const rows=[selectorRow];
    let readyPicks=null;
    for(const kind of ['picks','results','weekly','season']){
      const a=record.assets?.[kind]||{state:'WAITING_EVENT'};
      const row=tag('div','pmx-file');
      const info=tag('div','');
      info.append(tag('strong','pmx-file-title',LABELS[kind]),tag('span','pmx-file-meta','WEEK '+week+' · '+SIZE[kind]));
      const actions=tag('div','pmx-file-actions');
      const file= a.state==='READY'?validPublicHref(a.href,week):null;
      if(file && await exists(file)){
        const link=tag('a','', 'DESCARGAR PNG ↗');link.href=ROOT+file;link.download='PMX_W'+week+'_'+kind.toUpperCase()+'.png';
        actions.append(link);info.append(tag('span','pmx-file-state','DISPONIBLE · PNG VERIFICADO'));
        if(kind==='picks')readyPicks=file;
      }else{
        const status=a.state==='RIGHTS_HOLD'?'NO DISPONIBLE PARA DISTRIBUCIÓN':
          a.state==='QA_PENDING'?'EN REVISIÓN':
          a.state==='HISTORICAL_SOURCE_MISSING'?'ARCHIVO POR RECUPERAR':'AÚN NO DISPONIBLE';
        info.append(tag('span','pmx-file-state',status));
      }
      row.append(info,actions);rows.push(row);
    }
    wrap.replaceChildren(...rows);
    const title=$('pmx-assets-title')?.querySelector('span');if(title)title.textContent='WEEK '+week;
    const intro=document.querySelector('.pmx-assets-intro');
    if(intro)intro.textContent=(record.capture?.complete??'—')+'/'+(record.capture?.total??'—')+
      ' PARTICIPANTES · '+(record.results?.final??0)+'/'+(record.results?.total??0)+
      ' PARTIDOS FINAL · '+(record.capture?.window==='CLOSED'?'CAPTURA CERRADA':'CAPTURA EN CURSO');
    const thumb=$('pmx-picks-thumb');if(thumb){
      thumb.hidden=!readyPicks;thumb.style.display=readyPicks?'':'none';
      if(readyPicks){thumb.href=ROOT+readyPicks;thumb.download='PMX_W'+week+'_PICKS.png';
        const img=thumb.querySelector('img');if(img){img.src=ROOT+readyPicks;img.alt='Todos los picks Week '+week;}
        const label=thumb.querySelector('span');if(label)label.textContent='WEEK '+week+' · TODOS LOS PICKS';}
    }
    mobile.replaceChildren();
    if(week===5){
      for(let n=1;n<=3;n++){
        const file='w5-picks-mobile-'+n+'.png';
        if(!await exists(file))continue;
        const row=tag('div','pmx-mobile-file');
        row.append(tag('span','','MÓVIL '+n+' · WEEK 5'));
        const link=tag('a','','DESCARGAR PNG ↗');link.href=ROOT+file;link.download='PMX_W5_PICKS_MOVIL_'+n+'.png';
        row.append(link);mobile.append(row);
      }
    }
    const fold=$('pmx-mobile-files');if(fold)fold.hidden=!mobile.childElementCount;
  }
  async function refresh(){
    try{
      const r=await fetch(ROOT+'asset-index.json?t='+Date.now(),{cache:'no-store'});
      if(!r.ok)throw Error('ASSET_INDEX_UNAVAILABLE');
      const index=await r.json();
      const selected=Number($('pmx-week-selector')?.value||index.last_completed_week||index.score_week||index.active_week||5);
      await draw(index,index.weeks?.[String(selected)]?selected:Number(index.active_week));
    }catch{
      const wrap=$('pmx-download-list');
      if(wrap)wrap.replaceChildren(tag('p','pmx-assets-intro','No se pudo cargar el archivo semanal.'));
    }
  }
  document.addEventListener('DOMContentLoaded',()=>{
    refresh();$('refresh-control')?.addEventListener('click',refresh);
  });
})();
