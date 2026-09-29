import { applyCors, json, rejectMethod } from '../lib/http.js';

export default async function handler(req, res) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return rejectMethod(req, res, ['GET']);

  return json(res, 200, {
    ok: true,
    service: 'PMX_QUINIELA_PUSH',
    vapid: Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
    registry: Boolean(
      (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL) &&
      (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN)
    ),
    registration: Boolean(process.env.RODRIGO_PUSH_CODE),
    senderAuth: Boolean(process.env.PMX_PUSH_SECRET)
  });
}
