import crypto from 'node:crypto';
import {catchupWeek08} from '../scripts/catchup-week08.mjs';
import {json,rejectMethod} from '../lib/http.js';

function authorized(req){
  const secret=process.env.PMX_RECONCILE_SECRET||process.env.PMX_PUSH_SECRET||'';
  const incoming=Buffer.from(String(req.headers.authorization||''));
  const expected=Buffer.from('Bearer '+secret);
  return Boolean(secret&&incoming.length===expected.length&&crypto.timingSafeEqual(incoming,expected));
}

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store,max-age=0');
  if(req.method!=='POST')return rejectMethod(req,res,['POST']);
  if(!authorized(req))return json(res,401,{ok:false,error:'UNAUTHORIZED'});
  try {
    const result=await catchupWeek08();
    return json(res,200,result);
  }catch(e){
    const reason=String(e?.message||'RECONCILIATION_ERROR').replace(/[0-9]{10,}/g,'[REDACTED]');
    console.error('PMX_CAPTURE_RECONCILE_HOLD',reason);
    return json(res,503,{ok:false,error:'CAPTURE_RECONCILE_HOLD',reason});
  }
}
