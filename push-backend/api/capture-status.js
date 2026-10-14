// Public read-only Jotform webhook receipt monitor for operator panel.
// Uses the already configured private Redis, never exposes picks or submission IDs.
import { redis } from '../lib/redis.js';
import { applyCors, json, rejectMethod } from '../lib/http.js';

const norm=s=>String(s||'').trim().replace(/\s+/g,' ').toUpperCase();

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
  let webhookNames=[],status='WAITING_FOR_VERIFIED_WEBHOOK';
  try{
    const reply=await redis(['HGETALL','pmx:quiniela:jotform:receipts:'+formID]);
    if(Array.isArray(reply)){
      for(let i=0;i<reply.length;i+=2){const n=norm(reply[i]);if(n)webhookNames.push(n);}
    }else if(reply&&typeof reply==='object'){
      webhookNames=Object.keys(reply).map(norm).filter(Boolean);
    }
    webhookNames=[...new Set(webhookNames)];
    if(webhookNames.length)status='WEBHOOK_RECEIPTS_PRESENT';
  }catch(err){status='WEBHOOK_READ_UNAVAILABLE';}
  return json(res,200,{
    ok:true,week,form_id:formID,
    webhook_received_unreconciled:webhookNames,
    backend_status:status,
    picks_visible:false,
    notice:'These are webhook receipts, not verified immutable picks. The GitHub snapshot controls validated totals.'
  });
}
