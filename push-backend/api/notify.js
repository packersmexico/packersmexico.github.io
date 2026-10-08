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

  webpush.setVapidDetails(subject, publicKey, privateKey);
  const payload = JSON.stringify({
    title: String(title).slice(0, 100),
    body: String(body).slice(0, 240),
    url: String(url),
    tag: String(tag || eventKey).slice(0, 100),
    eventKey
  });
  const deliveries = [];
  for (const role of ['RODRIGO','IBRA']) {
    const subscriptionKey = keys.subscriptionFor(role);
    const raw = await redis(['GET', subscriptionKey]);
    if (!raw) { deliveries.push({operator:role,status:'NOT_SUBSCRIBED'}); continue; }
    const sentKey = keys.sentFor(role,eventKey);
    const previously = await redis(['GET',sentKey]);
    if (previously) { deliveries.push({operator:role,status:'ALREADY_SENT',sentAt:previously}); continue; }
    try {
      await webpush.sendNotification(JSON.parse(raw).subscription,payload,{TTL:86400,urgency:'normal'});
      const sentAt = new Date().toISOString();
      await redis(['SET',sentKey,sentAt]);
      deliveries.push({operator:role,status:'SENT',sentAt});
    } catch (error) {
      if (error?.statusCode===404 || error?.statusCode===410) {
        await redis(['DEL',subscriptionKey]);
        deliveries.push({operator:role,status:'SUBSCRIPTION_EXPIRED'});
      } else {
        console.error('PUSH_DELIVERY_FAILED',role,error?.statusCode);
        deliveries.push({operator:role,status:'DELIVERY_FAILED'});
      }
    }
  }
  const successes = deliveries.filter(x=>['SENT','ALREADY_SENT'].includes(x.status));
  const errors = deliveries.filter(x=>['DELIVERY_FAILED','SUBSCRIPTION_EXPIRED'].includes(x.status));
  const status = successes.length ? (errors.length ? 207 : 200) : (errors.length ? 502 : 404);
  return json(res,status,{ok:successes.length>0,eventKey,deliveries});

}
