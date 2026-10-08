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
async function pmxLoadLibrary(){
  const c=document.getElementById('pmx-weekly-library');if(!c)return;
  try{
    const r=await fetch(LIBRARY_URL+'?t='+Date.now(),{cache:'no-store'});
    if(!r.ok)throw Error('ASSET_INDEX_HTTP_'+r.status);
    const d=await r.json();
    const weeks=d.weeks||{};
    c.replaceChildren();
    const active=Number(d.active_week);
    if(weeks[active])pmxRenderWeek(c,active,weeks[active],'SEMANA ACTUAL');
    const last=Number(d.last_completed_week);
    if(last && last!==active && weeks[last])pmxRenderWeek(c,last,weeks[last],'ÚLTIMA SEMANA CERRADA');
    const older=Object.keys(weeks).map(Number).filter(w=>w!==active&&w!==last).sort((a,b)=>b-a);
    for(const w of older)pmxRenderWeek(c,w,weeks[w],'ARCHIVO');
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
