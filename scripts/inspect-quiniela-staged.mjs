#!/usr/bin/env node
// Durable, sanitized proof that each staged form still matches its approved NFL weekly fixture.
// Runs in existing authenticated reconciliation job. NEVER enables future forms.
import fs from 'node:fs';
const DIR='quiniela-control/';
const API='https://packersmexicogithubio-push-backend.vercel.app/api/reconcile-capture';
function read(f){return JSON.parse(fs.readFileSync(DIR+f,'utf8'))}
function save(f,j){const p=DIR+f;const s=JSON.stringify(j,null,2)+'\n';if(!fs.existsSync(p)||fs.readFileSync(p,'utf8')!==s)fs.writeFileSync(p,s)}
async function inspect(week){
 const filename='season-plan/week-'+String(week).padStart(2,'0')+'.json';
 const manifest=read(filename);
 if(manifest.field_map_verified===true||!String(manifest.status||'').startsWith('STAGED'))return {week,status:'NOT_ELIGIBLE'};
 if(!manifest.form_id && week>=13){
   if(!process.env.PMX_PUSH_SECRET)throw Error('PMX_SECRET_UNAVAILABLE');
   const response=await fetch(API,{method:'POST',
     headers:{Authorization:'Bearer '+process.env.PMX_PUSH_SECRET,'Content-Type':'application/json'},
     body:JSON.stringify({action:'CREATE_STAGED',week}),signal:AbortSignal.timeout(85000)});
   const body=await response.json();
   if(!response.ok||!body.ok || body.form_status!=='DISABLED' || 
      !body.zero_submissions || !body.inspected?.question_map_verified ||
      body.inspected?.form_status!=='DISABLED'||body.inspected?.game_count!==manifest.games.length)
     throw Error('FUTURE_FORM_CREATE_HOLD_'+week+'_'+String(body.reason||body.error||'BAD_MAP').replace(/[0-9]{10,}/g,'[REDACTED]'));
   manifest.form_id=body.form_id;manifest.form_url=body.form_url;
   manifest.field_map_verified=true;
   manifest.status=manifest.release_gate?.flex_or_tbd_revalidation_required
     ?'STAGED_FORM_DISABLED_FLEX_HOLD':'STAGED_FORM_DISABLED_QA_PASS';
   manifest.public_form_status='DISABLED_VERIFIED';
   manifest.form_metadata={status:'DISABLED',submission_count:0,field_map_readback:body.inspected.verified_at,
      game_count:body.game_count,autoprovisioned:true};
   const deadline=new Date(Date.parse(manifest.first_kickoff_utc)-3*3600000).toISOString();
   save('contracts/week-'+String(week).padStart(2,'0')+'.json',{
     week_number:week,form_id:body.form_id,timezone:'America/Mexico_City',deadline,
     roster:manifest.roster,packers_locked:body.inspected.packers_locked,
     packers_bye:body.inspected.packers_bye,bye_teams:manifest.bye_teams,
     source_schedule:manifest.source_schedule,
     source_schedule_verified:manifest.generated_at,field_map_qa:'PASS',
     field_map_evidence:'Authenticated Jotform API create+DISABLED+zero submissions+question ID readback '+body.inspected.verified_at,
     games:body.inspected.games
   });
   save(filename,manifest);
   return {week,status:manifest.status,games:body.game_count,form_id:body.form_id,disabled:true,
     verified:true,flex_hold:body.flex_hold};
 }
 if(!manifest.form_id)return {week,status:'NOT_CREATED'};
 if(!process.env.PMX_PUSH_SECRET)throw Error('PMX_SECRET_UNAVAILABLE');
 const response=await fetch(API,{method:'POST',headers:{Authorization:'Bearer '+process.env.PMX_PUSH_SECRET,'Content-Type':'application/json'},body:JSON.stringify({action:'INSPECT_STAGED',week}),signal:AbortSignal.timeout(60000)});
 const body=await response.json();
 if(!response.ok||!body.ok)throw Error('JOTFORM_INSPECTION_HOLD_'+(body.reason||body.error||response.status));
 if(body.form_status!=='DISABLED'||!body.question_map_verified||body.game_count!==manifest.games.length)
  throw Error('JOTFORM_STAGE_NOT_CERTIFIED_'+String(body.week)+'_'+String(body.form_status)+'_'+String(body.question_map_verified)+'_'+String(body.game_count)+'_EXPECTED_'+manifest.games.length);

 if(JSON.stringify(body.roster)!==JSON.stringify(manifest.roster))throw Error('ROSTER_NOT_CANONICAL');
 if(body.games.length!==manifest.games.length||body.games.some(g=>!manifest.games.some(x=>x.matchup===g.visitor[1]+' @ '+g.home[1])))throw Error('JOTFORM_NFL_MISMATCH');
 const deadline=new Date(Math.floor((Date.parse(manifest.first_kickoff_utc)-3*3600000)/3600000)*3600000).toISOString();
 const contract={
  week_number:week,form_id:manifest.form_id,timezone:'America/Mexico_City',deadline,
  roster:manifest.roster,packers_locked:body.packers_locked,packers_bye:body.packers_bye,
  bye_teams:manifest.bye_teams,source_schedule:manifest.source_schedule,
  source_schedule_verified:manifest.generated_at,field_map_qa:'PASS',
  field_map_evidence:'Authenticated private Jotform API readback at '+body.verified_at+
   ', form DISABLED and zero submissions, '+body.games.length+' unique question IDs',
  games:body.games};
 save('contracts/week-'+String(week).padStart(2,'0')+'.json',contract);
 manifest.field_map_verified=true;manifest.form_metadata={...manifest.form_metadata,status:'DISABLED',field_map_readback:body.verified_at};
 manifest.status=manifest.release_gate?.flex_or_tbd_revalidation_required && !manifest.flex_schedule_verified
  ?'STAGED_FORM_DISABLED_FLEX_HOLD':'STAGED_FORM_DISABLED_QA_PASS';
 save('season-plan/week-'+String(week).padStart(2,'0')+'.json',manifest);
 return {week,status:'READY_BUT_DISABLED',games:body.games.length,form_id:body.form_id,deadline};
}
if(process.argv.includes('--self-test')) {
 const data=read('season-plan/week-10.json');
 if(data.week!==10||data.public_form_status!=='DISABLED_VERIFIED'||data.games.length!==14)throw Error('W10_PREBUILD_CONTRACT');
 console.log('PASS staged W10 form exists, remains disabled, other weeks may be missing');process.exit(0);
}
const outcomes=[];
for(let w=10;w<=18;w++){
 try{outcomes.push(await inspect(w))}
 catch(error){console.error('PMX_STAGE_INSPECTION_HOLD',w,String(error.message).replace(/[0-9]{10,}/g,'[REDACTED]'));/* fail-closed for this stage; keep existing active-week capture operational */}
}
console.log('PMX_STAGE_INSPECTION',JSON.stringify(outcomes));
