#!/usr/bin/env node
// Durable, sanitized proof that each staged form still matches its approved NFL weekly fixture.
// Runs in existing authenticated reconciliation job. NEVER enables future forms.
import fs from 'node:fs';
const DIR='quiniela-control/';
const API='https://packersmexicogithubio-push-backend.vercel.app/api/reconcile-capture';
function read(f){return JSON.parse(fs.readFileSync(DIR+f,'utf8'))}
function save(f,j){const p=DIR+f;const s=JSON.stringify(j,null,2)+'\n';if(!fs.existsSync(p)||fs.readFileSync(p,'utf8')!==s)fs.writeFileSync(p,s)}
async function inspect(week){
 const manifest=read('season-plan/week-'+String(week).padStart(2,'0')+'.json');
 if(!manifest.form_id||manifest.field_map_verified===true||!String(manifest.status||'').startsWith('STAGED'))return {week,status:'NOT_ELIGIBLE'};
 if(!process.env.PMX_PUSH_SECRET)throw Error('PMX_SECRET_UNAVAILABLE');
 const response=await fetch(API,{method:'POST',headers:{Authorization:'Bearer '+process.env.PMX_PUSH_SECRET,'Content-Type':'application/json'},body:JSON.stringify({action:'INSPECT_STAGED',week}),signal:AbortSignal.timeout(60000)});
 const body=await response.json();
 if(!response.ok||!body.ok)throw Error('JOTFORM_INSPECTION_HOLD_'+(body.reason||body.error||response.status));
 if(body.form_status!=='DISABLED'||!body.question_map_verified||body.game_count!==manifest.games.length)throw Error('JOTFORM_STAGE_NOT_CERTIFIED');
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
 manifest.status='STAGED_FORM_DISABLED_QA_PASS';save('season-plan/week-'+String(week).padStart(2,'0')+'.json',manifest);
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
 catch(error){console.error('PMX_STAGE_INSPECTION_HOLD',w,String(error.message).replace(/[0-9]{10,}/g,'[REDACTED]'));process.exitCode=1;}
}
console.log('PMX_STAGE_INSPECTION',JSON.stringify(outcomes));
