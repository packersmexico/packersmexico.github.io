// Pure event planner: never sends a push, publishes to social, or mutates picks.
// Operator notifications target only RODRIGO and IBRA via /api/milestone-sync.
const PANEL='https://packersmexico.github.io/quiniela-control/';
const CAPTURE=PANEL+'captura/';
const LIBRARY=PANEL+'exports/live.html#pmx-weekly-library';
const SLOTS=['picks','results','weekly','season'];
const LABELS={picks:'PICKS',results:'RESULTADOS',weekly:'RANKING SEMANAL',season:'RANKING GENERAL'};

function whole(value) { const n=Number(value); return Number.isInteger(n) && n>0 ? n : 0; }
function upper(value) { return String(value||'').toUpperCase(); }
function finalWeek(data) {
  const r=data?.results||{};
  const total=whole(r.total);
  if(!total||whole(r.final)!==total||upper(r.status)!=='FINAL')return false;
  const games=data?.games||[];
  return games.length===total && games.every(g=>
    (g.status==='FINAL' && Boolean(g.winner)) ||
    (g.status==='TIE' && (g.winner===null || g.winner===undefined)));
}
function stageForWeek(stages,week) { return stages?.[String(week)]||stages?.[week]||null; }
function published(stage,slot) {
  const approval=stage?.asset_approvals?.[slot];
  if(!approval || !String(approval.evidence||'').trim())return false;
  if(approval.figma_qa!=='PASS'||approval.direction_review!=='PASS'||approval.export_verified!==true)return false;
  const dist=upper(approval.distribution);
  return dist.startsWith('PUBLISHED_USER_CONFIRMED')||dist.startsWith('PUBLISHED_VERIFIED');
}
export function milestoneEvents({data={},captureConfig={},assetIndex={},stages={}}={}) {
  const events=[],dataWeek=whole(data.week_number),cfgWeek=whole(captureConfig.week_number);
  // Capture may be ONE week ahead of data while the Monday-night game is pending.
  if(cfgWeek>=dataWeek&&cfgWeek<=dataWeek+1&&upper(captureConfig.status)==='OPEN'
    &&String(captureConfig.form_id||'').trim()
    &&String(captureConfig.form_url||'').startsWith('https://form.jotform.com/')) {
    const complete=Number(captureConfig.complete||0),total=Number(captureConfig.total||9);
    events.push({
      eventKey:'W'+cfgWeek+'_OPEN',
      title:'PACKERS MÉXICO · QUINIELA W'+cfgWeek+' ABIERTA',
      body:'Formulario nuevo W'+cfgWeek+'. '+complete+'/'+total+' participantes · cierre '+(captureConfig.deadline_label||'por confirmar')+'.',
      url:CAPTURE,tag:'pmx-quiniela-w'+cfgWeek+'-open'
    });
  }
  // Verified Jotform receipt cut: one operator alert per newly confirmed participant.
  // This is a catch-up notice from the approved snapshot, not proof of live webhook delivery.
  if(cfgWeek>=dataWeek && cfgWeek<=dataWeek+1 && upper(captureConfig.status)==='OPEN'){
    const confirmed=new Set((captureConfig.submission_integrity?.received_names||[]).map(upper));
    const justAdded=new Set((captureConfig.submission_integrity?.recently_verified_names||[]).map(upper));
    const allowed=new Set(['EL DOC','ARI','LALO','ALEX','LUIS C.','DR PALMA','JENNI','RODRI','IBRACHO']);
    for(const name of justAdded){
      if(!confirmed.has(name)||!allowed.has(name))continue;
      const token=name.replace(/[^A-Z0-9]+/g,'_');
      events.push({
        eventKey:'W'+cfgWeek+'_FORM_VERIFIED_'+token,
        title:'QUINIELA PMX · W'+cfgWeek+' · RESPUESTA RECIBIDA',
        body:name+' completó el formulario. Captura '+captureConfig.complete+'/'+captureConfig.total+'. Revisar panel; picks privados.',
        url:PANEL,tag:'pmx-quiniela-w'+cfgWeek+'-form-'+token.toLowerCase()
      });
    }
  }
  // A locked 9/9 is a different milestone from the form opening.
  const capture=cfgWeek>=dataWeek ? captureConfig : (data.capture||{});
  const activeWeek=cfgWeek>=dataWeek ? cfgWeek : dataWeek;
  if(activeWeek>0&&upper(capture.status||capture.window)==='CLOSED'
     &&whole(capture.complete)===whole(capture.total)
     &&whole(capture.total)>0 && Object.keys(capture.locked_submissions||{}).length===whole(capture.total)) {
    events.push({
      eventKey:'W'+activeWeek+'_9OF9',
      title:'PACKERS MÉXICO · W'+activeWeek+' · 9/9 REGISTROS',
      body:'Los '+capture.total+' primeros registros válidos quedaron bloqueados. Preparar piezas de picks en 04.',
      url:PANEL,tag:'pmx-quiniela-w'+activeWeek+'-9of9'
    });
  }
  // Notify when MNF finishes and ALL results are official; never gate on PNG readiness.
  if(dataWeek>0&&finalWeek(data)) {
    const total=Number(data.results.total);
    const scored=Number(data.results.scored ?? (total-Number(data.results.pushes||0)));
    events.push({
      eventKey:'W'+dataWeek+'_FINAL',
      title:'PACKERS MÉXICO · WEEK '+dataWeek+' COMPLETADA',
      body:total+'/'+total+' partidos decididos (incluidos PUSH). '+scored+' puntuables. Rankings actualizados; imágenes aún requieren QA.',
      url:PANEL,tag:'pmx-quiniela-w'+dataWeek+'-final'
    });
  }
  // Export eligibility comes exclusively from verified asset-index (real PNG + Figma + Direction).
  for(const [rawWeek,record] of Object.entries(assetIndex.weeks||{})) {
    const week=whole(rawWeek);
    if(week<5 || week>Math.max(dataWeek,cfgWeek) || !record?.assets)continue;
    const stage=stageForWeek(stages,week);
    for(const slot of SLOTS) {
      const asset=record.assets[slot];
      if(asset?.state!=='READY'||!/^\.\/w\d+-[a-z-]+\.png$/.test(String(asset.href||'')))continue;
      // W5 picks were already published; do not reannounce a historical download.
      if(week===5&&slot==='picks')continue;
      events.push({
        eventKey:'W'+week+'_ASSET_READY_'+slot.toUpperCase(),
        title:'PACKERS MÉXICO · W'+week+' · '+LABELS[slot]+' DISPONIBLES',
        body:'Archivo aprobado y listo para DESCARGAR del panel. Publicación NO automática; requiere autorización.',
        url:LIBRARY,tag:'pmx-quiniela-w'+week+'-asset-'+slot,
        assetSlots:[slot],needsAsset:'exports/'+asset.href.slice(2)
      });
      // Publication is a separate verified event; never equate an available PNG with a social post.
      if(week>=6 && published(stage,slot)) {
        events.push({
          eventKey:'W'+week+'_PUBLISHED_'+slot.toUpperCase(),
          title:'PACKERS MÉXICO · W'+week+' · PUBLICACIÓN CONFIRMADA',
          body:LABELS[slot]+': publicación registrada y validada; no republicar.',
          url:LIBRARY,tag:'pmx-quiniela-w'+week+'-published-'+slot,
          assetSlots:[slot],needsAsset:'exports/'+asset.href.slice(2)
        });
      }
    }
  }
  return events;
}
