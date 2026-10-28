// Non-secret, high-entropy one-time delivery receipt from our GitHub Pages service worker.
import { redis } from '../lib/redis.js';
import { applyCors, isAllowedOrigin, json, rejectMethod } from '../lib/http.js';
const PREFIX='pmx:quiniela:push:diagnostic:';
export default async function handler(req,res){
  applyCors(req,res);
  res.setHeader('Cache-Control','no-store');
  if(req.method==='OPTIONS')return res.status(204).end();
  if(req.method!=='POST')return rejectMethod(req,res,['POST']);
  if(!isAllowedOrigin(req))return json(res,403,{ok:false,error:'ORIGIN_NOT_ALLOWED'});
  let body=req.body||{};
  if(typeof body==='string'){try{body=JSON.parse(body);}catch{return json(res,400,{ok:false,error:'INVALID_JSON'});}}
  const id=String(body.ackId||'');
  if(!/^[a-f0-9]{48}$/.test(id))return json(res,400,{ok:false,error:'INVALID_ACK'});
  const pending=await redis(['GET',PREFIX+'pending:'+id]);
  if(pending!=='IBRA'&&pending!=='RODRIGO')
    return json(res,404,{ok:false,error:'ACK_NOT_PENDING'});
  const stamp=new Date().toISOString();
  await redis(['SET',PREFIX+'ack:'+id,stamp,'EX',86400]);
  await redis(['DEL',PREFIX+'pending:'+id]);
  return json(res,200,{ok:true,acknowledgedAt:stamp,
    proof:'SERVICE_WORKER_SHOW_NOTIFICATION_PROMISE_RESOLVED'});
}
