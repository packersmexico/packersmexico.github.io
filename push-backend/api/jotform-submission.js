import crypto from 'node:crypto';
import webpush from 'web-push';
import { redis, keys } from '../lib/redis.js';
import { json, rejectMethod } from '../lib/http.js';
import { bodyToObject, parseRawRequest, normalizeText, resolveParticipant, validateWeek6Submission } from '../lib/jotform-capture.js';

const RAW_BASE = 'https://raw.githubusercontent.com/packersmexico/packersmexico.github.io/main/quiniela-control';

function equalSecret(received, expected) {
  if (!received || !expected) return false;
  const a=Buffer.from(String(received)), b=Buffer.from(String(expected));
  return a.length===b.length && crypto.timingSafeEqual(a,b);
}

function bearerAuthorized(req){
  const expected=process.env.PMX_RECONCILE_SECRET || process.env.PMX_PUSH_SECRET || '';
  const auth=String(req.headers.authorization||'');
  return Boolean(expected && equalSecret(auth,`Bearer ${expected}`));
}

async function readCanonical(file) {
  const r=await fetch(`${RAW_BASE}/${file}?t=${Date.now()}`,{
    cache:'no-store',headers:{'User-Agent':'PMX-Quiniela-Jotform-Webhook'}
  });
  if(!r.ok) throw new Error('CANONICAL_SOURCE_'+r.status);
  return r.json();
}

function safeSlug(name){
  return normalizeText(name).replace(/[^A-Z0-9]+/g,'_').replace(/^_|_$/g,'').slice(0,28);
}

function isoFromBody(body,raw){
  const value=body.created_at||body.createdAt||body.submittedAt||raw.created_at||raw.createdAt||'';
  if(!value) return null;
  const d=new Date(value);
  return Number.isNaN(d.valueOf()) ? String(value).slice(0,40) : d.toISOString();
}

function logReject(reason,extra={}){
  console.warn('JOTFORM_REJECT',JSON.stringify({reason,...extra}));
}

async function dispatchPush({week,participant,count,total,eventKey}){
  const vapid={
    publicKey:process.env.VAPID_PUBLIC_KEY,
    privateKey:process.env.VAPID_PRIVATE_KEY,
    subject:process.env.VAPID_SUBJECT
  };
  if(!vapid.publicKey||!vapid.privateKey||!vapid.subject) return [{operator:'RODRIGO',status:'PUSH_NOT_CONFIGURED'}];
  webpush.setVapidDetails(vapid.subject,vapid.publicKey,vapid.privateKey);
  const payload=JSON.stringify({
    title:`QUINIELA PMX · W${week} · RESPUESTA VALIDADA`,
    body:`${participant} completó Week ${week}. Registro: ${count}/${total} participantes.`,
    url:'https://packersmexico.github.io/quiniela-control/',
    tag:`pmx-w${week}-valid-${safeSlug(participant).toLowerCase()}`,
    eventKey
  });
  const deliveries=[];
  for(const role of ['RODRIGO','IBRA']){
    const subscriptionKey=keys.subscriptionFor(role);
    const raw=await redis(['GET',subscriptionKey]);
    if(!raw){deliveries.push({operator:role,status:'NOT_SUBSCRIBED'});continue;}
    const sentKey=keys.sentFor(role,eventKey);
    if(await redis(['GET',sentKey])){deliveries.push({operator:role,status:'ALREADY_SENT'});continue;}
    try{
      await webpush.sendNotification(JSON.parse(raw).subscription,payload,{TTL:86400,urgency:'normal'});
      const sentAt=new Date().toISOString();
      await redis(['SET',sentKey,sentAt]);
      deliveries.push({operator:role,status:'SENT',sentAt});
    }catch(err){
      if(err?.statusCode===404||err?.statusCode===410){
        await redis(['DEL',subscriptionKey]);
        deliveries.push({operator:role,status:'SUBSCRIPTION_EXPIRED'});
      }else{
        console.error('JOTFORM_PUSH_FAILED',role,err?.statusCode);
        deliveries.push({operator:role,status:'DELIVERY_FAILED'});
      }
    }
  }
  return deliveries;
}

export default async function handler(req,res) {
  if(req.method!=='POST') return rejectMethod(req,res,['POST']);

  const body=bodyToObject(req.body);
  const backfill=String(req.query?.mode||'').toLowerCase()==='backfill';
  const webhookAuth=equalSecret(req.query?.token,process.env.PMX_JOTFORM_WEBHOOK_TOKEN);
  const adminAuth=backfill && bearerAuthorized(req);
  if(!webhookAuth && !adminAuth){
    logReject('UNAUTHORIZED',{token_present:Boolean(req.query?.token),backfill});
    return json(res,401,{ok:false,error:'UNAUTHORIZED'});
  }

  const formID=String(body.formID||body.formId||body.formid||'').trim();
  const submissionID=String(body.submissionID||body.submissionId||body.submissionid||'').trim();
  if(!/^\d{10,25}$/.test(formID)||!/^\d{10,25}$/.test(submissionID)){
    logReject('INVALID_FORM_OR_SUBMISSION',{form_present:Boolean(formID),submission_present:Boolean(submissionID)});
    return json(res,400,{ok:false,error:'INVALID_FORM_OR_SUBMISSION'});
  }

  const config=await readCanonical('capture-config.json');
  if(formID!==String(config.form_id)||String(config.status||config.window||'').toUpperCase()!=='OPEN'){
    logReject('NOT_ACTIVE_OPEN_FORM',{form_id:formID,configured_form_id:String(config.form_id||'')});
    return json(res,409,{ok:false,error:'NOT_ACTIVE_OPEN_FORM'});
  }

  const week=Number(config.week_number||0);
  if(week!==6){
    logReject('UNSUPPORTED_WEEK',{week});
    return json(res,503,{ok:false,error:'UNSUPPORTED_WEEK'});
  }

  const snapshot=await readCanonical('weeks/week-06.json');
  const roster=new Set((snapshot.participants||[]).map(p=>normalizeText(p.name)).filter(Boolean));
  if(roster.size!==Number(config.total||9)){
    logReject('ROSTER_UNAVAILABLE',{roster_size:roster.size});
    return json(res,503,{ok:false,error:'ROSTER_UNAVAILABLE'});
  }

  const raw=parseRawRequest(body.rawRequest||body.raw_request||body.answers||{});
  const participant=resolveParticipant(raw,roster);
  if(!participant){
    logReject('PARTICIPANT_NOT_RESOLVED',{raw_keys:Object.keys(raw).slice(0,24)});
    return json(res,422,{ok:false,error:'PARTICIPANT_NOT_RESOLVED'});
  }

  const integrity=validateWeek6Submission(raw);
  if(!integrity.valid){
    logReject('INCOMPLETE_OR_INVALID_14',{participant,missing_games:integrity.missing_or_invalid});
    return json(res,422,{ok:false,error:'INCOMPLETE_OR_INVALID_14',missing_games:integrity.missing_or_invalid});
  }

  const idHash=crypto.createHash('sha256').update(submissionID).digest('hex').slice(0,12).toUpperCase();
  const firstValidKey=`pmx:quiniela:jotform:first-valid:${formID}`;
  const receiptKey=`pmx:quiniela:jotform:receipts:${formID}`;
  const receivedAt=new Date().toISOString();
  const privateRecord=JSON.stringify({
    participant,
    submission_id:submissionID,
    submission_hash:idHash,
    received_at:receivedAt,
    submitted_at:isoFromBody(body,raw),
    integrity:'14_OF_14',
    picks:integrity.picks,
    source:backfill?'JOTFORM_CONNECTOR_BACKFILL':'JOTFORM_WEBHOOK'
  });

  const saved=await redis(['HSETNX',firstValidKey,participant,privateRecord]);
  await redis(['HSETNX',receiptKey,participant,JSON.stringify({received_at:receivedAt,submission_hash:idHash})]);
  if(Number(saved)!==1){
    console.info('JOTFORM_DUPLICATE_IGNORED',JSON.stringify({week,participant}));
    return json(res,200,{ok:true,status:'DUPLICATE_IGNORED',week,participant});
  }

  const count=Number(await redis(['HLEN',firstValidKey])||0);
  const total=Number(config.total||9);
  console.info('JOTFORM_FIRST_VALID_LOCKED',JSON.stringify({week,participant,count,total,source:backfill?'BACKFILL':'WEBHOOK'}));

  if(backfill){
    return json(res,200,{ok:true,status:'BACKFILLED_FIRST_VALID',week,participant,count,total,picks_visible:false});
  }

  const eventKey=`W${week}_FIRST_VALID_${safeSlug(participant)}`;
  const deliveries=await dispatchPush({week,participant,count,total,eventKey});
  await redis(['HSET',`pmx:quiniela:jotform:delivery:${formID}`,participant,JSON.stringify({
    event_key:eventKey,at:new Date().toISOString(),deliveries
  })]);

  const rodrigo=deliveries.find(d=>d.operator==='RODRIGO')?.status||'UNKNOWN';
  const delivered=['SENT','ALREADY_SENT'].includes(rodrigo);
  console.info('JOTFORM_PUSH_RESULT',JSON.stringify({week,participant,rodrigo_status:rodrigo}));
  return json(res,delivered?200:202,{
    ok:true,
    status:delivered?'ACCEPTED_FIRST_VALID_PUSH_DISPATCHED':'ACCEPTED_FIRST_VALID_PUSH_UNCONFIRMED',
    week,participant,count,total,rodrigo_status:rodrigo,picks_visible:false
  });
}
