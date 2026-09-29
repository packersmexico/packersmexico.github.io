import webpush from 'web-push';
import { redis, keys } from '../lib/redis.js';
import { applyCors, json, rejectMethod } from '../lib/http.js';

function authorized(req) {
  const expected = process.env.PMX_PUSH_SECRET || '';
  const auth = String(req.headers.authorization || '');
  return Boolean(expected && auth === `Bearer ${expected}`);
}

function cleanEventKey(value) {
  const key = String(value || '').toUpperCase().replace(/[^A-Z0-9:_-]/g, '').slice(0, 120);
  return key || null;
}

export default async function handler(req, res) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return rejectMethod(req, res, ['POST']);
  if (!authorized(req)) return json(res, 401, { ok: false, error: 'UNAUTHORIZED' });

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:packersmexico@example.invalid';
  if (!publicKey || !privateKey) {
    return json(res, 503, { ok: false, error: 'VAPID_NOT_CONFIGURED' });
  }

  const { eventKey: rawEventKey, title, body, url, tag } = req.body || {};
  const eventKey = cleanEventKey(rawEventKey);
  if (!eventKey || !title || !body || !url) {
    return json(res, 400, { ok: false, error: 'INVALID_NOTIFICATION_PAYLOAD' });
  }

  const sentKey = keys.sent(eventKey);
  const alreadySent = await redis(['GET', sentKey]);
  if (alreadySent) {
    return json(res, 200, { ok: true, duplicate: true, eventKey });
  }

  const rawRecord = await redis(['GET', keys.rodrigoSubscription]);
  if (!rawRecord) {
    return json(res, 404, { ok: false, error: 'RODRIGO_NOT_SUBSCRIBED' });
  }

  const record = JSON.parse(rawRecord);
  webpush.setVapidDetails(subject, publicKey, privateKey);

  const payload = JSON.stringify({
    title: String(title).slice(0, 100),
    body: String(body).slice(0, 240),
    url: String(url),
    tag: String(tag || eventKey).slice(0, 100),
    eventKey
  });

  try {
    await webpush.sendNotification(record.subscription, payload, {
      TTL: 86400,
      urgency: 'normal'
    });
  } catch (error) {
    if (error?.statusCode === 404 || error?.statusCode === 410) {
      await redis(['DEL', keys.rodrigoSubscription]);
      return json(res, 410, { ok: false, error: 'SUBSCRIPTION_EXPIRED' });
    }
    console.error(error);
    return json(res, 502, { ok: false, error: 'PUSH_DELIVERY_FAILED' });
  }

  const sentAt = new Date().toISOString();
  await redis(['SET', sentKey, sentAt]);
  return json(res, 200, { ok: true, duplicate: false, eventKey, sentAt });
}
