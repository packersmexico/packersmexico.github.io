#!/usr/bin/env node
// PMX Quiniela · ONE existing reconciliation workflow.
// On each confirmed Jotform FIRST_VALID, notify Ibra + Rodrigo through the
// existing /api/notify route. On local deadline day at 10:00-10:59 CDMX,
// send one idempotent pending-roster reminder. No picks/IDs on GitHub.
// Uses the canonical contract and private Redis aggregate readback.
import fs from 'node:fs';

const ROOT='quiniela-control/';
const API='https://packersmexicogithubio-push-backend.vercel.app/api/';
const PANEL='https://packersmexico.github.io/quiniela-control/';
const CAPTURE='https://packersmexico.github.io/quiniela-control/captura/';
const TIMEZONE='America/Mexico_City';
const assert=(ok,msg)=>{if(!ok)throw Error(msg);};
const load=rel=>JSON.parse(fs.readFileSync(ROOT+rel,'utf8'));
const tag=n=>'week-'+String(n).padStart(2,'0')+'.json';
const slug=name=>String(name).trim().toUpperCase().replace(/[^A-Z0-9]+/g,'_').replace(/^_|_$/g,'').slice(0,28);

function mexicoParts(date){
  const pieces=new Intl.DateTimeFormat('en-US',{
    timeZone:TIMEZONE,year:'numeric',month:'2-digit',day:'2-digit',
    hour:'2-digit',minute:'2-digit',hourCycle:'h23'
  }).formatToParts(date);
  const d=Object.fromEntries(pieces.filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
  return {date:d.year+'-'+d.month+'-'+d.day,hour:Number(d.hour),minute:Number(d.minute)};
}
function deadlineReminderDue(now,deadline){
  const n=mexicoParts(new Date(now)),d=mexicoParts(new Date(deadline));
  return n.date===d.date && n.hour===10 && Date.parse(now)<Date.parse(deadline);
}
function validateLive(config,contract,live){
  const week=Number(config.week_number),games=contract.games.length;
  assert(week===Number(contract.week_number)&&String(config.form_id)===String(contract.form_id),'CONTRACT_CONFIG_MISMATCH');
  assert(Number(config.total)===9 && games>=13 && games<=16,'UNEXPECTED_ROSTER_OR_GAMES');
  assert(config.status==='OPEN'&&config.window==='OPEN','CAPTURE_NOT_OPEN');
  assert(config.deadline===contract.deadline,'CONTRACT_DEADLINE_MISMATCH');
  assert(live.ok===true&&Number(live.week)===week&&String(live.form_id)===String(config.form_id),'LIVE_CAPTURE_WRONG_WEEK');
  const roster=contract.roster||[];
  assert(roster.length===9&&new Set(roster).size===9,'INVALID_ROSTER');
  const verified=(live.verified_participants||[]).map(p=>p.name);
  const n=Number(live.verified_count);
  assert(Number.isInteger(n)&&n>=0&&n<=9&&verified.length===n&&new Set(verified).size===n,'INVALID_VERIFIED_COUNT');
  assert(verified.every(x=>roster.includes(x)),'NONCANONICAL_PARTICIPANT');
  assert(Number(live.total)===9&&Number(live.private_picks_count)===n*games&&
    Number(live.private_picks_complete_records)===n,'PRIVATE_FIRST_VALID_NOT_COMPLETE');
  if(n>0)assert(live.backend_status==='LIVE_FIRST_VALID_VERIFIED','FIRST_VALID_NOT_LIVE_VERIFIED');
  const received=new Set(verified),pending=roster.filter(x=>!received.has(x));
  assert(pending.length===9-n,'PENDING_ROSTER_MISMATCH');
  return {week,verified,pending,count:n,total:9,games};
}
async function fetchJson(url,options={}){
  const response=await fetch(url,{...options,cache:'no-store',signal:AbortSignal.timeout(45000)});
  let d={};
  try{d=await response.json();}catch{throw Error('NON_JSON_RESPONSE_'+response.status);}
  return {status:response.status,ok:response.ok,data:d};
}
async function notify(payload,secret){
  const result=await fetchJson(API+'notify',{
    method:'POST',headers:{Authorization:'Bearer '+secret,'Content-Type':'application/json'},
    body:JSON.stringify(payload)
  });
  const deliveries=result.data?.deliveries||[];
  assert(Array.isArray(deliveries),'PUSH_RECEIPTS_MISSING');
  const ops=Object.fromEntries(deliveries.map(x=>[x.operator,x.status]));
  const accepted=['SENT','ALREADY_SENT'];
  const full=accepted.includes(ops.IBRA)&&accepted.includes(ops.RODRIGO);
  console.log('PMX_PUSH_DELIVERY',JSON.stringify({
    type:payload.kind||'CAPTURE_EVENT',week:payload.week,http:result.status,
    ibra:ops.IBRA||'UNKNOWN',rodrigo:ops.RODRIGO||'UNKNOWN',both_accepted:full
  }));
  if(!full)console.warn('::warning::PMX_PUSH_PARTIAL_OR_UNSUBSCRIBED (will retry with same eventKey)');
  return full;
}
async function main(){
  if(process.argv.includes('--self-test')){
    assert(deadlineReminderDue('2026-11-19T16:00:00.000Z','2026-11-19T22:00:00.000Z'),'W11_THURSDAY_10');
    assert(deadlineReminderDue('2026-11-19T16:59:00.000Z','2026-11-19T22:00:00.000Z'),'W11_RETRY_WINDOW');
    assert(!deadlineReminderDue('2026-11-19T17:00:00.000Z','2026-11-19T22:00:00.000Z'),'OUTSIDE_REMINDER_HOUR');
    assert(deadlineReminderDue('2026-11-25T16:05:00.000Z','2026-11-25T22:00:00.000Z'),'W12_WEDNESDAY_HOLIDAY');
    assert(!deadlineReminderDue('2026-11-26T16:00:00.000Z','2026-11-25T22:00:00.000Z'),'PAST_WEEK12_DEADLINE');
    const roster=['EL DOC','ARI','LALO','ALEX','LUIS C.','DR PALMA','JENNI','RODRI','IBRACHO'];
    const config={week_number:11,form_id:'263078694568071',status:'OPEN',window:'OPEN',deadline:'2026-11-19T22:00:00.000Z',total:9};
    const contract={...config,roster,games:Array.from({length:13},(_,i)=>({id:'G'+String(i+1).padStart(2,'0')}))};
    const zero=validateLive(config,contract,{ok:true,week:11,form_id:config.form_id,total:9,
      verified_count:0,verified_participants:[],private_picks_count:0,private_picks_complete_records:0});
    assert(zero.pending.length===9&&zero.count===0,'ZERO_REMINDER_VALID');
    const one=validateLive(config,contract,{ok:true,week:11,form_id:config.form_id,total:9,
      backend_status:'LIVE_FIRST_VALID_VERIFIED',verified_count:1,
      verified_participants:[{name:'ALEX'}],private_picks_count:13,private_picks_complete_records:1});
    assert(one.count===1&&one.pending.length===8&&slug('LUIS C.')==='LUIS_C','ONE_PICK_VALID');
    console.log('PASS · PMX Quiniela FIRST_VALID individual alerts + 10 AM deadline-day reminder, W11 and W12.');
    return;
  }
  assert(process.env.GITHUB_ACTIONS==='true','GITHUB_ACTIONS_ONLY');
  const secret=process.env.PMX_PUSH_SECRET;
  assert(secret&&secret.length>=12,'PMX_PUSH_SECRET_MISSING');
  const config=load('capture-config.json');
  if(config.status!=='OPEN'){console.log('PMX_CAPTURE_PUSH_SKIPPED_NOT_OPEN');return;}
  const now=new Date(),deadline=new Date(config.deadline);
  assert(Number.isFinite(deadline.valueOf()),'INVALID_DEADLINE');
  if(now>=deadline){console.log('PMX_CAPTURE_PUSH_SKIPPED_AFTER_DEADLINE');return;}
  const contract=load('contracts/'+tag(config.week_number));
  const url=API+'capture-status?week='+Number(config.week_number)+'&form_id='+encodeURIComponent(config.form_id)+'&t='+Date.now();
  const response=await fetchJson(url);
  assert(response.ok,'CAPTURE_STATUS_UNAVAILABLE_'+response.status);
  const d=validateLive(config,contract,response.data);
  const readiness=await fetchJson(API+'notify',{
    method:'GET',headers:{Authorization:'Bearer '+secret}
  });
  assert(readiness.ok && readiness.data?.ok===true,'PUSH_READINESS_UNAVAILABLE');
  const operators=readiness.data.operators||{};
  const ibraReady=operators.IBRA?.subscribed===true,rodrigoReady=operators.RODRIGO?.subscribed===true;
  console.log('PMX_PUSH_SUBSCRIPTIONS',JSON.stringify({
    ibra:ibraReady?'REGISTERED':'NOT_REGISTERED',
    rodrigo:rodrigoReady?'REGISTERED':'NOT_REGISTERED',
    vapid_configured:readiness.data.vapid_configured===true
  }));
  if(!ibraReady||!rodrigoReady||readiness.data.vapid_configured!==true)
    console.warn('::warning::PMX_OPERATOR_PUSH_DEVICE_REGISTRATION_REQUIRED');
  console.log('PMX_CAPTURE_ALERT_GATE',JSON.stringify({week:d.week,verified:d.count,total:d.total,
    pending:d.pending.length,first_valid_integrity:'PASS',deadline:config.deadline}));
  let accepted=0,partial=0;
  // IMPORTANT: The webhook path uses this exact event key and Redis sent-key.
  // Duplicate cron retries and eventual webhook delivery cannot double-send.
  for(const name of d.verified){
    const eventKey='W'+d.week+'_FIRST_VALID_'+slug(name);
    const payload={kind:'FIRST_VALID',week:d.week,eventKey,
      title:'QUINIELA PMX · W'+d.week+' · RESPUESTA VALIDADA',
      body:name+' registró sus picks. Van '+d.count+'/9. Pendientes: '+
        (d.pending.length?d.pending.join(', '):'ninguno')+'.',
      url:PANEL,tag:'pmx-w'+d.week+'-valid-'+slug(name).toLowerCase()};
    if(await notify(payload,secret))accepted++;else partial++;
  }
  const due=deadlineReminderDue(now.toISOString(),config.deadline);
  if(due && d.pending.length>0){
    const key='W'+d.week+'_DEADLINE_DAY_10AM';
    const message='Registrados '+d.count+'/9. Faltan '+d.pending.length+': '+
      d.pending.join(', ')+'. Cierre HOY 16:00 CDMX.';
    const payload={kind:'DEADLINE_10AM',week:d.week,eventKey:key,
      title:'PACKERS MÉXICO · QUINIELA W'+d.week+' · FALTANTES 10 AM',
      body:message,url:CAPTURE,tag:'pmx-w'+d.week+'-pending-deadline-10am'};
    if(await notify(payload,secret))accepted++;else partial++;
    console.log('PMX_DEADLINE_10AM_GATE',JSON.stringify({week:d.week,count:d.count,missing:d.pending.length,
      local_date:mexicoParts(now).date,deadline:config.deadline}));
  }else{
    console.log('PMX_DEADLINE_10AM_NOT_DUE_OR_FULL',JSON.stringify({week:d.week,due,
      missing:d.pending.length}));
  }
  // One Direction-authorized operator reminder. The request contains no picks
  // or private Jotform data; recipients and pending names derive from live Redis
  // FIRST_VALID only. Same idempotency service prevents any duplicate push.
  const requestPath=ROOT+'reminders/week-11-on-demand-20261119.json';
  if(fs.existsSync(requestPath)){
    const request=JSON.parse(fs.readFileSync(requestPath,'utf8'));
    const localDate=mexicoParts(now).date;
    if(request.user_authorized===true && request.status==='REQUESTED' &&
      request.week===d.week && request.week===11 &&
      String(request.form_id)===String(config.form_id) &&
      request.requested_local_date===localDate &&
      request.source==='LIVE_BACKEND_FIRST_VALID_ONLY' &&
      Array.isArray(request.recipients) &&
      request.recipients.length===2 &&
      request.recipients.includes('RODRIGO') &&
      request.recipients.includes('IBRA') &&
      /^W11_PENDING_OPERATOR_REMINDER_20261119_1245$/.test(request.event_key) &&
      d.pending.length>0 && now<deadline){
      const payload={kind:'DIRECTION_ON_DEMAND_PENDING',week:d.week,
        eventKey:request.event_key,
        title:'PACKERS MÉXICO · QUINIELA W11 · ÚLTIMO RECORDATORIO',
        body:'Registrados '+d.count+'/9. Faltan: '+d.pending.join(', ')+
          '. Cierre HOY 16:00 CDMX. ¡Envía tus picks!',
        url:CAPTURE,tag:'pmx-w11-direction-reminder-20261119'};
      if(await notify(payload,secret))accepted++;else partial++;
      console.log('PMX_DIRECTION_PUSH',JSON.stringify({
        week:d.week,remaining:d.pending.length,verified:d.count,
        event_key:request.event_key,accepted:accepted>0,private_picks_visible:false
      }));
    }else console.log('PMX_DIRECTION_PUSH_SKIPPED',JSON.stringify({
      week:d.week,request_present:true,pending:d.pending.length,
      authorized:request.user_authorized===true,local_date:localDate
    }));
  }
  console.log('PMX_PUSH_CYCLE',JSON.stringify({week:d.week,accepted,partial,verified:d.count,deadlineReminderDue:due}));
}
await main();
