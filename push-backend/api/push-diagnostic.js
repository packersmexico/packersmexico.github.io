// Device-bound, rate-limited Web Push diagnostic. No registration code or endpoint is exposed.
import crypto from 'node:crypto';
import webpush from 'web-push';
import { redis, keys } from '../lib/redis.js';
import { applyCors, isAllowedOrigin, json, rejectMethod } from '../lib/http.js';

const PREFIX='pmx:quiniela:push:diagnostic:';
const BASE='https://packersmexicogithubio-push-backend.vercel.app';
function equal(a,b){
  const x=Buffer.from(String(a||''));const y=Buffer.from(String(b||''));
  return x.length>0&&x.length===y.length&&crypto.timingSafeEqual(x,y);
}
function parseBody(raw){
  if(typeof raw==='string'){try{return JSON.parse(raw);}catch{return null;}}
  return raw&&typeof raw==='object'?raw:null;
}
function sameDevice(a,b){
  return Boolean(a&&b&&equal(a.endpoint,b.endpoint)
    &&equal(a.keys?.p256dh,b.keys?.p256dh)&&equal(a.keys?.auth,b.keys?.auth));
}
export default async function handler(req,res){
  applyCors(req,res);
  res.setHeader('Cache-Control','no-store');
  if(req.method==='OPTIONS')return res.status(204).end();
  if(req.method!=='POST')return rejectMethod(req,res,['POST']);
  if(!isAllowedOrigin(req))return json(res,403,{ok:false,error:'ORIGIN_NOT_ALLOWED'});
  const body=parseBody(req.body);
  const role=String(body?.operator||'').toUpperCase();
  const action=String(body?.action||'status');
  if(!['IBRA','RODRIGO'].includes(role)||!['status','test'].includes(action))
    return json(res,400,{ok:false,error:'INVALID_DIAGNOSTIC_REQUEST'});
  const raw=await redis(['GET',keys.subscriptionFor(role)]);
  if(!raw)return json(res,409,{ok:false,registered:false,error:'NO_ACTIVE_DEVICE_IN_BACKEND'});
  let record;
  try{record=JSON.parse(raw);}catch{return json(res,500,{ok:false,error:'REGISTRY_RECORD_INVALID'});}
  if(!sameDevice(body.subscription,record.subscription))
    return json(res,409,{ok:false,registered:false,error:'THIS_DEVICE_IS_NOT_CURRENT_SUBSCRIBER'});
  const last=await redis(['GET',PREFIX+'last:'+role]);
  let lastStatus=null;
  if(last){
    try{const v=JSON.parse(last);const ack=await redis(['GET',PREFIX+'ack:'+v.id]);
      lastStatus={queuedAt:v.queuedAt,serviceWorkerShowCalled:!!ack,
        acknowledgedAt:ack||null};}catch{}
  }
  if(action==='status')return json(res,200,{ok:true,operator:role,
    registered:true,registeredAt:record.registeredAt||null,lastTest:lastStatus,
    deliveryProof:'SERVICE_WORKER_SHOW_NOTIFICATION_PROMISE_NOT_OS_DISPLAY'});
  const pub=process.env.VAPID_PUBLIC_KEY,priv=process.env.VAPID_PRIVATE_KEY,subject=process.env.VAPID_SUBJECT;
  if(!pub||!priv||!subject)return json(res,503,{ok:false,error:'VAPID_NOT_CONFIGURED'});
  const throttle=await redis(['SET',PREFIX+'throttle:'+role,new Date().toISOString(),'EX',45,'NX']);
  if(throttle!=='OK')return json(res,429,{ok:false,error:'TEST_RATE_LIMIT_45_SECONDS'});
  const id=crypto.randomBytes(24).toString('hex'),queuedAt=new Date().toISOString();
  const ackKey=PREFIX+'pending:'+id;
  await redis(['SET',ackKey,role,'EX',600]);
  const payload={title:'PACKERS MÉXICO · PRUEBA PUSH',
    body:'Si ves este aviso, tu dispositivo recibió una notificación de prueba.',
    url:'https://packersmexico.github.io/quiniela-control/',
    tag:'pmx-push-test-'+role.toLowerCase(),eventKey:'PMX_PUSH_TEST_'+id.slice(0,12),
    ackId:id,ackUrl:BASE+'/api/push-ack'};
  webpush.setVapidDetails(subject,pub,priv);
  try{
    await webpush.sendNotification(record.subscription,JSON.stringify(payload),{TTL:300,urgency:'high'});
  }catch(error){
    if(error?.statusCode===404||error?.statusCode===410){
      await redis(['DEL',keys.subscriptionFor(role)]);
      return json(res,410,{ok:false,registered:false,error:'PUSH_SUBSCRIPTION_EXPIRED_RENEW_REQUIRED'});
    }
    console.error('PMX_PUSH_DIAGNOSTIC_SEND_FAIL',role,Number(error?.statusCode||0));
    return json(res,502,{ok:false,error:'PUSH_GATEWAY_REJECTED'});
  }
  await redis(['SET',PREFIX+'last:'+role,JSON.stringify({id,queuedAt}),'EX',86400]);
  return json(res,200,{ok:true,operator:role,registered:true,
    status:'ACCEPTED_BY_PUSH_SERVICE',queuedAt,serviceWorkerShowCalled:false,
    deliveryProof:'NOT_YET_ACKNOWLEDGED'});
}
