// Diagnose whether THIS browser owns the active operator subscription.
// The registration code stays in the request and is never persisted client-side.
// Web Push 201/202 only means accepted by push gateway, not displayed on Android.
import crypto from 'node:crypto';
import webpush from 'web-push';
import { redis, keys } from '../lib/redis.js';
import { applyCors, isAllowedOrigin, json, rejectMethod } from '../lib/http.js';

function equal(a,b) {
  const x=Buffer.from(String(a||'')), y=Buffer.from(String(b||''));
  return x.length>0 && x.length===y.length && crypto.timingSafeEqual(x,y);
}
export default async function handler(req,res){
  applyCors(req,res);
  if(req.method==='OPTIONS')return res.status(204).end();
  if(req.method==='GET')return json(res,200,{ok:true,service:'PMX_PUSH_DEVICE_DIAGNOSTIC',method:'POST_FROM_PANEL'});
  if(req.method!=='POST')return rejectMethod(req,res,['GET','POST']);
  if(!isAllowedOrigin(req))return json(res,403,{ok:false,error:'ORIGIN_NOT_ALLOWED'});
  let body=req.body||{};
  if(typeof body==='string'){try{body=JSON.parse(body)}catch{return json(res,400,{ok:false,error:'INVALID_BODY'})}}
  const role=String(body.operator||'').trim().toUpperCase();
  if(!['RODRIGO','IBRA'].includes(role))return json(res,400,{ok:false,error:'INVALID_ROLE'});
  const expected=role==='IBRA'?process.env.IBRA_PUSH_CODE:process.env.RODRIGO_PUSH_CODE;
  if(!expected||!equal(body.registrationCode,expected))return json(res,403,{ok:false,error:'INVALID_REGISTRATION_CODE'});
  const endpoint=String(body.endpoint||'');
  if(!endpoint.startsWith('https://'))return json(res,400,{ok:false,error:'DEVICE_SUBSCRIPTION_REQUIRED'});
  const raw=await redis(['GET',keys.subscriptionFor(role)]);
  if(!raw)return json(res,409,{ok:false,error:'NOT_REGISTERED_RENEW'});
  let record;
  try{record=JSON.parse(raw)}catch{return json(res,503,{ok:false,error:'INVALID_SAVED_SUBSCRIPTION'})}
  if(!equal(endpoint,record.subscription?.endpoint))
    return json(res,409,{ok:false,error:'DIFFERENT_DEVICE_REGISTERED_RENEW'});
  if(body.mode==='check')
    return json(res,200,{ok:true,operator:role,deviceMatches:true,registeredAt:record.registeredAt,deviceLabel:record.deviceLabel||null});
  if(body.mode!=='test')return json(res,400,{ok:false,error:'INVALID_MODE'});
  const vapid={publicKey:process.env.VAPID_PUBLIC_KEY,privateKey:process.env.VAPID_PRIVATE_KEY,subject:process.env.VAPID_SUBJECT};
  if(!vapid.publicKey||!vapid.privateKey||!vapid.subject)return json(res,503,{ok:false,error:'PUSH_SERVICE_NOT_CONFIGURED'});
  const rateKey='pmx:quiniela:push:diagnostic:cooldown:'+role;
  const permit=await redis(['SET',rateKey,'1','EX','60','NX']);
  if(permit!=='OK')return json(res,429,{ok:false,error:'TEST_COOLDOWN_60_SECONDS'});
  const eventKey='DEVICE_TEST_'+role+'_'+Date.now();
  const payload=JSON.stringify({
    title:'PACKERS MÉXICO · PRUEBA PUSH',
    body:'Si puedes leer esta notificación en tu teléfono, la recepción Web Push funciona.',
    url:'https://packersmexico.github.io/quiniela-control/',
    tag:'pmx-diagnostic-'+Date.now(),
    eventKey
  });
  try{
    webpush.setVapidDetails(vapid.subject,vapid.publicKey,vapid.privateKey);
    await webpush.sendNotification(record.subscription,payload,{TTL:120,urgency:'high'});
    return json(res,200,{ok:true,operator:role,eventKey,status:'PUSH_GATEWAY_ACCEPTED_CHECK_PHONE',
      limitation:'PROVIDER_ACCEPTANCE_DOES_NOT_PROVE_ANDROID_DISPLAY'});
  }catch(err){
    if(err?.statusCode===404||err?.statusCode===410){
      await redis(['DEL',keys.subscriptionFor(role)]);
      return json(res,410,{ok:false,error:'SUBSCRIPTION_EXPIRED_RENEW'});
    }
    return json(res,502,{ok:false,error:'PUSH_GATEWAY_REJECTED',
      upstreamStatus:Number(err?.statusCode||0)||null});
  }
}
