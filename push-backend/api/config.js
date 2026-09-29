import { applyCors, json, rejectMethod } from '../lib/http.js';

export default async function handler(req, res) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return rejectMethod(req, res, ['GET']);

  const publicKey = process.env.VAPID_PUBLIC_KEY || '';
  const registryReady = Boolean(
    (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL) &&
    (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN)
  );

  return json(res, 200, {
    ok: true,
    enabled: Boolean(publicKey && registryReady && process.env.RODRIGO_PUSH_CODE),
    vapidPublicKey: publicKey,
    operator: 'RODRIGO'
  });
}
