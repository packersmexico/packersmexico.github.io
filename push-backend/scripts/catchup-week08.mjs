// Trusted backend-only catch-up for authentic missed Week 8 webhooks.
// There are NO synthetic submissions and NO retroactive pushes.
import crypto from 'node:crypto';
import {redis} from '../lib/redis.js';
import {resolveParticipant,normalizeText} from '../lib/jotform-capture.js';
import {assertWeekConfig,validateWeeklyPicks} from '../lib/weekly-capture.js';
import {checksum} from '../lib/jotform-hydration.js';
const FORM='262986491498075';
const BASE='https://raw.githubusercontent.com/packersmexico/packersmexico.github.io/main/quiniela-control/contracts/week-08.json';
function requireCorrectOriginal(s,contract){
 const name=resolveParticipant(s.answers||{},new Set(contract.roster.map(normalizeText)));
 if(!name||String(s.form_id||s.formID||'')!==FORM||!/^[0-9]{10,25}$/.test(String(s.id||'')))return null;
 const result=validateWeeklyPicks(s.answers||{},contract);
 if(!result.valid||Object.keys(result.picks).length!==contract.games.length)return null;
 const t=String(s.created_at||'');const created=Date.parse(t.endsWith('Z')?t:t.replace(' ','T')+'Z');
 if(!Number.isFinite(created)||created>Date.parse(contract.deadline))return null;
 return {name,original_id:String(s.id),created_at:t,picks:result.picks};
}
async function fetchFormSubmissions(key){
 const rows=[];let offset=0;
 for(let n=0;n<5;n++){
  const endpoint='https://api.jotform.com/form/'+FORM+'/submissions?limit=100&offset='+offset+'&orderby=created_at';
  const response=await fetch(endpoint,{headers:{APIKEY:key,Accept:'application/json'},cache:'no-store'});
  if(!response.ok)throw Error('JOTFORM_SUBMISSIONS_HTTP_'+response.status);
  const body=await response.json();
  if(Number(body.responseCode)!==200||!Array.isArray(body.content))throw Error('JOTFORM_SUBMISSIONS_BAD_RESPONSE');
  rows.push(...body.content);
  if(body.content.length<100)break;
  offset+=100;
 }
 return rows;
}
export async function catchupWeek08(){
if(process.env.VERCEL_ENV!=='production')return {ok:false,status:'SKIP_NONPRODUCTION'};
if(!process.env.PMX_JOTFORM_API_KEY)throw Error('JOTFORM_API_KEY_UNAVAILABLE');
{
 try {
  const contractResponse=await fetch(BASE,{cache:'no-store'});
  if(!contractResponse.ok)throw Error('W8_CONTRACT_UNAVAILABLE');
  const contract=assertWeekConfig(await contractResponse.json());
  if(contract.week_number!==8||String(contract.form_id)!==FORM)throw Error('FORM_CONTRACT_MISMATCH');
  const originals=await fetchFormSubmissions(process.env.PMX_JOTFORM_API_KEY);
  const valid=originals.map(s=>requireCorrectOriginal(s,contract)).filter(Boolean)
    .sort((a,b)=>Date.parse(a.created_at)-Date.parse(b.created_at)||a.original_id.localeCompare(b.original_id));
  let newValid=0,duplicates=0;
  const lock='pmx:quiniela:jotform:first-valid:'+FORM;
  const receipts='pmx:quiniela:jotform:receipts:'+FORM;
  const seen=new Set();
  for(const entry of valid){
   if(seen.has(entry.name)){duplicates++;continue;}seen.add(entry.name);
   const hash=crypto.createHash('sha256').update(entry.original_id).digest('hex').slice(0,12).toUpperCase();
   const record={participant:entry.name,submission_id:entry.original_id,submission_hash:hash,
     submitted_at:entry.created_at,received_at:new Date().toISOString(),
     integrity:'14_OF_14',picks:entry.picks,picks_checksum:checksum(entry.picks),
     source:'JOTFORM_PRIVATE_API_RECOVERY',notifications_sent:0};
   const stored=await redis(['HSETNX',lock,entry.name,JSON.stringify(record)]);
   if(Number(stored)===1){
    newValid++;
    await redis(['HSETNX',receipts,entry.name,JSON.stringify({received_at:record.received_at,submission_hash:hash})]);
   }else duplicates++;
  }
  const rows=await redis(['HGETALL',lock]);
  const records=Array.isArray(rows)?rows:[];
  let count=0,totalPicks=0,unhealthy=0;
  for(let i=0;i<records.length;i+=2){
   const rec=JSON.parse(records[i+1]);
   if(!contract.roster.includes(records[i])||!rec.submission_id||Object.keys(rec.picks||{}).length!==14){unhealthy++;continue;}
   count++;totalPicks+=Object.keys(rec.picks).length;
  }
  if(unhealthy||count>9)throw Error('W8_LOCKS_INTEGRITY');
  console.info('PMX_W8_CATCHUP_READBACK',JSON.stringify({
    form:'W8',jotform_submissions:originals.length,valid_submissions:valid.length,
    redis_first_valid:count,private_picks:totalPicks,new_first_valid:newValid,
    ignored_duplicates:duplicates,notifications_sent:0,picks_visible:false
  }));
  return {ok:true,week:8,verified_count:count,valid_submissions:valid.length,added:newValid,private_picks_count:totalPicks};
 }catch(e){console.error('PMX_W8_CATCHUP_HOLD',String(e.message||'UNKNOWN').replace(/[0-9]{10,}/g,'[REDACTED]'));throw e;}
}
}
if(process.argv[1]?.endsWith('/catchup-week08.mjs')) await catchupWeek08();
