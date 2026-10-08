const LIBRARY_URL='./asset-index.json';
const SLOT_NAMES={picks:'HOJA DE PICKS',results:'RESULTADOS FINALES',weekly:'RANKING SEMANAL',season:'RANKING GLOBAL'};
function pmxAssetLabel(state){
  return state==='READY'?'PNG APROBADO':state==='QA_PENDING'?'PENDIENTE DE QA FIGMA':'PENDIENTE DEL EVENTO';
}
function pmxRenderWeek(container,week,record,heading){
  const section=document.createElement('section');
  section.className='asset';
  const h=document.createElement('h2');h.textContent=heading+' · WEEK '+week;section.append(h);
  const p=document.createElement('p');p.className='meta';
  p.textContent=(record?.capture?.complete??0)+'/'+(record?.capture?.total??9)+' RESPUESTAS · '+(record?.results?.final??0)+'/'+(record?.results?.total??0)+' JUEGOS FINAL';
  section.append(p);
  for(const [key,title] of Object.entries(SLOT_NAMES)){
    const a=record?.assets?.[key]||{state:'WAITING_EVENT'};
    const item=document.createElement('div');item.className='pmx-export-row';
    const label=document.createElement('strong');label.textContent=title;item.append(label);
    if(a.state==='READY' && typeof a.href==='string' && /^\.\/w\d+[-a-z]+\.png$/.test(a.href)){
      const link=document.createElement('a');link.href=a.href;link.download='PMX_W'+week+'_'+key.toUpperCase()+'.png';link.textContent='DESCARGAR PNG →';item.append(link);
    }else{
      const status=document.createElement('span');status.textContent=pmxAssetLabel(a.state);item.append(status);
    }
    section.append(item);
  }
  container.append(section);
}
async function pmxReviewCandidates(container,week){
  try{
    const url='../figma-week-'+String(week).padStart(2,'0')+'.json?t='+Date.now();
    const r=await fetch(url,{cache:'no-store'});
    if(!r.ok) return;
    const qa=await r.json();
    if(Number(qa.week)!==Number(week) || !String(qa.qa?.export||'').startsWith('PASS') || !String(qa.qa?.picks_visual_review||'').startsWith('PASS')) return;
    const nodeList=[
      ['Hoja principal',qa.output_targets?.picks,'1600 × 2000'],
      ['Mobile 1',qa.output_targets?.mobile1,'1080 × 1920'],
      ['Mobile 2',qa.output_targets?.mobile2,'1080 × 1920'],
      ['Mobile 3',qa.output_targets?.mobile3,'1080 × 1920']
    ];
    if(nodeList.some(([,path])=>!/^quiniela-control\/exports\/w\d+-picks-(?:board|mobile-[123])\.png$/.test(path||''))) return;
    const section=document.createElement('section');
    section.className='asset';section.id='pmx-w5-review';
    const title=document.createElement('h2');title.textContent='WEEK '+week+' · HOJA DE PICKS · 9/9';
    const desc=document.createElement('p');desc.className='note';
    desc.textContent=qa.publication_ready===true?'Paquete Figma aprobado y exportado':'REVISIÓN OPERATIVA · 4 PNG verificados. No publicar en redes hasta autorización de Dirección y cierre de captura.';
    section.append(title,desc);
    const thumb=document.createElement('img');
    thumb.className='review-thumb';
    thumb.src='./'+qa.output_targets.picks.split('/').pop();
    thumb.alt='Vista previa de la hoja de picks Week '+week+' · 9 participantes y 15 partidos';
    thumb.loading='lazy';
    section.append(thumb);
    const mobile=document.createElement('details');
    mobile.className='library-fold';
    const mobileSummary=document.createElement('summary');
    mobileSummary.textContent='Versiones móviles · 3 imágenes';
    mobile.append(mobileSummary);
    for(const [name,target,size] of nodeList){
      const href='./'+target.split('/').pop();
      const row=document.createElement('div');row.className='pmx-export-row';
      const label=document.createElement('strong');label.textContent=name+' · '+size;row.append(label);
      const link=document.createElement('a');link.href=href;link.download='PMX_W'+week+'_'+target.split('/').pop();link.textContent='REVISAR / DESCARGAR PNG →';row.append(link);
      if(name==='Hoja principal')section.append(row);
      else mobile.append(row);
    }
    section.append(mobile);
    container.append(section);
  }catch(err){console.error('W5 REVIEW',err)}
}
async function pmxLoadLibrary(){
  const c=document.getElementById('pmx-weekly-library');if(!c)return;
  try{
    const r=await fetch(LIBRARY_URL+'?t='+Date.now(),{cache:'no-store'});
    if(!r.ok)throw Error('ASSET_INDEX_HTTP_'+r.status);
    const d=await r.json();
    const weeks=d.weeks||{};
    c.replaceChildren();
    const active=Number(d.active_week);
    await pmxReviewCandidates(c,active);
    if(weeks[active]){
      const current=document.createElement('details');current.className='library-fold';
      const summary=document.createElement('summary');summary.textContent='Estado de Week '+active+' · datos y siguientes entregables';
      current.append(summary);pmxRenderWeek(current,active,weeks[active],'SEMANA ACTUAL');c.append(current);
    }
    const last=Number(d.last_completed_week);
    if(last && last!==active && weeks[last]){
      const prior=document.createElement('details');prior.className='library-fold';
      const summary=document.createElement('summary');summary.textContent='Último cierre · Week '+last+' · resultados y rankings';
      prior.append(summary);pmxRenderWeek(prior,last,weeks[last],'ÚLTIMA SEMANA CERRADA');c.append(prior);
    }
    const older=Object.keys(weeks).map(Number).filter(w=>w!==active&&w!==last).sort((a,b)=>b-a);
    if(older.length){
      const archive=document.createElement('details');archive.className='library-fold';
      const summary=document.createElement('summary');summary.textContent='Archivo histórico · '+older.length+' semanas';
      archive.append(summary);
      for(const w of older)pmxRenderWeek(archive,w,weeks[w],'ARCHIVO');
      c.append(archive);
    }
  }catch(e){
    c.textContent='NO SE PUDO CONSULTAR EL ÍNDICE DE EXPORTACIONES. No descargar material no verificado.';
    console.error(e);
  }
}
document.addEventListener('DOMContentLoaded',()=>{
  pmxLoadLibrary();
  document.getElementById('refresh-now')?.addEventListener('click',pmxLoadLibrary);
  setInterval(pmxLoadLibrary,60000);
});
