#!/usr/bin/env node
// One idempotent season-cycle step INSIDE existing Quiniela reconciliation Action.
// Never publishes to social; never copies individual picks or IDs to GitHub.
import fs from 'node:fs';
import path from 'node:path';
const ROOT='quiniela-control';
const API='https://packersmexicogithubio-push-backend.vercel.app/api/';
const ROSTER=['EL DOC','ARI','LALO','ALEX','LUIS C.','DR PALMA','JENNI','RODRI','IBRACHO'];
const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));
const save=(p,d)=>{const file=path.join(ROOT,p),txt=JSON.stringify(d,null,2)+'\n';fs.mkdirSync(path.dirname(file),{recursive:true});if(!fs.existsSync(file)||fs.readFileSync(file,'utf8')!==txt){fs.writeFileSync(file,txt);return true;}return false;};
const tag=w=>'week-'+String(w).padStart(2,'0')+'.json';
const isoNow=()=>new Date().toISOString();
const invariant=(ok,why)=>{if(!ok)throw Error(why);};
async function call(route,body,authorized=true){
 const secret=process.env.PMX_PUSH_SECRET;
 if(authorized && !secret)throw Error('PMX_PUSH_SECRET_UNAVAILABLE');
 const res=await fetch(API+route,{method:'POST',headers:{'Content-Type':'application/json',...(authorized?{Authorization:'Bearer '+secret}:{})},
  body:JSON.stringify(body),signal:AbortSignal.timeout(80000)});
 const payload=await res.json();
 if(!res.ok||!payload.ok)throw Error('BACKEND_'+route+'_'+(payload.reason||payload.error||res.status));
 return payload;
}
async function captureStatus(config){
 const url=API+'capture-status?week='+config.week_number+'&form_id='+config.form_id+'&t='+Date.now();
 const res=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(40000)});
 if(!res.ok)throw Error('CAPTURE_STATUS_HTTP_'+res.status);
 const d=await res.json();
 invariant(d.ok && Number(d.week)===config.week_number && String(d.form_id)===String(config.form_id),'LIVE_FORM_MISMATCH');
 return d;
}
function canClose(config,live,now){
 const deadline=Date.parse(config.deadline);
 invariant(Number.isFinite(deadline),'BAD_CAPTURE_DEADLINE');
 const total=Number(config.total||9),n=Number(live.verified_count||0);
 invariant(total===9 && Number.isInteger(n)&&n>=0&&n<=9,'INVALID_LIVE_ROSTER_COUNT');
 const names=(live.verified_participants||[]).map(x=>x.name);
 invariant(new Set(names).size===n && names.every(x=>ROSTER.includes(x)),'INVALID_LIVE_NAMES');
 const isComplete=n===9 && Number(live.private_picks_count)===9*Number(live.week_games||config.expected_picks/9);
 return {due:isComplete||now>=deadline,complete:isComplete,n,names};
}
function confirmDeadline(utc){
 const t=Date.parse(utc);
 invariant(Number.isFinite(t),'UNKNOWN_KICKOFF_TIME');
 // Three hours before first kickoff, rounded DOWN to the whole local hour.
 // Mexico City is permanently UTC-6 in the 2026 regular season.
 return new Date(Math.floor((t-3*3600000)/3600000)*3600000).toISOString();
}
export {canClose,confirmDeadline};
async function main(){
 if(process.argv.includes('--self-test')){
  const sample={week_number:9,total:9,deadline:'2026-11-05T22:00:00Z',expected_picks:135};
  invariant(canClose(sample,{verified_count:9,verified_participants:ROSTER.map(name=>({name})),private_picks_count:135},Date.parse('2026-11-04T12:00:00Z')).complete,'EARLY_9OF9');
  invariant(!canClose(sample,{verified_count:8,verified_participants:ROSTER.slice(0,8).map(name=>({name})),private_picks_count:120},Date.parse('2026-11-04T12:00:00Z')).due,'PARTIAL_NOT_EARLY');
  invariant(canClose(sample,{verified_count:8,verified_participants:ROSTER.slice(0,8).map(name=>({name})),private_picks_count:120},Date.parse('2026-11-06T12:00:00Z')).due,'DEADLINE_CUTOFF');
  invariant(confirmDeadline('2026-11-13T01:15:00Z')==='2026-11-12T22:00:00.000Z','W10_DEADLINE');
  console.log('PASS W9-W18: first-valid closing, deadline, 9/9, no premature rollover');return;
 }
 invariant(process.env.GITHUB_ACTIONS==='true','GH_ACTIONS_ONLY');
 const config=read('capture-config.json');
 invariant(config.week_number>=9&&config.week_number<=18,'UNEXPECTED_ACTIVE_WEEK');
 const now=Date.now(),current=Number(config.week_number);
 if(String(config.status)==='OPEN'){
  const live=await captureStatus(config);
  const cut=canClose(config,live,now);
  console.log('PMX_CAPTURE_2026',JSON.stringify({week:current,verified:cut.n,deadline:config.deadline,due:cut.due,complete:cut.complete}));
  if(!cut.due)return;
  // Verifies Jotform disable before writing public CLOSED state. Idempotent.
  const status=await call('reconcile-capture',{action:'CLOSE_ACTIVE',week:current,form_id:String(config.form_id)});
  invariant(status.verified&&status.status==='DISABLED','JOTFORM_CLOSE_NOT_VERIFIED');
  const snapshot=read('weeks/'+tag(current));
  invariant(snapshot.week_number===current&&snapshot.capture.form_id===config.form_id,'SNAPSHOT_CLOSURE_MISMATCH');
  const expected=9*snapshot.games.length;
  const verifiedNames=cut.names;
  const missing=ROSTER.filter(x=>!verifiedNames.includes(x));
  const integrity={...config.submission_integrity,status:cut.complete?'COMPLETE':'INCOMPLETE_HOLD',first_valid_only:true,
   locked_picks_immutable:true,evidence_form_id:config.form_id,received_names:verifiedNames,
   private_picks_count:Number(live.private_picks_count||0),picks_visible:false};
  const close={...config,status:'CLOSED',window:'CLOSED',form_status:'DISABLED',
   capture_status:cut.complete?'CLOSED_FIRST_VALID_9OF9':'CLOSED_DEADLINE_INCOMPLETE_HOLD',
   complete:cut.n,received_picks:Number(live.private_picks_count||0),
   expected_picks:expected,missing_picks:expected-Number(live.private_picks_count||0),
   unique_participants:cut.n,missing_participants:missing,submission_integrity:integrity,
   closed_at:isoNow(),last_sync:isoNow(),
   closure_basis:cut.complete?'AUTO_9_OF_9':'AUTO_DEADLINE_INCOMPLETE_HOLD'};
  snapshot.capture={...snapshot.capture,...close};
  snapshot.participants=ROSTER.map(name=>({name,status:verifiedNames.includes(name)?'COMPLETE_VERIFIED':'PENDING_FIRST_VALID'}));
  snapshot.snapshot_status=cut.complete?'CLOSED_WAITING_NFL_FINAL':'CLOSED_INCOMPLETE_HOLD';
  invariant(save('capture-config.json',close),'CONFIG_STILL_OLD');save('weeks/'+tag(current),snapshot);
  console.log('PMX_AUTO_CLOSED',JSON.stringify({week:current,complete:cut.n,status:close.capture_status,form_disabled:true}));
  return;
 }
 if(String(config.status)!=='CLOSED'){console.log('PMX_CAPTURE_TRANSITION_HOLD',String(config.status));return;}
 if(current>=18){console.log('PMX_SEASON_COMPLETE_NO_NEXT_WEEK');return;}
 const next=current+1;
 const data=read('data.json');
 // Opening requires the PREVIOUS full week official FINAL and certified scores.
 const verifiedFinal=Number(data.week_number)===current&&data.results?.status==='FINAL'&&
   Number(data.results?.final)>0&&Number(data.results?.final)===Number(data.results?.total)&&
   data.scoring?.status==='COMPLETE'&&
   Array.isArray(data.season_standings)&&data.season_standings.length===9;
 if(!verifiedFinal){console.log('PMX_NEXT_FORM_HOLD_PREVIOUS_MNF_NOT_FINAL',{current,next});return;}
 const filename='season-plan/'+tag(next);
 if(!fs.existsSync(path.join(ROOT,filename))){console.log('PMX_NEXT_FORM_HOLD_NO_PLAN',next);return;}
 const manifest=read(filename);
 invariant(manifest.week===next && manifest.status.startsWith('STAGED'),'NEXT_PLAN_NOT_STAGED');
 if(!/^\d{10,25}$/.test(String(manifest.form_id||''))){
  console.log('PMX_NEXT_FORM_HOLD_NOT_CREATED',next);return;
 }
 if(next>=16&&manifest.status.includes('FLEX_DATES_UNCONFIRMED')){console.log('PMX_NEXT_FORM_HOLD_FLEX_KICKOFF_UNVERIFIED',next);return;}
 const [check,prev]=await Promise.all([
  call('reconcile-capture',{action:'INSPECT_STAGED',week:next}),
  Promise.resolve(read('weeks/'+tag(current)))
 ]);
 invariant(check.form_status==='DISABLED'&&check.question_map_verified&&check.game_count===manifest.games.length,'JOTFORM_INSPECTION_HOLD');
 invariant(prev.week_number===current && prev.results?.status==='FINAL'&&prev.season_standings?.length===9,'PREVIOUS_SNAPSHOT_NOT_FINAL');
 const target=Date.parse(check.deadline_utc),deadline=confirmDeadline(manifest.first_kickoff_utc);
 invariant(target>now && Date.parse(deadline)>now,'OPENING_AFTER_DEADLINE_HOLD');
 // The staged ESPN schedule and form matchups must agree in both directions.
 invariant(check.games.length===manifest.games.length&&check.games.every(x=>
   manifest.games.some(g=>g.matchup===x.visitor[1]+' @ '+x.home[1])),'NFL_FORM_GAME_DISAGREEMENT');
 const planGames=check.games.map(g=>{
   const official=manifest.games.find(x=>x.matchup===g.visitor[1]+' @ '+g.home[1]);
   return {id:g.id,matchup:official.matchup,time:'HORARIO OFICIAL · CDMX',kickoff_iso:official.kickoff_iso,
    status:'SCHEDULED',winner:null,score:null,espn_event_id:official.event_id};
 });
 const contract={week_number:next,form_id:check.form_id,timezone:'America/Mexico_City',
   deadline,roster:ROSTER,packers_locked:check.packers_locked,packers_bye:check.packers_bye,
   bye_teams:check.bye_teams,source_schedule:check.source_schedule,
   source_schedule_verified:isoNow(),field_map_qa:'PASS',
   field_map_evidence:'Authenticated Jotform questions, zero submissions and disabled form revalidated at rollover '+isoNow(),
   games:check.games};
 // Only activate after all gates. An interrupted commit may need an operator repair.
 const enabled=await call('reconcile-capture',{action:'OPEN_STAGED',week:next,form_id:check.form_id});
 invariant(enabled.verified && enabled.status==='ENABLED','FORM_ENABLE_READBACK_MISSING');
 const created={season:'2026',week:'WEEK '+next,week_number:next,form_id:check.form_id,form_url:check.form_url,
  status:'OPEN',window:'OPEN',deadline,deadline_label:'CIERRE AUTOMÁTICO · '+deadline,
  stable_url:'https://packersmexico.github.io/quiniela-control/captura/',form_status:'ENABLED',
  complete:0,total:9,expected_picks:9*planGames.length,received_picks:0,missing_picks:9*planGames.length,
  missing_participants:ROSTER,duplicate_policy:'FIRST_VALID_SUBMISSION_LOCKED_PER_PARTICIPANT',
  default_green_bay_policy:check.packers_locked?'GB_FIXED_NON_EDITABLE':'PACKERS_BYE',
  default_green_bay_game_id:check.games.find(g=>g.fixed_default==='GB')?.id||null,
  default_green_bay_pick:check.packers_locked?'GB':null,
  submission_integrity:{status:'AWAITING_FIRST_VALID',received_names:[],private_picks_count:0,
    first_valid_only:true,picks_visible:false,locked_picks_immutable:true,evidence_form_id:check.form_id},
  locked_submissions:{},duplicate_count:0,unique_participants:0,
  invitado:'OFF',source_schedule:check.source_schedule,webhook_status:'POLLING_RECONCILIATION_10MIN',
  open_basis:'AUTO_PREVIOUS_MNF_FINAL_AND_JOTFORM_QA',opened_at:isoNow(),last_sync:isoNow(),
  closure_basis:null,closed_at:null};
 const snap={pmx_id:prev.pmx_id,season:'2026',week:'WEEK '+next,week_number:next,
  snapshot_status:'OPEN_CAPTURE_NO_GAMES_STARTED',schedule_source:check.source_schedule,capture:created,
  participants:ROSTER.map(name=>({name,status:'PENDING_FIRST_VALID'})),games:planGames,
  results:{final:0,total:planGames.length,status:'SCHEDULED',in_progress:0,ties:0,scored:0,pushes:0},
  weekly_standings:[],season_standings:[],season_base_before_week:prev.season_standings,
  production:{package_status:'W'+next+' CAPTURE OPEN · WAITING FIRST_VALID',auto_publish:false},
  bye_teams:check.bye_teams,scoring:{status:'NOT_STARTED',original_picks_preserved:true,picks_visible:false}};
 save('contracts/'+tag(next),contract);save('weeks/'+tag(next),snap);
 const old=read('capture-config.json');invariant(old.week_number===current&&old.status==='CLOSED','ACTIVE_CAPTURE_CHANGED');
 save('capture-config.json',created);
 manifest.status='ACTIVATED_FORM_ENABLED';manifest.form_status='ENABLED';manifest.opened_at=isoNow();
 manifest.field_map_verified=true;save(filename,manifest);
 console.log('PMX_AUTO_OPENED',JSON.stringify({week:next,games:planGames.length,form_enabled:true,zero_picks:true,prior_final:true}));
}
await main();
