// One-time safe recovery of two STAGED forms with authenticated provider readback.
// A failed future form edit must NOT block currently open W9 capture.
import fs from 'node:fs';
const API='https://packersmexicogithubio-push-backend.vercel.app/api/reconcile-capture';
const secret=process.env.PMX_PUSH_SECRET;
if(!secret)throw Error('PMX_PUSH_SECRET_MISSING');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
for(const week of [16,17]){
 const plan=read('quiniela-control/season-plan/week-'+week+'.json');
 if(plan.field_map_verified===true){console.log('PMX_STAGED_REPAIR_ALREADY_QA',week);continue;}
 const resp=await fetch(API,{method:'POST',
  headers:{Authorization:'Bearer '+secret,'Content-Type':'application/json'},
  body:JSON.stringify({action:'REPAIR_STAGED',week}),signal:AbortSignal.timeout(75000)});
 const body=await resp.json();
 if(!resp.ok||!body.ok||body.status!=='REPAIRED_DISABLED_PRIVATE'||
    body.form_status!=='DISABLED'||!body.field_map_verified){
   console.error('::warning::PMX_STAGED_REPAIR_HOLD_WEEK_'+week+'_'+String(body.reason||body.error||resp.status).replace(/[0-9]{10,}/g,'[REDACTED]'));
   continue; // only future QA is held; live capture cannot be blocked
 }
 console.log('PMX_STAGED_REPAIR_PASS',JSON.stringify({week,status:body.status,games:body.game_count,
   changed:body.edited,form_status:body.form_status,zero_submissions:body.zero_submissions}));
}
