import webpush from 'web-push';
import { redis, keys } from '../lib/redis.js';
import { applyCors, json, rejectMethod } from '../lib/http.js';

const EVENT_KEY = 'PMX_PUSH_TEST_20261001_2227_CDMX';

export default async function handler(req, res) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return rejectMethod(req, res, ['GET']);

  const sentKey = keys.sent(EVENT_KEY);
  const alreadySent = await redis(['GET', sentKey]);
  if (alreadySent) return json(res, 200, { ok: true, duplicate: true, eventKey: EVENT_KEY, sentAt: alreadySent });

  const rawRecord = await redis(['GET', keys.rodrigoSubscription]);
  if (!rawRecord) return json(res, 404, { ok: false, error: 'RODRIGO_NOT_SUBSCRIBED' });

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    return json(res, 503, { ok: false, error: 'VAPID_NOT_CONFIGURED' });
  }

  const record = JSON.parse(rawRecord);
  webpush.setVapidDetails(subject, publicKey, privateKey);

  const payload = JSON.stringify({
    title: 'PACKERS MÉXICO · PRUEBA DE AVISOS',
    body: 'Notificaciones de la Quiniela activas correctamente en este dispositivo.',
    url: 'https://packersmexico.github.io/quiniela-control/',
    tag: 'pmx-push-test',
    eventKey: EVENT_KEY
  });

  try {
    await webpush.sendNotification(record.subscription, payload, { TTL: 300, urgency: 'high' });
  } catch (error) {
    if (error?.statusCode === 404 || error?.statusCode === 410) {
      await redis(['DEL', keys.rodrigoSubscription]);
      return json(res, 410, { ok: false, error: 'SUBSCRIPTION_EXPIRED' });
    }
    return json(res, 502, {
      ok: false,
      error: 'PUSH_DELIVERY_FAILED',
      upstreamStatus: Number(error?.statusCode || 0) || null,
      upstreamBody: String(error?.body || error?.message || '').slice(0, 300)
    });
  }

  const sentAt = new Date().toISOString();
  await redis(['SET', sentKey, sentAt]);
  return json(res, 200, { ok: true, duplicate: false, eventKey: EVENT_KEY, sentAt });
}
