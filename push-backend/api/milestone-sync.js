import webpush from 'web-push';
import { redis, keys } from '../lib/redis.js';
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

function eventPayloads(data) {
  const week = Number(data?.week_number || 0);
  if (!week || week <= 4) return [];

  const capture = data?.capture || {};
  const results = data?.results || {};
  const events = [];

  const weekOpen =
    String(capture.window || '').toUpperCase() === 'OPEN' &&
    Number(capture.complete || 0) < Number(capture.total || 9);

  if (weekOpen) {
    events.push({
      eventKey: `WEEK_OPEN_W${week}`,
      title: `PACKERS MÉXICO · QUINIELA W${week}`,
      body: `Nueva Week disponible. Captura abierta · ${capture.complete || 0}/${capture.total || 9} recibidos.`,
      url: 'https://packersmexico.github.io/quiniela-control/captura/',
      tag: `pmx-week-open-w${week}`
    });
  }

  if (week === 5 && weekOpen && Number(capture.complete) === 8 &&
      Date.now() < new Date('2026-10-08T16:00:00-06:00').getTime()) {
    events.push({
      eventKey: 'W5_REMINDER_8OF9_20261008_1600',
      title: 'QUINIELA PMX · WEEK 5 · FALTA UNO',
      body: 'Rodri y Alex ya enviaron. Falta LUIS C. · cierre 16:00 CDMX.',
      url: 'https://packersmexico.github.io/quiniela-control/captura/',
      tag: 'pmx-w5-reminder-8of9'
    });
  }

  const captureComplete =
    Number(capture.complete || 0) > 0 &&
    Number(capture.total || 0) > 0 &&
    String(capture.window || '').toUpperCase() === 'CLOSED';

  if (captureComplete) {
    events.push({
      needsAsset: `exports/w${week}-picks-board.png`,
      needsQA: 'PICKS',
      eventKey: `CAPTURE_PICKS_READY_W${week}`,
      title: `PACKERS MÉXICO · W${week} PICKS LISTOS`,
      body: `${capture.complete}/${capture.total} participantes. Captura cerrada y hoja de picks QA PASS disponible en el panel.`,
      url: 'https://packersmexico.github.io/quiniela-control/exports/live.html',
      tag: `pmx-capture-complete-w${week}`
    });
  }

  const finalComplete =
    Number(results.final || 0) === Number(results.total || 16) &&
    Number(results.total || 0) > 0;

  if (finalComplete) {
    events.push({
      needsQA: 'FINAL',
      needsAssets: [
        `exports/w${week}-results-live.png`,
        `exports/w${week}-ranking-weekly.png`,
        `exports/w${week}-ranking-season.png`
      ],
      eventKey: `WEEK_FINAL_W${week}`,
      title: `PACKERS MÉXICO · W${week} FINAL`,
      body: `${results.final}/${results.total} FINAL. Resultados y rankings actualizados; rollover de la siguiente Week en proceso.`,
      url: 'https://packersmexico.github.io/quiniela-control/exports/live.html',
      tag: `pmx-week-final-w${week}`
    });
  }

  return events;
}

async function sendEvent(role, record, event, vapid) {
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
  const payload = JSON.stringify({
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

  const data = await getJson(`${RAW_BASE}/data.json?t=${Date.now()}`);
  const candidates = eventPayloads(data);
  const results = [];
  for (const role of ['RODRIGO','IBRA']) {
    const raw = await redis(['GET', keys.subscriptionFor(role)]);
    if (!raw) { results.push({operator:role,status:'NOT_SUBSCRIBED'}); continue; }
    const record = JSON.parse(raw);
    for (const event of candidates) {
      const result = await sendEvent(role,record,event,vapid);
      results.push({operator:role,...result});
    }
  }
  return json(res,200,{ok:true,week:data.week_number,checkedAt:new Date().toISOString(),results});

}
