// Read-only, public operator receipt status; never exposes picks, submission IDs or secrets.
import { redis } from '../lib/redis.js';
import { applyCors, json, rejectMethod } from '../lib/http.js';

const SOURCE='https://raw.githubusercontent.com/packersmexico/packersmexico.github.io/main/quiniela-control/capture-config.json';
const canon=(s)=>String(s||'').trim().replace(/\s+/g,' ').toUpperCase();
const key=(formID)=>'pmx:quiniela:jotform:receipts:'+formID;

export default async function handler(req,res){
  applyCors(req,res);
  if(req.method==='OPTIONS')return res.status(204).end();
  if(req.method!=='GET')return rejectMethod(req,res,['GET']);
  res.setHeader('Cache-Control','no-store, max-age=0');
  let cfg;
  try{
    const r=await fetch(SOURCE+'?t='+Date.now(),{cache:'no-store'});
    if(!r.ok)throw Error('SOURCE_HTTP_'+r.status);
    cfg=await r.json();
  }catch(err){return json(res,503,{ok:false,error:'CAPTURE_CONFIG_UNAVAILABLE'});}
  const formID=String(cfg.form_id||'');
  if(!/^\\d{10,25}$/.test(formID))return json(res,503,{ok:false,error:'INVALID_ACTIVE_FORM'});
  const fromSnapshot=(cfg.submission_integrity?.received_names||[]).map(canon).filter(Boolean);
  const known=new Set([...fromSnapshot,...(cfg.missing_participants||[]).map(canon)]);
  let webhookNames=[],backendStatus='NOT_VERIFIED';
  try{
    const rows=await redis(['HGETALL',key(formID)]);
    if(Array.isArray(rows)){
      for(let i=0;i<rows.length;i+=2){
        const who=canon(rows[i]);
        if(known.has(who))webhookNames.push(who);
      }
    }else if(rows && typeof rows==='object'){
      for(const who of Object.keys(rows)){const n=canon(who);if(known.has(n))webhookNames.push(n);}
    }
    webhookNames=[...new Set(webhookNames)];
    backendStatus=webhookNames.length?'WEBHOOK_RECEIPTS_PRESENT':'WAITING_FOR_VERIFIED_WEBHOOK';
  }catch(err){backendStatus='WEBHOOK_READ_UNAVAILABLE';}
  const snapshot=new Set(fromSnapshot);
  const pending=webhookNames.filter(n=>!snapshot.has(n));
  return json(res,200,{
    ok:true,week:Number(cfg.week_number),form_id:formID,
    verified_complete_names:[...snapshot],
    webhook_received_unreconciled:pending,
    verified_complete:snapshot.size,
    total:Number(cfg.total||9),
    as_of:cfg.submission_integrity?.verified_on||null,
    source:'GITHUB_JOTFORM_VERIFIED_SNAPSHOT_PLUS_REDIS_WEBHOOK_RECEIPTS',
    backend_status:backendStatus,
    picks_visible:false,
    notice:'Recarga el último corte; un webhook nuevo no significa picks validados ni bloqueados.'
  });
}
