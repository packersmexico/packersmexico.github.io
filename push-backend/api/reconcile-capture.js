import crypto from 'node:crypto';
import {catchupWeek08} from '../scripts/catchup-week08.mjs';
import {json,rejectMethod} from '../lib/http.js';

const RAW='https://raw.githubusercontent.com/packersmexico/packersmexico.github.io/main/quiniela-control/';
function authorized(req){
 const incoming=Buffer.from(String(req.headers.authorization||''));
 return [process.env.PMX_RECONCILE_SECRET,process.env.PMX_PUSH_SECRET]
  .filter(v=>typeof v==='string'&&v.length>0).some(v=>{
   const expected=Buffer.from('Bearer '+v);
   return incoming.length===expected.length&&crypto.timingSafeEqual(incoming,expected);
  });
}
async function remoteJson(endpoint){
 const r=await fetch(endpoint,{cache:'no-store',headers:{'User-Agent':'PMX-Quiniela-2026-Control/2.0'}});
 if(!r.ok)throw Error('CANONICAL_SOURCE_'+r.status);
 return r.json();
}
async function jotform(uri,method='GET',body=null){
 if(!process.env.PMX_JOTFORM_API_KEY)throw Error('JOTFORM_API_KEY_UNAVAILABLE');
 const opts={method,headers:{APIKEY:process.env.PMX_JOTFORM_API_KEY,Accept:'application/json'}};
 if(body){opts.headers['Content-Type']='application/x-www-form-urlencoded';opts.body=new URLSearchParams(body).toString();}
 const r=await fetch('https://api.jotform.com'+uri,{...opts,cache:'no-store',signal:AbortSignal.timeout(30000)});
 if(!r.ok)throw Error('JOTFORM_API_'+r.status);
 const obj=await r.json();if(Number(obj.responseCode)!==200)throw Error('JOTFORM_API_REJECTED_'+obj.responseCode);
 return obj.content;
}
function cleanString(v){return String(v||'').trim().toUpperCase().replace(/\s+/g,' ');}
const normalize={JAGUARS:'JAX',RAVENS:'BAL',COMMANDERS:'WAS',GIANTS:'NYG',PATRIOTS:'NE',LIONS:'DET',PACKERS:'GB'};
const shortTeam=v=>normalize[cleanString(v)]||cleanString(v);
async function inspectPrepared(week,stagedOverride=null){
 const manifest=stagedOverride||await remoteJson(RAW+'season-plan/week-'+String(week).padStart(2,'0')+'.json?t='+Date.now());
 if(manifest.week!==week||!String(manifest.status).startsWith('STAGED')||!/^\d{10,25}$/.test(String(manifest.form_id||'')))throw Error('UNPREPARED_WEEK_FORM');
 const [form,questions]=await Promise.all([
  jotform('/form/'+manifest.form_id),jotform('/form/'+manifest.form_id+'/questions')
 ]);
 const formStatus=cleanString(form.status);
 if(formStatus!=='DISABLED' || Number(form.count||form.new||0)!==0)throw Error('PREPARED_FORM_NOT_PRIVATE_ZERO');
 const items=Object.entries(questions||{}).map(([qid,q])=>({qid:String(q.qid||qid),name:String(q.name||''),text:String(q.text||''),type:String(q.type||''),order:Number(q.order||9999),options:String(q.options||'')}))
  .sort((a,b)=>a.order-b.order);
 const ro=items.filter(q=>q.type==='control_dropdown'&&/PARTICIP/i.test(q.text));
 if(ro.length!==1)throw Error('ROSTER_FIELD_NOT_UNIQUE');
 const roster=manifest.roster||['EL DOC','ARI','LALO','ALEX','LUIS C.','DR PALMA','JENNI','RODRI','IBRACHO'];
 const options=ro[0].options.split('|').map(x=>x.trim()).filter(Boolean);
 if(new Set(options).size!==9||roster.some(x=>!options.includes(x)))throw Error('ROSTER_OPTIONS_MISMATCH');
 const formGames=items.filter(q=>/^G\d{2}\s/.test(q.text));
 if(formGames.length!==manifest.games.length)throw Error('FORM_GAME_COUNT_MISMATCH');
 const games=formGames.map((q,i)=>{
  const m=q.text.match(/^G(\d{2})\s*[·.:-]?\s*([A-Z0-9]+)\s*@\s*([A-Z0-9]+)/i);
  if(!m)throw Error('GAME_LABEL_BAD_'+q.qid);
  const id='G'+m[1],matchup=m[2].toUpperCase()+' @ '+m[3].toUpperCase();
  const verified=manifest.games.find(g=>g.matchup===matchup);
  if(!verified)throw Error('NFL_MATCHUP_DIFFERENCE_'+id);
  if(id!=='G'+String(i+1).padStart(2,'0'))throw Error('JOTFORM_GAME_ID_NOT_CANONICAL_'+id);
  const gb=verified.away==='GB'||verified.home==='GB';
  if(gb && !manifest.packers_fixed)throw Error('GB_WEEK_BYE_CONTRADICTION');
  if(gb&&q.type!=='control_text')throw Error('GB_NOT_READONLY');
  if(!gb&&q.type!=='control_radio')throw Error('GAME_NOT_BINARY_RADIO_'+id);
  if(!gb&&q.options.split('|').filter(Boolean).length!==2)throw Error('NOT_TWO_OPTIONS_'+id);
  return {id,question:q.qid,field:q.name.startsWith('q'+q.qid+'_')?q.name:('q'+q.qid+'_'+q.name),visitor:[verified.away_name,verified.away],home:[verified.home_name,verified.home],
    ...(gb?{fixed_default:'GB',readonly_verified:true}:{})};
 });
 if(new Set(games.map(x=>x.question)).size!==games.length)throw Error('DUPLICATE_QUESTION_IDS');
 const earliest=Date.parse(manifest.first_kickoff_utc);
 if(!Number.isFinite(earliest))throw Error('UNVERIFIED_KICKOFF');
 const deadline=new Date(earliest-3*60*60*1000).toISOString();
 return {ok:true,week,form_id:manifest.form_id,form_status:formStatus,question_map_verified:true,participant_question:ro[0].qid,
  game_count:games.length,deadline_utc:deadline,source_schedule:manifest.source_schedule,
  timezone:'America/Mexico_City',roster,packers_bye:manifest.packers_bye,packers_locked:manifest.packers_fixed,
  bye_teams:manifest.bye_teams,form_url:manifest.form_url||'https://form.jotform.com/'+manifest.form_id,
  games,verified_at:new Date().toISOString()};
}

async function repairStagedQuestionFidelity(week){
  if(![16,17].includes(week))throw Error('ONLY_W16_W17_SAFE_REPAIR');
  const active=await remoteJson(RAW+'capture-config.json?t='+Date.now());
  if(Number(active.week_number)>=week)throw Error('CANNOT_REPAIR_ACTIVE_FORM');
  const manifest=await remoteJson(RAW+'season-plan/week-'+String(week).padStart(2,'0')+'.json?t='+Date.now());
  if(!manifest.form_id||!String(manifest.status).startsWith('STAGED')||!manifest.release_gate?.flex_or_tbd_revalidation_required)
    throw Error('STAGED_MANIFEST_MISSING_OR_NOT_FLEX');
  const form=await jotform('/form/'+manifest.form_id);
  if(cleanString(form.status)!=='DISABLED'||Number(form.count||form.new||0)!==0)
    throw Error('UNSAFE_TO_EDIT_NONEMPTY_OR_OPEN');
  const current=await jotform('/form/'+manifest.form_id+'/questions');
  const items=Object.values(current||{}).filter(q=>/^G\\d{2}/.test(String(q.text||'')))
    .sort((a,b)=>Number(a.order||9999)-Number(b.order||9999));
  if(items.length!==manifest.games.length)throw Error('EXPECTED_EXISTING_'+manifest.games.length+'_GAME_FIELDS');
  const edited=[];
  for(let i=0;i<items.length;i++){
    const q=items[i],g=manifest.games[i],id=String(q.qid||'');
    const target=g.id+' · '+g.matchup;
    const patch={};
    if(String(q.text||'').trim()!==target)patch['question[text]']=target;
    if(g.fixed_pick==='GB'&&q.type!=='control_text'){
      patch['question[type]']='control_text';
      patch['question[required]']='No';
      patch['question[readonly]']='Yes';
      patch['question[defaultValue]']='GB';
    }
    if(Object.keys(patch).length>0){
      if(!/^\\d+$/.test(id))throw Error('INVALID_QID_TO_REPAIR');
      await jotform('/form/'+manifest.form_id+'/question/'+id,'POST',patch);
      edited.push({game:g.id,changed:Object.keys(patch).map(k=>k.replace('question[','').replace(']',''))});
    }
  }
  // Exact parser is the same used on next-week activation.
  const validated=await inspectPrepared(week);
  if(!validated.question_map_verified||validated.form_status!=='DISABLED'||validated.game_count!==manifest.games.length)
    throw Error('FUTURE_QUESTION_REPAIR_READBACK_FAIL');
  return {ok:true,week,status:'REPAIRED_DISABLED_PRIVATE',form_status:validated.form_status,
    game_count:validated.game_count,field_map_verified:true,edited,zero_submissions:true};
}

async function changeFormStatus(week,formId,status,stage){
 if(!['DISABLED','ENABLED'].includes(status))throw Error('UNSUPPORTED_FORM_STATUS');
 const active=await remoteJson(RAW+'capture-config.json?t='+Date.now());
 if(stage==='ACTIVE_CLOSE'){
  if(active.week_number!==week||String(active.form_id)!==formId||String(active.status)!=='OPEN'||status!=='DISABLED')throw Error('CLOSE_WRONG_ACTIVE_FORM');
 }else if(stage==='STAGED_OPEN'){
  if(week!==Number(active.week_number)+1||status!=='ENABLED')throw Error('OPEN_NOT_NEXT_WEEK');
  const pre=await inspectPrepared(week);
  if(pre.form_id!==formId)throw Error('OPEN_NOT_APPROVED_FORM');
  const plan=await remoteJson(RAW+'season-plan/week-'+String(week).padStart(2,'0')+'.json?t='+Date.now());
  if(plan.release_gate?.flex_or_tbd_revalidation_required===true &&
    !(plan.flex_schedule_verified===true && 
      plan.games.every(g=>g.schedule_precision==='OFFICIAL_CONFIRMED')))
    throw Error('FLEX_KICKOFF_REVALIDATION_REQUIRED');
 }else throw Error('NO_AUTHORIZED_TRANSITION');
 const formBefore=await jotform('/form/'+formId);
 if(cleanString(formBefore.status)===status)return {ok:true,week,form_id:formId,status,changed:false,verified:true};
 const reply=await jotform('/form/'+formId+'/properties','POST',{'properties[status]':status});
 const observed=await jotform('/form/'+formId);
 if(cleanString(observed.status)!==status)throw Error('FORM_STATUS_READBACK_FAILED');
 return {ok:true,week,form_id:formId,status,changed:true,verified:true};
}

async function createPrepared(week){
 const active=await remoteJson(RAW+'capture-config.json?t='+Date.now());
 if(!Number.isInteger(week)||week<13||week>18||week<=Number(active.week_number))
  throw Error('PREPARE_ONLY_FUTURE_W13_W18');
 const manifest=await remoteJson(RAW+'season-plan/week-'+String(week).padStart(2,'0')+'.json?t='+Date.now());
 if(manifest.week!==week || !String(manifest.status).startsWith('STAGED') ||
   manifest.form_id || manifest.release_gate?.social_auto_publish!==false ||
   !Array.isArray(manifest.games)||manifest.games.length<13||manifest.games.length>16 ||
   manifest.games.length*2+manifest.bye_teams.length!==32)throw Error('UNSAFE_STAGE_MANIFEST');
 const title='PMX · Quiniela · Week '+week+' · 2026 · PREPARADO - NO ABIERTO';
 const all=await jotform('/user/forms?limit=1000');
 const candidates=(Array.isArray(all)?all:[]).filter(x=>String(x.title||'').trim()===title && cleanString(x.status)!=='DELETED');
 if(candidates.length>1)throw Error('DUPLICATE_PREPARED_FORMS_MANUAL_REVIEW');
 let formId=candidates.length?String(candidates[0].id):null;
 if(!formId){
  const q=[
   {type:'control_head',text:title,order:'1',name:'PMXW'+week+'Header'},
   {type:'control_dropdown',text:'Participant',order:'2',name:'participant',required:'Yes',options:manifest.roster.join('|')}
  ];
  manifest.games.forEach((g,i)=>{
   if(g.id!=='G'+String(i+1).padStart(2,'0') ||
      !/^[A-Z0-9]+ @ [A-Z0-9]+$/.test(g.matchup) ||
      g.fixed_pick && g.fixed_pick!=='GB')throw Error('GAME_ID_AND_FIXED_PICK_MISMATCH');
   q.push(g.fixed_pick==='GB'
    ? {type:'control_text',text:g.id+' · '+g.matchup,order:String(i+3),name:'fixedGB'+(i+1),
       defaultValue:'GB',readonly:'Yes',required:'No',hint:'Green Bay es selección fija autorizada por Dirección'}
    : {type:'control_radio',text:g.id+' · '+g.matchup,order:String(i+3),
       name:'game'+(i+1),options:g.away+'|'+g.home,required:'Yes',allowOther:'No'});
  });
  q.push({type:'control_text',text:'Solo cuenta la primera respuesta válida por participante. FIRST_VALID protege las selecciones.',order:String(q.length+1),name:'firstValidPolicy',readonly:'Yes',required:'No'});
  const fields={'properties[title]':title,'properties[status]':'DISABLED','properties[height]':'1600'};
  q.forEach((item,i)=>Object.entries(item).forEach(([key,value])=>{fields['questions['+i+']['+key+']']=String(value)}));
  const created=await jotform('/user/forms','POST',fields);
  formId=String(created?.id||'');
  if(!/^\d{10,25}$/.test(formId))throw Error('STAGE_CREATION_ID_MISSING');
 }
 // No future form may remain enabled, even if a previous attempt was interrupted.
 const before=await jotform('/form/'+formId);
 if(cleanString(before.status)!=='DISABLED')
  await jotform('/form/'+formId+'/properties','POST',{'properties[status]':'DISABLED'});
 const [form,questions]=await Promise.all([jotform('/form/'+formId),jotform('/form/'+formId+'/questions')]);
 if(cleanString(form.status)!=='DISABLED'||Number(form.count||form.new||0)!==0)
  throw Error('PREPARED_FORM_NOT_DISABLED_OR_NOT_EMPTY');
 const actual=Object.values(questions||{}).filter(x=>/^G\d{2}\s/.test(String(x.text||''))).sort((a,b)=>Number(a.order||0)-Number(b.order||0));
 if(actual.length!==manifest.games.length)throw Error('STAGED_FORM_QUESTIONS_MISSING');
 if(actual.some((x,i)=>String(x.text||'').includes(manifest.games[i].matchup)===false))
  throw Error('STAGED_GAME_ORDER_NOT_CANONICAL');
 return {ok:true,week,form_id:formId,form_url:'https://form.jotform.com/'+formId,
  form_status:'DISABLED',game_count:actual.length,questions_count:Object.keys(questions||{}).length,
  source_schedule:manifest.source_schedule,zero_submissions:true,created_at:new Date().toISOString(),
  flex_hold:manifest.release_gate?.flex_or_tbd_revalidation_required===true,
  inspected:await inspectPrepared(week,{...manifest,form_id:formId,form_url:'https://form.jotform.com/'+formId})};
}

export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store,max-age=0');
 if(req.method!=='POST')return rejectMethod(req,res,['POST']);
 if(!authorized(req))return json(res,401,{ok:false,error:'UNAUTHORIZED'});
 try{
  const action=String(req.body?.action||'RECONCILE').toUpperCase();
  if(action==='REPAIR_STAGED'){
    const w=Number(req.body?.week);
    return json(res,200,await repairStagedQuestionFidelity(w));
  }
  if(action==='CREATE_STAGED'){
   const w=Number(req.body?.week);
   if(!Number.isInteger(w)||w<13||w>18)return json(res,400,{ok:false,error:'INVALID_WEEK'});
   return json(res,200,await createPrepared(w));
  }
  if(action==='INSPECT_STAGED'){
   const w=Number(req.body?.week);
   if(!Number.isInteger(w)||w<10||w>18)return json(res,400,{ok:false,error:'INVALID_WEEK'});
   return json(res,200,await inspectPrepared(w));
  }
  if(action==='CLOSE_ACTIVE'||action==='OPEN_STAGED'){
   const week=Number(req.body?.week),form=String(req.body?.form_id||'');
   if(!Number.isInteger(week)||week<9||week>18||!/^\d{10,25}$/.test(form))throw Error('INVALID_TRANSITION_INPUT');
   if(action==='CLOSE_ACTIVE')return json(res,200,await changeFormStatus(week,form,'DISABLED','ACTIVE_CLOSE'));
   return json(res,200,await changeFormStatus(week,form,'ENABLED','STAGED_OPEN'));
  }
  if(action!=='RECONCILE')return json(res,400,{ok:false,error:'UNKNOWN_ACTION'});
  return json(res,200,await catchupWeek08());
 }catch(e){
  const reason=String(e?.message||'RECONCILIATION_ERROR').replace(/[0-9]{10,}/g,'[REDACTED]');
  console.error('PMX_CAPTURE_CONTROL_HOLD',reason);
  return json(res,503,{ok:false,error:'CAPTURE_CONTROL_HOLD',reason});
 }
}
