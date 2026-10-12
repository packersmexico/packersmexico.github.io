#!/usr/bin/env node
/**
 * PMX · QUINIELA · progressive DATA-ONLY work files for 04/Figma.
 * These are NOT Figma masters, PNGs, final rankings or authorization to post.
 * Never serialize submitted/unpublished picks into a public Github artifact.
 */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const ROOT='quiniela-control';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const integer=n=>Number.isInteger(Number(n))?Number(n):0;
const resultStatus=g=>g.status==='TIE'?'PUSH':g.status==='FINAL'&&g.winner?'DECIDED':'PENDING';
const datePrefix=n=>'week-'+String(n).padStart(2,'0');

export function resultsDraft(data) {
  const week=integer(data.week_number);
  assert(week>=1 && Array.isArray(data.games) && data.games.length>0,'INVALID_RESULTS_SOURCE');
  const games=data.games;
  const decided=games.filter(g=>resultStatus(g)!=='PENDING').length;
  const pushes=games.filter(g=>g.status==='TIE' && g.winner==null).length;
  const scored=games.filter(g=>g.status==='FINAL' && Boolean(g.winner)).length;
  assert.equal(decided,integer(data.results?.final),'DECIDED_RESULT_MISMATCH');
  assert.equal(scored,integer(data.results?.scored ?? scored),'SCORED_RESULT_MISMATCH');
  assert.equal(pushes,integer(data.results?.pushes ?? pushes),'PUSH_RESULT_MISMATCH');
  assert.equal(decided,scored+pushes,'INVALID_PUSH_ARITHMETIC');
  const final=decided===games.length && String(data.results?.status).toUpperCase()==='FINAL';
  const roster=(data.participants||[]).map(p=>p.name);
  const weekly=(data.weekly_standings||[]).map(s=>({name:s.name,correct:s.correct,wrong:s.wrong}));
  const season=(data.season_standings||[]).map(s=>({name:s.name,correct:s.correct,wrong:s.wrong}));
  assert.equal(weekly.length,roster.length,'WEEKLY_RANKING_COUNT_MISMATCH');
  assert.equal(season.length,roster.length,'SEASON_RANKING_COUNT_MISMATCH');
  const draw={
    schema:'PMX_QUINIELA_04_RESULTS_WORKFILE_V1',week,season:data.season||2026,
    kind:'DATA_ONLY_FOR_EXISTING_FIGMA_MASTER',governance:{
      owner:'04',auto_publish:false,not_an_asset:true,
      figma_master_required:true,qa_required:true,
      no_downloadable_png_without_04_PASS:true
    },
    status:final?'ALL_RESULTS_FINAL_READY_FOR_04':'PARTIAL_RESULTS_IN_PROGRESS',
    source:'quiniela-control/data.json',last_sync:data.last_sync||null,
    progress:{decided,total:games.length,scoreable:scored,pushes,remaining:games.length-decided},
    headline:'RESULTADOS · WEEK '+week,
    games:games.map(g=>({
      game_id:g.id,matchup:g.matchup,kickoff:g.time||null,
      state:resultStatus(g),score:g.score||null,
      winner:g.status==='TIE'?null:(g.winner||null),
      is_push:g.status==='TIE',
      visual_label:g.status==='TIE'?'EMPATE · PUSH':g.status==='FINAL'?('GANÓ '+g.winner):'EN ESPERA DE FINAL'
    })),
    rankings:{
      state:final?'DATA_FINAL_NEEDS_VISUAL_QA':'PROVISIONAL_DO_NOT_PUBLISH',
      weekly,season
    },
    visual_slots:{
      results:{file:'w'+week+'-results-live.png',state:final?'READY_FOR_04':'DRAFT_ONLY'},
      weekly:{file:'w'+week+'-ranking-weekly.png',state:final?'READY_FOR_04':'DRAFT_ONLY'},
      season:{file:'w'+week+'-ranking-season.png',state:final?'READY_FOR_04':'DRAFT_ONLY'}
    }
  };
  // Prevent accidental inclusion of submission records/picks in public data workfiles.
  const serialized=JSON.stringify(draw);
  assert(!serialized.includes('locked_submissions') && !serialized.includes('"picks":['),'PUBLIC_PICKS_LEAK');
  return draw;
}
export function picksDraft(config,upcoming) {
  const week=integer(config.week_number);
  assert(week>=1 && week===integer(upcoming.week_number),'WEEK_MISMATCH');
  const roster=(upcoming.participants||[]).map(p=>p.name);
  const games=upcoming.games||[];
  assert(roster.length===9&&games.length===14,'W6_ROSTER_OR_SLATE_INVALID');
  const locks=config.locked_submissions||{};
  // Name-only status, NOT the user's picks. Early public export is prohibited.
  const masked=roster.map(name=>({
    name,status:Array.isArray(locks[name]?.picks)&&locks[name].picks.length===games.length?
      'FIRST_VALID_RECONCILED':'PENDING_CANONICAL_RECONCILIATION',
    visible_selection:'•••'
  }));
  const valid=masked.filter(p=>p.status==='FIRST_VALID_RECONCILED').length;
  const reported=integer(config.complete);
  const closed=String(config.status).toUpperCase()==='CLOSED';
  const ready=closed&&valid===roster.length&&reported===roster.length;
  const out={
    schema:'PMX_QUINIELA_04_PICKS_PROGRESS_WORKFILE_V1',week,season:upcoming.season,
    kind:'DATA_ONLY_PRIVACY_MASKED_NO_UNPUBLISHED_PICKS',governance:{
      owner:'04',auto_publish:false,not_an_asset:true,
      figma_master_required:true,qa_required:true,
      raw_picks_private_until_capture_close:true
    },
    status:ready?'CAPTURE_LOCKED_READY_FOR_PRIVATE_04_HANDOFF':
      'BUILDING_NONPUBLIC_PICKS_WORKFILE',
    source:'quiniela-control/capture-config.json + weeks/'+datePrefix(week)+'.json',
    form_id:config.form_id,deadline:config.deadline,
    progress:{validated:valid,reported,total:roster.length,
      expected_picks:roster.length*games.length,
      confirmed_picks:valid*games.length,
      jotform_submissions_unreconciled:'NOT_IN_CANONICAL_SOURCE',
      mismatch:valid!==reported},
    gb_default:{game_id:'G13',pick:'GB',editable:true,not_forced:true},
    games:games.map(g=>({game_id:g.id,matchup:g.matchup,kickoff:g.time||null})),
    participants:masked,
    visual_slots:{
      picks:{file:'w'+week+'-picks-board.png',
        state:ready?'DATA_GATE_READY_NEEDS_PRIVATE_04_HANDOFF':'PRIVATE_PREVIEW_ONLY'}
    },
    security:'DO_NOT_STORE_UNPUBLISHED_PICKS_IN_PUBLIC_WORKFILE'
  };
  const serialized=JSON.stringify(out);
  assert(!serialized.includes('submission_id')&&!serialized.includes('"picks":['),'PUBLIC_PICKS_LEAK');
  return out;
}
function selfTest(){
  const games=[{id:'G01',status:'FINAL',winner:'GB',score:'GB 17–3 CHI',matchup:'CHI @ GB'},
               {id:'G02',status:'TIE',winner:null,score:'NYG 27–27 WAS',matchup:'NYG @ WAS'},
               {id:'G03',status:'SCHEDULED',winner:null,score:null,matchup:'BUF @ LAR'}];
  const people=[{name:'P1'}];
  const data={week_number:5,games,participants:people,results:{final:2,scored:1,pushes:1,status:'LIVE'},
    weekly_standings:[{name:'P1',correct:1,wrong:0}],
    season_standings:[{name:'P1',correct:40,wrong:22}],
    capture:{locked_submissions:{P1:{picks:['GB','NYG','BUF'],submission_id:'DO_NOT_LEAK'}}}};
  let draft=resultsDraft(data);
  assert.equal(draft.status,'PARTIAL_RESULTS_IN_PROGRESS');
  assert.equal(draft.games[1].visual_label,'EMPATE · PUSH');
  assert.equal(draft.progress.remaining,1);
  assert(!JSON.stringify(draft).includes('DO_NOT_LEAK'));
  data.games[2]={...games[2],status:'FINAL',winner:'BUF',score:'BUF 20–14 LAR'};
  data.results={final:3,scored:2,pushes:1,status:'FINAL'};
  draft=resultsDraft(data);
  assert.equal(draft.status,'ALL_RESULTS_FINAL_READY_FOR_04');
  const roster=['EL DOC','ARI','LALO','ALEX','LUIS C.','DR PALMA','JENNI','RODRI','IBRACHO'];
  const cfg={week_number:6,status:'OPEN',complete:0,form_id:'262845110194050',
    locked_submissions:{'ARI':{picks:Array(14).fill('GB'),submission_id:'HIDE_THIS_ID'}}};
  const next={week_number:6,season:2026,participants:roster.map(name=>({name})),
    games:Array.from({length:14},(_,i)=>({id:'G'+String(i+1).padStart(2,'0'),matchup:'A @ B'}))};
  let p=picksDraft(cfg,next);
  assert.equal(p.progress.validated,1);
  assert.equal(p.progress.mismatch,true);
  assert.equal(p.visual_slots.picks.state,'PRIVATE_PREVIEW_ONLY');
  assert(!JSON.stringify(p).includes('HIDE_THIS_ID'));
  cfg.complete=9;cfg.status='CLOSED';
  cfg.locked_submissions=Object.fromEntries(roster.map(name=>[name,{picks:Array(14).fill('GB')}]));
  p=picksDraft(cfg,next);
  assert.equal(p.visual_slots.picks.state,'DATA_GATE_READY_NEEDS_PRIVATE_04_HANDOFF');
  console.log('PASS: live progress, final after MNF, PUSH arithmetic, private masked W6, 9x14, gate');
}
function save(file,obj) {
  const target=path.join(ROOT,'production',file);
  fs.mkdirSync(path.dirname(target),{recursive:true});
  const serialized=JSON.stringify(obj,null,2)+'\n';
  const current=fs.existsSync(target)?fs.readFileSync(target,'utf8'):null;
  if(current!==serialized)fs.writeFileSync(target,serialized);
  console.log(JSON.stringify({path:target,status:obj.status,progress:obj.progress}));
}
if(process.argv.includes('--self-test')) selfTest();
else {
  const data=read(path.join(ROOT,'data.json'));
  const cfg=read(path.join(ROOT,'capture-config.json'));
  const upcoming=read(path.join(ROOT,'weeks',datePrefix(Number(cfg.week_number))+'.json'));
  save('week-'+String(data.week_number).padStart(2,'0')+'-results-workfile.json',resultsDraft(data));
  save('week-'+String(cfg.week_number).padStart(2,'0')+'-picks-progress-workfile.json',picksDraft(cfg,upcoming));
}