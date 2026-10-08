import crypto from 'node:crypto';
import { applyCors, json, rejectMethod } from '../lib/http.js';

function b64url(buffer) {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function vapidKeyPairMatch() {
  try {
    const publicKey = String(process.env.VAPID_PUBLIC_KEY || '');
    const privateKey = String(process.env.VAPID_PRIVATE_KEY || '');
    if (!publicKey || !privateKey) return false;
    const ecdh = crypto.createECDH('prime256v1');
    ecdh.setPrivateKey(Buffer.from(privateKey.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4-privateKey.length%4)%4), 'base64'));
    return b64url(ecdh.getPublicKey()) === publicKey;
  } catch {
    return false;
  }
}

function validSubject() {
  try {
    const subject = String(process.env.VAPID_SUBJECT || '');
    const u = new URL(subject);
    return ['https:', 'mailto:'].includes(u.protocol) && u.hostname && u.hostname !== 'localhost';
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return rejectMethod(req, res, ['GET']);

  return json(res, 200, {
    ok: true,
    service: 'PMX_QUINIELA_PUSH',
    vapid: Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
    vapidKeyPairMatch: vapidKeyPairMatch(),
    vapidSubjectValid: validSubject(),
    registry: Boolean(
      (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL) &&
      (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN)
    ),
    registration: Boolean(process.env.RODRIGO_PUSH_CODE),
    adminRegistration: { rodrigo:Boolean(process.env.RODRIGO_PUSH_CODE), ibra:Boolean(process.env.IBRA_PUSH_CODE) },
    senderAuth: Boolean(process.env.PMX_PUSH_SECRET)
  });
}
