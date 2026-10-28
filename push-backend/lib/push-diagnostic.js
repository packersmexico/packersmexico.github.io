// Reuse /api/subscribe to stay within Vercel Hobby's 12-function limit.
// A device can inspect/test only its own exact registered PushSubscription.
import crypto from 'node:crypto';
import webpush from 'web-push';
import { redis, keys } from './redis.js';
import { json } from './http.js';

const PREFIX='pmx:quiniela:push:diagnostic:';
const BASE='https://packersmexicogithubio-push-backend.vercel.app';
const eq=(a,b)=>{
  const x=Buffer.from(String(a||'')),y=Buffer.from(String(b||''));
  return x.length>0&&x.length===y.length&&crypto.timingSafeEqual(x,y);
};
const same=(a,b)=>Boolean(a&&b&&eq(a.endpoint,b.endpoint)
  &&eq(a.keys?.p256dh,b.keys?.p256dh)&&eq(a.keys?.auth,b.keys?.auth));

export async function diagnoseDevice(req,res,body) {
  const role=String(body?.operator||'').toUpperCase();
  if(!['IBRA','RODRIGO'].includes(role))return json(res,400,{ok:false,error:'INVALID_OPERATOR'});
  const raw=await redis(['GET',keys.subscriptionFor(role)]);
  if(!raw)return json(res,409,{ok:false,registered:false,error:'NO_ACTIVE_DEVICE_IN_BACKEND'});
  let record;
  try{record=JSON.parse(raw);}catch{return json(res,500,{ok:false,error:'REGISTRY_RECORD_INVALID'});}
  if(!same(body.subscription,record.subscription))
    return json(res,409,{ok:false,registered:false,error:'THIS_DEVICE_IS_NOT_CURRENT_SUBSCRIBER'});
  const last=await redis(['GET',PREFIX+'last:'+role]);
  let lastTest=null;
  if(last){
    try{const v=JSON.parse(last),ack=await redis(['GET',PREFIX+'ack:'+v.id]);
      lastTest={queuedAt:v.queuedAt,serviceWorkerShowCalled:!!ack,acknowledgedAt:ack||null};}catch{}
  }
  const latest=await redis(['GET',PREFIX+'milestone-last:'+role]);
  let lastMilestone=null;
  if(latest){
    try{const v=JSON.parse(latest),ack=await redis(['GET',PREFIX+'ack:'+v.id]);
      lastMilestone={eventKey:v.eventKey,queuedAt:v.queuedAt,
        serviceWorkerShowCalled:!!ack,acknowledgedAt:ack||null};}catch{}
  }
  if(body.action==='diagnostic_status')return json(res,200,{ok:true,operator:role,
    registered:true,registeredAt:record.registeredAt||null,
    lastTest,lastMilestone,
    deliveryProof:'SERVICE_WORKER_SHOW_NOTIFICATION_PROMISE_NOT_OS_DISPLAY'});
  const pub=process.env.VAPID_PUBLIC_KEY,priv=process.env.VAPID_PRIVATE_KEY,
    subject=process.env.VAPID_SUBJECT;
  if(!pub||!priv||!subject)return json(res,503,{ok:false,error:'VAPID_NOT_CONFIGURED'});
  const throttle=await redis(['SET',PREFIX+'throttle:'+role,new Date().toISOString(),'EX',45,'NX']);
  if(throttle!=='OK')return json(res,429,{ok:false,error:'TEST_RATE_LIMIT_45_SECONDS'});
  const id=crypto.randomBytes(24).toString('hex'),queuedAt=new Date().toISOString();
  await redis(['SET',PREFIX+'pending:'+id,role,'EX',600]);
  const payload={title:'PACKERS MÉXICO · PRUEBA PUSH',
    body:'Si ves este aviso, tu dispositivo recibió una notificación de prueba.',
    url:'https://packersmexico.github.io/quiniela-control/',
    tag:'pmx-push-test-'+role.toLowerCase(),eventKey:'PMX_PUSH_TEST_'+id.slice(0,12),
    ackId:id,ackUrl:BASE+'/api/subscribe'};
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

export async function ackDevice(req,res,body) {
  const id=String(body?.ackId||'');
  if(!/^[a-f0-9]{48}$/.test(id))return json(res,400,{ok:false,error:'INVALID_ACK'});
  const role=await redis(['GET',PREFIX+'pending:'+id]);
  if(role!=='IBRA'&&role!=='RODRIGO')
    return json(res,404,{ok:false,error:'ACK_NOT_PENDING'});
  const stamp=new Date().toISOString();
  await redis(['SET',PREFIX+'ack:'+id,stamp,'EX',86400]);
  await redis(['DEL',PREFIX+'pending:'+id]);
  return json(res,200,{ok:true,acknowledgedAt:stamp,
    proof:'SERVICE_WORKER_SHOW_NOTIFICATION_PROMISE_RESOLVED'});
}
