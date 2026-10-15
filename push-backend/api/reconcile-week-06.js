import crypto from 'node:crypto';
import {redis} from '../lib/redis.js';
import {json,rejectMethod} from '../lib/http.js';
import {assertWeekConfig,normalizeName} from '../lib/weekly-capture.js';
import {parseOriginalSubmission,hydrateFirstValid} from '../lib/jotform-hydration.js';

const FORM='262845110194050';
const SOURCE='https://raw.githubusercontent.com/packersmexico/packersmexico.github.io/main/quiniela-control/contracts/week-06.json';
function authorized(req){
 const expected=process.env.PMX_RECONCILE_SECRET;
 const given=String(req.headers.authorization||'');
 if(!expected)return false;
 const a=Buffer.from(given),b=Buffer.from('Bearer '+expected);
 return a.length===b.length&&crypto.timingSafeEqual(a,b);
}
function hashEntries(raw){
 if(Array.isArray(raw)){const r={};for(let i=0;i<raw.length;i+=2)r[raw[i]]=raw[i+1];return r;}
 return raw||{};
}
async function fetchOriginal(sid,key){
 const resp=await fetch('https://api.jotform.com/submission/'+encodeURIComponent(sid),{
   headers:{APIKEY:key,Accept:'application/json'},cache:'no-store',signal:AbortSignal.timeout(12000)
 });
 if(!resp.ok)throw Error('JOTFORM_HTTP_'+resp.status);
 const body=await resp.json();
 if(Number(body.responseCode||0)!==200)throw Error('JOTFORM_RESPONSE_ERROR');
 return body;
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store, max-age=0');
 if(req.method!=='POST')return rejectMethod(req,res,['POST']);
 if(!authorized(req))return json(res,401,{ok:false,error:'UNAUTHORIZED'});
 const key=process.env.PMX_JOTFORM_API_KEY;
 if(!key)return json(res,503,{ok:false,error:'JOTFORM_API_CREDENTIAL_REQUIRED'});
 let contract;
 try{const r=await fetch(SOURCE,{cache:'no-store'});if(!r.ok)throw Error('CONTRACT');contract=assertWeekConfig(await r.json());
    if(String(contract.form_id)!==FORM||Number(contract.week_number)!==6)throw Error('FORM_CONTRACT');}
 catch{return json(res,503,{ok:false,error:'CONTRACT_UNAVAILABLE'});}
 let records;
 try{records=hashEntries(await redis(['HGETALL','pmx:quiniela:jotform:first-valid:'+FORM]));}
 catch{return json(res,503,{ok:false,error:'REDIS_UNAVAILABLE'});}
 const names=contract.roster.map(normalizeName);
 const outcome={hydrated:0,already_complete:0,failed:0,missing:0,ids_mismatch:0};
 for(const name of names){
   const raw=records[name];if(!raw){outcome.missing++;continue;}
   let lock;
   try{lock=JSON.parse(raw);}catch{outcome.failed++;continue;}
   if(!/^\d{10,25}$/.test(String(lock.submission_id||''))){outcome.failed++;continue;}
   if(lock.picks&&typeof lock.picks==='object'){outcome.already_complete++;continue;}
   try{
     const source=await fetchOriginal(String(lock.submission_id),key);
     const verified=parseOriginalSubmission(source,contract,name,lock.submission_id);
     const status=await hydrateFirstValid(redis,FORM,name,lock.submission_id,verified.picks);
     if(status==='HYDRATED')outcome.hydrated++;
     else if(status==='ALREADY_COMPLETE')outcome.already_complete++;
     else if(status==='SUBMISSION_MISMATCH')outcome.ids_mismatch++;
     else outcome.failed++;
   }catch(err){
     outcome.failed++;
     console.warn('W6_HYDRATION_FAILED',String(err.message||'ERROR').replace(/\d{10,}/g,'[REDACTED]'));
   }
 }
 // Re-read all existing first-valid records, never expose their contents.
 const final=hashEntries(await redis(['HGETALL','pmx:quiniela:jotform:first-valid:'+FORM]));
 let complete=0,totalPicks=0,valid=true;
 for(const name of names){
   const v=final[name];if(!v){valid=false;continue;}
   try{const rec=JSON.parse(v);const p=rec.picks;
     if(p&&typeof p==='object'&&Object.keys(p).length===contract.games.length){
       complete++;totalPicks+=Object.keys(p).length;
     }else valid=false;
   }catch{valid=false;}
 }
 return json(res,200,{ok:true,week:6,records:names.length,complete_records:complete,private_picks_count:totalPicks,integrity:valid?'COMPLETE':'INCOMPLETE',outcome,notifications_sent:0,picks_visible:false});
}
