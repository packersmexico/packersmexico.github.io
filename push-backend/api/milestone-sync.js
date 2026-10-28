import crypto from 'node:crypto';
import webpush from 'web-push';
import { redis, keys } from '../lib/redis.js';
import { milestoneEvents } from '../lib/milestone-events.js';
import { applyCors, json, rejectMethod } from '../lib/http.js';

const RAW_BASE = 'https://raw.githubusercontent.com/packersmexico/packersmexico.github.io/main/quiniela-control';

async function getJson(url) {
  const response = await fetch(url, { cache: 'no-store', headers: { 'User-Agent': 'PMX-Quiniela-Milestone-Sync' } });
  if (!response.ok) throw new Error(`UPSTREAM_JSON_${response.status}`);
  return response.json();
}

async function assetExists(path) {
  try {
    const response = await fetch(`${RAW_BASE}/${path}`, { method: 'HEAD', cache: 'no-store', headers: { 'User-Agent': 'PMX-Quiniela-Milestone-Sync' } });
    return response.ok;
  } catch {
    return false;
  }
}

async function sendEvent(role, record, event, vapid, assetIndex) {
  if (event.assetSlots) {
    const w=Number((event.eventKey.match(/W(\d+)/)||[])[1]);
    for (const slot of event.assetSlots) {
      if (assetIndex?.weeks?.[w]?.assets?.[slot]?.state!=='READY')return {eventKey:event.eventKey,status:'WAITING_ASSET_QA',slot};
    }
  }
  const sentKey = keys.sentFor(role,event.eventKey);
  const alreadySent = await redis(['GET', sentKey]);
  if (alreadySent) return { eventKey: event.eventKey, status: 'ALREADY_SENT', sentAt: alreadySent };

  if (event.needsQA) {
    const match=String(event.eventKey||'').match(/W(\d+)$/);
    if (!match) return {eventKey:event.eventKey,status:'WAITING_QA'};
    let qa;
    try {qa=await getJson(`${RAW_BASE}/figma-week-${match[1].padStart(2,'0')}.json?t=${Date.now()}`);}
    catch {return {eventKey:event.eventKey,status:'WAITING_QA'};}
    if (event.needsQA==='PICKS') {
      if (qa.qa?.picks_board!=='PASS' || qa.qa?.picks_visual_review!=='PASS' ||
          !qa.qa?.picks_screenshot_evidence || !qa.picks_node_id ||
          !String(qa.gate||'').includes('PICKS_QA_PASS'))
        return {eventKey:event.eventKey,status:'WAITING_QA'};
    } else {
      if (qa.publication_ready!==true || !String(qa.qa?.visual_review||'').includes('PASS') ||
          !String(qa.gate||'').includes('QA_PASS'))
        return {eventKey:event.eventKey,status:'WAITING_QA'};
    }
  }

  if (event.needsAsset && !(await assetExists(event.needsAsset))) {
    return { eventKey: event.eventKey, status: 'WAITING_ASSET', asset: event.needsAsset };
  }
  if (Array.isArray(event.needsAssets)) {
    for (const asset of event.needsAssets) {
      if (!(await assetExists(asset))) return { eventKey: event.eventKey, status: 'WAITING_ASSET', asset };
    }
  }

  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);
  const ackId = crypto.randomBytes(24).toString('hex');
  await redis(['SET','pmx:quiniela:push:diagnostic:pending:'+ackId,role,'EX',600]);
  const payload = JSON.stringify({
    ackId,ackUrl:'https://packersmexicogithubio-push-backend.vercel.app/api/push-ack',
    title: event.title,
    body: event.body,
    url: event.url,
    tag: event.tag,
    eventKey: event.eventKey
  });

  try {
    await webpush.sendNotification(record.subscription, payload, { TTL: 86400, urgency: 'normal' });
  } catch (error) {
    if (error?.statusCode === 404 || error?.statusCode === 410) {
      await redis(['DEL', keys.subscriptionFor(role)]);
      return { eventKey: event.eventKey, status: 'SUBSCRIPTION_EXPIRED', operator:role };
    }
    return {
      eventKey: event.eventKey,
      status: 'DELIVERY_FAILED',
      upstreamStatus: Number(error?.statusCode || 0) || null,
      upstreamBody: String(error?.body || error?.message || '').slice(0, 200)
    };
  }

  const sentAt = new Date().toISOString();
  await redis(['SET','pmx:quiniela:push:diagnostic:milestone-last:'+role,
    JSON.stringify({id:ackId,eventKey:event.eventKey,queuedAt:sentAt}),'EX',1209600]);
  await redis(['SET', sentKey, sentAt]);
  return { eventKey: event.eventKey, status: 'SENT', sentAt };
}

export default async function handler(req, res) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET' && req.method !== 'POST') return rejectMethod(req, res, ['GET', 'POST']);

  const vapid = {
    publicKey: process.env.VAPID_PUBLIC_KEY,
    privateKey: process.env.VAPID_PRIVATE_KEY,
    subject: process.env.VAPID_SUBJECT
  };
  if (!vapid.publicKey || !vapid.privateKey || !vapid.subject) {
    return json(res, 503, { ok: false, error: 'VAPID_NOT_CONFIGURED' });
  }

  const [data,captureConfig,assetIndex] = await Promise.all([
    getJson(RAW_BASE+'/data.json?t='+Date.now()),
    getJson(RAW_BASE+'/capture-config.json?t='+Date.now()),
    getJson(RAW_BASE+'/exports/asset-index.json?t='+Date.now())
  ]);
  const stages={};
  const readyWeeks=Object.entries(assetIndex.weeks||{}).filter(([week,record])=>
    Number(week)>=6 && Object.values(record.assets||{}).some(a=>a.state==='READY'));
  await Promise.all(readyWeeks.map(async ([week])=>{
    try {stages[week]=await getJson(RAW_BASE+'/figma-week-'+String(week).padStart(2,'0')+'.json?t='+Date.now());}
    catch {stages[week]=null;}
  }));
  const candidates=milestoneEvents({data,captureConfig,assetIndex,stages});
  const results = [];
  for (const role of ['RODRIGO','IBRA']) {
    const raw = await redis(['GET', keys.subscriptionFor(role)]);
    if (!raw) { results.push({operator:role,status:'NOT_SUBSCRIBED'}); continue; }
    const record = JSON.parse(raw);
    for (const event of candidates) {
      const result = await sendEvent(role,record,event,vapid,assetIndex);
      results.push({operator:role,...result});
    }
  }
  return json(res,200,{ok:true,week:data.week_number,captureWeek:captureConfig.week_number,checkedAt:new Date().toISOString(),events:candidates.map(x=>x.eventKey),results});

}
