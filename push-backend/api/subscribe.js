import crypto from 'node:crypto';
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

  const expectedCode = process.env.RODRIGO_PUSH_CODE;
  if (!expectedCode) return json(res, 503, { ok: false, error: 'PUSH_REGISTRATION_NOT_CONFIGURED' });

  const { registrationCode, subscription, deviceLabel = 'Rodrigo' } = req.body || {};
  if (!safeEqual(registrationCode, expectedCode)) {
    return json(res, 403, { ok: false, error: 'INVALID_REGISTRATION_CODE' });
  }
  if (!validSubscription(subscription)) {
    return json(res, 400, { ok: false, error: 'INVALID_SUBSCRIPTION' });
  }

  const record = {
    operator: 'RODRIGO',
    deviceLabel: String(deviceLabel).slice(0, 80),
    subscription,
    registeredAt: new Date().toISOString()
  };

  await redis(['SET', keys.rodrigoSubscription, JSON.stringify(record)]);
  return json(res, 200, { ok: true, operator: 'RODRIGO', registeredAt: record.registeredAt });
}
