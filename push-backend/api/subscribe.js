import crypto from 'node:crypto';
import webpush from 'web-push';
import { redis, keys } from '../lib/redis.js';
import { applyCors, isAllowedOrigin, json, rejectMethod } from '../lib/http.js';

function safeEqual(a, b) {
  const aa = Buffer.from(String(a || ''));
  const bb = Buffer.from(String(b || ''));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

function validSubscription(value) {
  return Boolean(
    value &&
    typeof value.endpoint === 'string' &&
    value.endpoint.startsWith('https://') &&
    value.keys &&
    typeof value.keys.p256dh === 'string' &&
    typeof value.keys.auth === 'string'
  );
}

export default async function handler(req, res) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return rejectMethod(req, res, ['POST']);
  if (!isAllowedOrigin(req)) return json(res, 403, { ok: false, error: 'ORIGIN_NOT_ALLOWED' });

  let body = req.body || {};
  if (typeof body === 'string') {
    try { body = JSON.parse(body); }
    catch { return json(res, 400, { ok: false, error: 'INVALID_JSON_BODY' }); }
  }

  const { registrationCode, subscription, deviceLabel = 'Dispositivo', operator = 'RODRIGO' } = body;
  const role = String(operator).trim().toUpperCase();
  if (!['RODRIGO','IBRA'].includes(role)) return json(res, 400, { ok:false, error:'INVALID_OPERATOR' });
  const expectedCode = role === 'IBRA' ? process.env.IBRA_PUSH_CODE : process.env.RODRIGO_PUSH_CODE;
  if (!expectedCode) return json(res, 503, { ok:false, error:'OPERATOR_REGISTRATION_NOT_CONFIGURED' });
  if (!safeEqual(registrationCode, expectedCode)) {
    return json(res, 403, { ok: false, error: 'INVALID_REGISTRATION_CODE' });
  }
  // Device-only diagnostic reuses this existing Serverless Function.
  // Do not introduce a 13th route: Hobby budget limit is 12 functions.
  if(body.mode==='test'){
    const deviceEndpoint=String(body.endpoint||'');
    if(!deviceEndpoint.startsWith('https://'))return json(res,400,{ok:false,error:'DEVICE_SUBSCRIPTION_REQUIRED'});
    const raw=await redis(['GET',keys.subscriptionFor(role)]);
    if(!raw)return json(res,409,{ok:false,error:'NOT_REGISTERED_RENEW'});
    let stored;
    try{stored=JSON.parse(raw)}catch{return json(res,503,{ok:false,error:'INVALID_SAVED_SUBSCRIPTION'})}
    if(!safeEqual(deviceEndpoint,stored.subscription?.endpoint))
      return json(res,409,{ok:false,error:'DIFFERENT_DEVICE_REGISTERED_RENEW'});
    const pub=process.env.VAPID_PUBLIC_KEY, priv=process.env.VAPID_PRIVATE_KEY, subject=process.env.VAPID_SUBJECT;
    if(!pub||!priv||!subject)return json(res,503,{ok:false,error:'PUSH_SERVICE_NOT_CONFIGURED'});
    const limit=await redis(['SET','pmx:quiniela:push:diagnostic:cooldown:'+role,'1','EX','60','NX']);
    if(limit!=='OK')return json(res,429,{ok:false,error:'TEST_COOLDOWN_60_SECONDS'});
    const eventKey='DEVICE_TEST_'+role+'_'+Date.now();
    const payload=JSON.stringify({
      title:'PACKERS MÉXICO · PRUEBA PUSH',
      body:'Si puedes leer esta notificación, las notificaciones Web Push funcionan en este dispositivo.',
      url:'https://packersmexico.github.io/quiniela-control/',
      tag:'pmx-device-test-'+Date.now(),eventKey
    });
    try{
      webpush.setVapidDetails(subject,pub,priv);
      await webpush.sendNotification(stored.subscription,payload,{TTL:120,urgency:'high'});
      return json(res,200,{ok:true,operator:role,eventKey,status:'PUSH_GATEWAY_ACCEPTED_CHECK_PHONE',
        limitation:'PROVIDER_ACCEPTANCE_DOES_NOT_PROVE_ANDROID_DISPLAY'});
    }catch(e){
      if(e?.statusCode===404||e?.statusCode===410){
        await redis(['DEL',keys.subscriptionFor(role)]);
        return json(res,410,{ok:false,error:'SUBSCRIPTION_EXPIRED_RENEW'});
      }
      return json(res,502,{ok:false,error:'PUSH_GATEWAY_REJECTED',
        upstreamStatus:Number(e?.statusCode||0)||null});
    }
  }
  if (!validSubscription(subscription)) {
    return json(res, 400, { ok: false, error: 'INVALID_SUBSCRIPTION' });
  }

  const record = {
    operator: role,
    deviceLabel: String(deviceLabel).slice(0, 80),
    subscription,
    registeredAt: new Date().toISOString()
  };

  await redis(['SET', keys.subscriptionFor(role), JSON.stringify(record)]);
  return json(res, 200, { ok: true, operator: role, registeredAt: record.registeredAt });
}
