// Public read-only capture status for Quiniela Control.
// Merges the public verified snapshot with private first-valid Redis locks.
// Never exposes picks, submission IDs, secrets or raw Jotform payloads.
import { redis } from '../lib/redis.js';
import { applyCors, json, rejectMethod } from '../lib/http.js';

const RAW_BASE='https://raw.githubusercontent.com/packersmexico/packersmexico.github.io/main/quiniela-control';
const norm=s=>String(s||'').trim().replace(/\s+/g,' ').toUpperCase();

async function readCanonical(file){
  const r=await fetch(`${RAW_BASE}/${file}?t=${Date.now()}`,{
    cache:'no-store',headers:{'User-Agent':'PMX-Quiniela-Capture-Status'}
  });
  if(!r.ok) throw new Error('CANONICAL_SOURCE_'+r.status);
  return r.json();
}

function hashEntries(reply){
  const out={};
  if(Array.isArray(reply)){
    for(let i=0;i<reply.length;i+=2) out[norm(reply[i])]=reply[i+1];
  }else if(reply&&typeof reply==='object'){
    for(const [k,v] of Object.entries(reply)) out[norm(k)]=v;
  }
  return out;
}

function safeRecord(value){
  try { const v=typeof value==='string'?JSON.parse(value):value; return v&&typeof v==='object'?v:{}; }
  catch { return {}; }
}

export default async function handler(req,res){
  applyCors(req,res);
  if(req.method==='OPTIONS')return res.status(204).end();
  if(req.method!=='GET')return rejectMethod(req,res,['GET']);
  res.setHeader('Cache-Control','no-store, max-age=0');

  const formID=String(req.query?.form_id||'').trim();
  const week=Number(req.query?.week);
  if(!/^\d{10,25}$/.test(formID)||!Number.isInteger(week)||week<1||week>25){
    return json(res,400,{ok:false,error:'INVALID_FORM_OR_WEEK'});
  }

  let snapshot=null;
  try{
    snapshot=await readCanonical(`weeks/week-${String(week).padStart(2,'0')}.json`);
  }catch{
    return json(res,503,{ok:false,error:'CANONICAL_SNAPSHOT_UNAVAILABLE'});
  }
  if(String(snapshot?.capture?.form_id)!==formID){
    return json(res,409,{ok:false,error:'FORM_SNAPSHOT_MISMATCH'});
  }

  const roster=(snapshot.participants||[]).map(p=>norm(p.name)).filter(Boolean);
  const rosterSet=new Set(roster);
  const staticNames=(snapshot.capture?.submission_integrity?.received_names||[]).map(norm).filter(n=>rosterSet.has(n));
  let firstValid={},receipts={},deliveries={};
  let redisStatus='OK';
  try{
    firstValid=hashEntries(await redis(['HGETALL',`pmx:quiniela:jotform:first-valid:${formID}`]));
    receipts=hashEntries(await redis(['HGETALL',`pmx:quiniela:jotform:receipts:${formID}`]));
    deliveries=hashEntries(await redis(['HGETALL',`pmx:quiniela:jotform:delivery:${formID}`]));
  }catch{
    redisStatus='UNAVAILABLE';
  }

  const liveNames=Object.keys(firstValid).filter(n=>rosterSet.has(n));
  const verified=[...new Set([...staticNames,...liveNames])].filter(n=>rosterSet.has(n));
  const pending=roster.filter(n=>!verified.includes(n));
  const verifiedRows=verified.map(name=>{
    const rec=safeRecord(firstValid[name]);
    return {name,verified_at:rec.received_at||null,source:rec.source||'PUBLIC_VERIFIED_SNAPSHOT'};
  });

  const receiptNames=Object.keys(receipts).filter(n=>rosterSet.has(n));
  const unreconciled=receiptNames.filter(n=>!liveNames.includes(n));
  const timestamps=verifiedRows.map(x=>x.verified_at).filter(Boolean).sort();
  const lastVerifiedAt=timestamps.at(-1)||null;

  let lastPush=null;
  for(const [name,value] of Object.entries(deliveries)){
    const rec=safeRecord(value);
    const item={
      participant:name,
      at:rec.at||null,
      rodrigo_status:(rec.deliveries||[]).find(x=>x.operator==='RODRIGO')?.status||'UNKNOWN'
    };
    if(!lastPush || String(item.at||'')>String(lastPush.at||'')) lastPush=item;
  }

  let backendStatus='STATIC_VERIFIED_ONLY';
  if(redisStatus!=='OK') backendStatus='REDIS_READ_UNAVAILABLE';
  else if(liveNames.length===verified.length && verified.length) backendStatus='LIVE_FIRST_VALID_VERIFIED';
  else if(liveNames.length) backendStatus='LIVE_PARTIAL_WITH_PUBLIC_BASELINE';
  else if(unreconciled.length) backendStatus='WEBHOOK_RECEIPTS_UNRECONCILED';

  return json(res,200,{
    ok:true,
    week,
    form_id:formID,
    verified_count:verified.length,
    total:roster.length,
    verified_participants:verifiedRows,
    pending_participants:pending,
    webhook_received_unreconciled:unreconciled,
    backend_status:backendStatus,
    checked_at:new Date().toISOString(),
    last_verified_at:lastVerifiedAt,
    last_push:lastPush,
    picks_visible:false
  });
}
