import crypto from 'node:crypto';
import webpush from 'web-push';
import { redis, keys } from '../lib/redis.js';
import { json, rejectMethod } from '../lib/http.js';
import { bodyToObject, parseRawRequest, normalizeText, resolveParticipant } from '../lib/jotform-capture.js';
import { assertWeekConfig, validateWeeklyPicks } from '../lib/weekly-capture.js';
import { seedW6Baseline } from '../lib/jotform-baseline.js';

const RAW_BASE = 'https://raw.githubusercontent.com/packersmexico/packersmexico.github.io/main/quiniela-control';

function equalSecret(received, expected) {
  if (!received || !expected) return false;
  const a=Buffer.from(String(received)), b=Buffer.from(String(expected));
  return a.length===b.length && crypto.timingSafeEqual(a,b);
}

function bearerAuthorized(req){
  // Canonical backfill supports the dedicated reconciliation credential and
  // the pre-existing GH Actions operator credential without revealing either.
  const auth=String(req.headers.authorization||'');
  return [process.env.PMX_RECONCILE_SECRET,process.env.PMX_PUSH_SECRET]
    .filter(secret=>typeof secret==='string'&&secret.length>0)
    .some(secret=>equalSecret(auth,`Bearer ${secret}`));
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

  // Jotform can wrap standard identifiers in rawRequest or send them with
  // alternate casing. Inspect only documented identifier keys; never infer a
  // submission ID from the participant name or create synthetic records.
  const nested=parseRawRequest(body.rawRequest||body.raw_request||body.payload||{});
  const wrapped=parseRawRequest(nested.rawRequest||nested.raw_request||{});
  const field=(keys)=>[body,nested,wrapped].map(obj=>keys.map(k=>obj?.[k]).find(v=>v!==undefined&&v!==null&&v!=='')).find(v=>v!==undefined&&v!==null&&v!=='');
  const formID=String(field(['formID','formId','formid','form_id'])||'').trim();
  const submissionID=String(field(['submissionID','submissionId','submissionid','submission_id'])||'').trim();
  if(!/^\d{10,25}$/.test(formID)||!/^\d{10,25}$/.test(submissionID)){
    logReject('INVALID_FORM_OR_SUBMISSION',{
      form_present:Boolean(formID),submission_present:Boolean(submissionID),
      body_keys:Object.keys(body).slice(0,25),
      raw_keys:Object.keys(nested).slice(0,25)
    });
    return json(res,400,{ok:false,error:'INVALID_FORM_OR_SUBMISSION'});
  }

  const config=await readCanonical('capture-config.json');
  if(formID!==String(config.form_id)||String(config.status||config.window||'').toUpperCase()!=='OPEN'){
    logReject('NOT_ACTIVE_OPEN_FORM',{form_id:formID,configured_form_id:String(config.form_id||'')});
    return json(res,409,{ok:false,error:'NOT_ACTIVE_OPEN_FORM'});
  }

  const week=Number(config.week_number||0);
  let contract;
  try {
    contract=assertWeekConfig(await readCanonical('contracts/week-'+String(week).padStart(2,'0')+'.json'));
  } catch {
    return json(res,503,{ok:false,error:'WEEK_CONTRACT_UNAVAILABLE'});
  }
  if(String(contract.form_id)!==formID)return json(res,409,{ok:false,error:'CONTRACT_FORM_MISMATCH'});
  if(!Number.isFinite(Date.parse(contract.deadline)))return json(res,503,{ok:false,error:'DEADLINE_CONFIG_INVALID'});
  if(Date.now()>Date.parse(contract.deadline))return json(res,409,{ok:false,error:'CAPTURE_WINDOW_CLOSED'});
  const roster=new Set(contract.roster.map(normalizeText));
  if(roster.size!==Number(config.total||contract.roster.length)){
    logReject('ROSTER_UNAVAILABLE',{roster_size:roster.size});
    return json(res,503,{ok:false,error:'ROSTER_UNAVAILABLE'});
  }
  await seedW6Baseline(redis,formID,roster);

  const raw=parseRawRequest(body.rawRequest||body.raw_request||body.answers||body.payload||{});
  const participant=resolveParticipant(raw,roster);
  if(!participant){
    logReject('PARTICIPANT_NOT_RESOLVED',{raw_keys:Object.keys(raw).slice(0,24)});
    return json(res,422,{ok:false,error:'PARTICIPANT_NOT_RESOLVED'});
  }

  const integrity=validateWeeklyPicks(raw,contract);
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
  const total=contract.roster.length;
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
