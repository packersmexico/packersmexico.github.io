import crypto from 'node:crypto';
import { redis, keys } from '../lib/redis.js';
import { applyCors, isAllowedOrigin, rejectMethod } from '../lib/http.js';

function safeEqual(a, b) {
  const aa = Buffer.from(String(a || ''));
  const bb = Buffer.from(String(b || ''));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

function html(res, status, payload) {
  const safe = JSON.stringify(payload).replace(/</g, '\\u003c');
  res.status(status);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.send(`<!doctype html><meta charset="utf-8"><script>
    try { parent.postMessage({source:'PMX_PUSH_SUBSCRIBE',payload:${safe}}, '*'); } catch (_) {}
  <\/script>`);
}

export default async function handler(req, res) {
  applyCors(req, res);
  if (req.method !== 'POST') return rejectMethod(req, res, ['POST']);
  if (!isAllowedOrigin(req)) return html(res, 403, { ok:false, error:'ORIGIN_NOT_ALLOWED' });

  const expectedCode = process.env.RODRIGO_PUSH_CODE;
  if (!expectedCode) return html(res, 503, { ok:false, error:'PUSH_REGISTRATION_NOT_CONFIGURED' });

  const body = req.body || {};
  const registrationCode = body.registrationCode;
  if (!safeEqual(registrationCode, expectedCode)) {
    return html(res, 403, { ok:false, error:'INVALID_REGISTRATION_CODE' });
  }

  const endpoint = String(body.endpoint || '');
  const p256dh = String(body.p256dh || '');
  const auth = String(body.auth || '');
  if (!endpoint.startsWith('https://') || !p256dh || !auth) {
    return html(res, 400, { ok:false, error:'INVALID_SUBSCRIPTION' });
  }

  const subscription = {
    endpoint,
    expirationTime: body.expirationTime ? Number(body.expirationTime) || null : null,
    keys: { p256dh, auth }
  };

  const record = {
    operator: 'RODRIGO',
    deviceLabel: String(body.deviceLabel || 'Rodrigo').slice(0, 80),
    subscription,
    registeredAt: new Date().toISOString()
  };

  await redis(['SET', keys.rodrigoSubscription, JSON.stringify(record)]);
  return html(res, 200, { ok:true, operator:'RODRIGO', registeredAt:record.registeredAt });
}
