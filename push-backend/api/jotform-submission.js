import crypto from 'node:crypto';
import webpush from 'web-push';
import { redis, keys } from '../lib/redis.js';
import { json, rejectMethod } from '../lib/http.js';

const RAW_BASE = 'https://raw.githubusercontent.com/packersmexico/packersmexico.github.io/main/quiniela-control';

function equalSecret(received, expected) {
  if (!received || !expected) return false;
  const a=Buffer.from(String(received)), b=Buffer.from(String(expected));
  return a.length===b.length && crypto.timingSafeEqual(a,b);
}

function bodyToObject(body) {
  if (!body) return {};
  if (typeof body === 'object') return body;
  if (typeof body === 'string') return Object.fromEntries(new URLSearchParams(body));
  return {};
}

function parseRawRequest(value) {
  if (typeof value==='string') {
    try { const obj=JSON.parse(value); return obj && typeof obj==='object' ? obj : {}; }
    catch { return {}; }
  }
  return value && typeof value==='object' ? value : {};
}

function normalizeName(value) {
  return typeof value==='string' ? value.trim().replace(/\s+/g,' ').toUpperCase() : '';
}

function extractParticipant(raw, roster) {
  const found=new Set();
  function examine(val) {
    if (typeof val==='string') {
      const norm=normalizeName(val);
      if (roster.has(norm)) found.add(norm);
    } else if (val && typeof val==='object' && !Array.isArray(val)) {
      if (typeof val.value==='string') examine(val.value);
      if (typeof val.answer==='string') examine(val.answer);
    }
  }
  for(const value of Object.values(raw||{})) examine(value);
  return found.size===1 ? [...found][0] : null;
}

async function readCanonical(file) {
  const r=await fetch(`${RAW_BASE}/${file}?t=${Date.now()}`,{cache:'no-store',
    headers:{'User-Agent':'PMX-Quiniela-Jotform-Webhook'}});
  if(!r.ok)throw new Error('CANONICAL_SOURCE_'+r.status);
  return r.json();
}

export default async function handler(req,res) {
  if(req.method!=='POST') return rejectMethod(req,res,['POST']);
  const token=process.env.PMX_JOTFORM_WEBHOOK_TOKEN;
  if(!equalSecret(req.query?.token,token))
    return json(res,401,{ok:false,error:'UNAUTHORIZED'});

  const body=bodyToObject(req.body);
  const formID=String(body.formID||body.formId||body.formid||'').trim();
  const submissionID=String(body.submissionID||body.submissionId||body.submissionid||'').trim();
  if(!/^\d{10,25}$/.test(formID)||!/^\d{10,25}$/.test(submissionID))
    return json(res,400,{ok:false,error:'INVALID_FORM_OR_SUBMISSION'});
  const config=await readCanonical('capture-config.json');
  if(formID!==String(config.form_id)||String(config.status||config.window||'').toUpperCase()!=='OPEN')
    return json(res,409,{ok:false,error:'NOT_ACTIVE_OPEN_FORM'});

  const data=await readCanonical('data.json');
  const roster=new Set((data.participants||[]).map(p=>normalizeName(p.name)).filter(Boolean));
  if(roster.size<1)return json(res,503,{ok:false,error:'ROSTER_UNAVAILABLE'});
  const participant=extractParticipant(parseRawRequest(body.rawRequest),roster);
  if(!participant)return json(res,422,{ok:false,error:'PARTICIPANT_NOT_RESOLVED'});

  const week=Number(config.week_number||0);
  if(!Number.isInteger(week)||week<1)return json(res,503,{ok:false,error:'WEEK_NOT_CONFIGURED'});

  const safeName=participant.normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
      .replace(/[^A-Z0-9]+/g,'_').replace(/^_|_$/g,'').slice(0,28);
  const idHash=crypto.createHash('sha256').update(submissionID).digest('hex').slice(0,12).toUpperCase();
  const eventKey=`W${week}_PICK_RECEIVED_${safeName}_${idHash}`;
  const claimKey=`pmx:quiniela:jotform:first:${formID}:${safeName}`;
  // SET NX guarantees one first submission per participant, even under concurrent webhooks.
  const claim=await redis(['SET',claimKey,submissionID,'NX','EX',180]);
  if(claim!=='OK')return json(res,200,{ok:true,status:'DUPLICATE_IGNORED',week,participant});

  const vapid={publicKey:process.env.VAPID_PUBLIC_KEY,privateKey:process.env.VAPID_PRIVATE_KEY,subject:process.env.VAPID_SUBJECT};
  if(!vapid.publicKey||!vapid.privateKey||!vapid.subject) {
    await redis(['DEL',claimKey]);
    return json(res,503,{ok:false,error:'PUSH_NOT_CONFIGURED'});
  }
  webpush.setVapidDetails(vapid.subject,vapid.publicKey,vapid.privateKey);
  const title=`QUINIELA PMX · W${week} · NUEVO ENVÍO`;
  const message=`${participant} envió su respuesta. Pendiente de validación en el panel.`;
  const payload=JSON.stringify({
    title,body:message,
    url:'https://packersmexico.github.io/quiniela-control/',
    tag:`pmx-w${week}-new-${safeName.toLowerCase()}`,eventKey
  });
  const deliveries=[];
  for(const role of ['RODRIGO','IBRA']) {
    const raw=await redis(['GET',keys.subscriptionFor(role)]);
    if(!raw){deliveries.push({operator:role,status:'NOT_SUBSCRIBED'});continue;}
    const sentKey=keys.sentFor(role,eventKey);
    if(await redis(['GET',sentKey])){deliveries.push({operator:role,status:'ALREADY_SENT'});continue;}
    try{
      await webpush.sendNotification(JSON.parse(raw).subscription,payload,{TTL:86400,urgency:'normal'});
      await redis(['SET',sentKey,new Date().toISOString()]);
      deliveries.push({operator:role,status:'SENT'});
    }catch(err){
      if(err?.statusCode===404||err?.statusCode===410) {
        await redis(['DEL',keys.subscriptionFor(role)]);
        deliveries.push({operator:role,status:'SUBSCRIPTION_EXPIRED'});
      }else{
        console.error('JOTFORM_PUSH_FAILED',role,err?.statusCode);
        deliveries.push({operator:role,status:'DELIVERY_FAILED'});
      }
    }
  }
  const sent=deliveries.some(d=>d.status==='SENT'||d.status==='ALREADY_SENT');
  if(!sent){
    await redis(['DEL',claimKey]);
    return json(res,503,{ok:false,error:'PUSH_DELIVERY_UNCONFIRMED',week,deliveries});
  }
  await redis(['SET',claimKey,submissionID]);
  return json(res,200,{ok:true,status:'ACCEPTED',week,participant,deliveries});
}
