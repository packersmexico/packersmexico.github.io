import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {readWeekSources} from '../api/score-week.js';
import {parseJotformCreatedAt,requireCorrectOriginal} from '../scripts/catchup-week08.mjs';
import {readNativeFormMap} from '../lib/jotform-native-form.js';
import {assertWeekConfig,validateWeeklyPicks} from '../lib/weekly-capture.js';
import {reconcileCanonical,canClose} from '../../scripts/quiniela-season-cycle.mjs';

const roster=['EL DOC','ARI','LALO','ALEX','LUIS C.','DR PALMA','JENNI','RODRI','IBRACHO'];
const manifest={roster,games:[
 {id:'G01',matchup:'GB @ LAR',away:'GB',away_name:'PACKERS',home:'LAR',home_name:'RAMS',fixed_pick:'GB'},
 {id:'G02',matchup:'CHI @ DET',away:'CHI',away_name:'BEARS',home:'DET',home_name:'LIONS'}
]};
const html=`<li id="id_21" data-type="control_dropdown"><label><span class="jsQuestionLabelContainer jfQuestionLabelContainer" role="heading">Participante</span><span class="jfRequiredStar">* <span class="jfRequiredStar-message">Este campo es obligatorio.</span></span></label>
<select name="q21_participante">${roster.map(n=>`<option value="${n}">${n}</option>`).join('')}</select></li>
<li data-type="control_text" id="id_22"><div id="text_22" class="form-html" data-component="text">G01 GB @ LAR: PACKERS GB</div></li>
<li id="id_23" data-type="control_radio"><label><span>G02 CHI @ DET</span></label>
<input type="radio" class="form-radio" name="q23_g02Chi" required="" value="BEARS"/>
<input value="LIONS" name="q23_g02Chi" required="" type="radio"/></li>`;
const config={week_number:12,form_id:'123456789012',deadline:'2026-11-25T22:00:00.000Z',total:9,expected_picks:144};
test('provider Card form accepts display-only GB and binds both real radio values; contract can ingest',()=>{
 const out=readNativeFormMap(html,manifest);
 assert.deepEqual(out.games.map(g=>g.question),['22','23']);
 const c=assertWeekConfig({...config,timezone:'America/Mexico_City',roster,packers_locked:true,games:out.games});
 assert.deepEqual(validateWeeklyPicks({'23':{answer:'LIONS'}},c).picks,{G01:'GB',G02:'DET'});
});
test('wrong schedule, changed option, or editable GB cannot open the form',()=>{
 assert.throws(()=>readNativeFormMap(html.replace('CHI @ DET','CHI @ NYG'),manifest),/GAME_MAP_MISMATCH/);
 assert.throws(()=>readNativeFormMap(html.replace('value="LIONS"','value="GIANTS"'),manifest),/TEAM_OPTIONS_INVALID/);
 assert.throws(()=>readNativeFormMap(html.replace('G01 GB @ LAR: PACKERS GB</div>','G01 GB @ LAR: PACKERS GB</div><input name="q22_gb" value="GB">'),manifest),/FIXED_GB_INVALID/);
});
test('W13 staged metadata: English roster, all 14 QIDs, code values and fixed G04',()=>{
 const fromRepo=file=>JSON.parse(fs.readFileSync(new URL('../../quiniela-control/'+file,import.meta.url),'utf8'));
 const plan=fromRepo('season-plan/week-13.json');
 const contract=fromRepo('contracts/week-13.json');
 // Staged provider does not expose public HTML until its approved window.
 // Fixture uses provider-confirmed labels and the staged contract's QIDs.
 const fixedLabel='G04 GB @ NO — fixed to GB; informational only, no pick required or editable alternative.';
 const select=html.slice(0,html.indexOf('</li>')+5).replace(/<label>[\s\S]*?<\/label>/,'<label>Participant <span>*</span></label>');
 const rows=contract.games.map(g=>{
  const [away,home]=[g.visitor[1],g.home[1]], label=g.id+' '+away+' @ '+home+' ('+away+'/'+home+')';
  const input=(team)=>'<input type="radio" name="'+g.field+'" value="'+team+'"/>';
  if(g.fixed_default==='GB')return '<li id="id_'+g.question+'" data-type="control_text"><label>'+fixedLabel+'</label><input name="'+g.field+'" readonly value="GB"/></li>';
  return '<li id="id_'+g.question+'" data-type="control_radio"><label>'+label+'</label>'+input(away)+input(home)+'</li>';
 }).join('');
 const classic=select+rows;
 const fixedInput='<input name="q6_text4" readonly value="GB"/>';
 const displayOnly=classic.replace('<label>'+fixedLabel+'</label>'+fixedInput,'<div class="form-html">'+fixedLabel+'</div>');
 for(const markup of [classic,displayOnly]){
  const parsed=readNativeFormMap(markup,plan);
  assert.deepEqual(parsed.games.map(g=>g.question),contract.games.map(g=>g.question));
  assert.equal(parsed.games[3].fixed_default,'GB');
  assert.equal(parsed.games[3].readonly_verified,true);
 }
 assert.throws(()=>readNativeFormMap(classic.replace('Participant <span>*</span>','Participant alias'),plan),/ROSTER_MISMATCH/);
 assert.throws(()=>readNativeFormMap(classic.replace('value="IBRACHO"','value="GUEST"'),plan),/ROSTER_MISMATCH/);
 assert.throws(()=>readNativeFormMap(classic.replace('readonly value="GB"','value="GB"'),plan),/FIXED_GB_INVALID/);
 assert.throws(()=>readNativeFormMap(displayOnly.replace('fixed to GB','fixed to NO'),plan),/FIXED_GB_INVALID/);
 assert.throws(()=>readNativeFormMap(classic.replace('value="KC"','value="NO"'),plan),/TEAM_OPTIONS_INVALID/);
});
test('scheduled run waits for the exact active form; does not accept stale green result',async()=>{
 const waits=[],calls=[];
 await reconcileCanonical(config,async(route,body)=>{
  calls.push({route,body});
  if(calls.length===1)throw Error('BACKEND_reconcile-capture_ACTIVE_CAPTURE_CHANGED');
  return {week:12,verified_count:5,valid_submissions:5,jotform_submissions:5,added:0};
 },async ms=>waits.push(ms));
 assert.deepEqual(waits,[5000]);
 assert.deepEqual(calls.map(x=>x.body),Array(2).fill({action:'RECONCILE',week:12,form_id:config.form_id,deadline:config.deadline}));
 await assert.rejects(reconcileCanonical(config,async()=>({ok:true,week:11,status:'CAPTURE_NOT_OPEN'})),/NOT_VERIFIED/);
});
test('a partially verified capture waits and closes incomplete at cutoff; nine complete closes early',()=>{
 const live=n=>({verified_count:n,verified_participants:roster.slice(0,n).map(name=>({name})),private_picks_count:n*16});
 assert.equal(canClose(config,live(8),Date.parse(config.deadline)-1).due,false);
 assert.deepEqual(Object.values(canClose(config,live(8),Date.parse(config.deadline))).slice(0,3),[true,false,8]);
 assert.equal(canClose(config,live(9),Date.parse(config.deadline)-1).complete,true);
});

test('Jotform REST cutoff uses Eastern standard time, exact cutoff accepted, later denied',()=>{
 const deadline='2026-11-25T22:00:00.000Z';
 const contract=assertWeekConfig({...config,deadline,timezone:'America/Mexico_City',roster,packers_locked:true,games:readNativeFormMap(html,manifest).games});
 const stats={date_invalid:0};
 const original=(created_at)=>({id:'123456789098',form_id:config.form_id,created_at,
   answers:{'21':{answer:roster[0]},'23':{answer:'LIONS'}}});
 assert.equal(requireCorrectOriginal(original('2026-11-25 16:59:59'),contract,stats).created_at,'2026-11-25T21:59:59.000Z');
 assert.equal(requireCorrectOriginal(original('2026-11-25 17:00:00'),contract,stats).created_at,deadline);
 assert.equal(requireCorrectOriginal(original('2026-11-25 17:00:01'),contract,stats),null);
 assert.equal(stats.date_invalid,1);
 for(const value of ['2026-11-25T22:00:00Z','2026-11-25T17:00:00-05:00','2026-11-25 16:00:00-0600','2026-11-25T23:00:00+01:00'])
  assert.equal(parseJotformCreatedAt(value),Date.parse(deadline));
 assert.equal(parseJotformCreatedAt('2026-11-24 19:12:35'),Date.parse('2026-11-25T00:12:35Z'));
 for(const value of ['2026-02-30 17:00:00','2026-11-25 24:00:00','2026-11-25','2026-11-25 17:00:00 EST',''])
  assert.equal(Number.isNaN(parseJotformCreatedAt(value)),true);
});

test('picks reads the closed snapshot and contract through one trusted canonical commit',async()=>{
 const pinned='a'.repeat(40);
 const calls=[];
 const request=async url=>{
  calls.push(new URL(url));
  if(url.includes('/git/ref/heads/main'))return {ok:true,json:async()=>({ref:'refs/heads/main',object:{type:'commit',sha:pinned}})};
  const window=url.includes('/'+pinned+'/')?'CLOSED':'OPEN';
  return {ok:true,json:async()=>({capture:{window}})};
 };
 const [snapshot]=await readWeekSources(12,{picks:true,request});
 assert.equal(snapshot.capture.window,'CLOSED');
 assert.equal(calls.length,4);
 assert.deepEqual(calls.slice(1).map(u=>u.pathname.split('/').slice(3)),[
  [pinned,'quiniela-control','weeks','week-12.json'],
  [pinned,'quiniela-control','weeks','week-11.json'],
  [pinned,'quiniela-control','contracts','week-12.json']
 ]);
 await assert.rejects(()=>readWeekSources(12,{picks:true,request:async()=>({ok:true,json:async()=>({ref:'refs/heads/other',object:{type:'commit',sha:pinned}})})}),/PICKS_CANONICAL_REF_INVALID/);
});

test('push uses the unchanged PMX brand for normal and diagnostic notifications',async()=>{
 const handlers={}, shown=[], receipts=[];
 const worker=new URL('../../quiniela-control/push-sw.js',import.meta.url);
 const scope='https://packersmexico.github.io/quiniela-control/';
 const logo='https://packersmexico.github.io/quiniela-control/assets/pmx-notification-icon.png';
 let activated=false;
 vm.runInNewContext(fs.readFileSync(worker,'utf8'),{
  URL,Response,
  self:{addEventListener:(type,fn)=>{handlers[type]=fn;},skipWaiting:async()=>{activated=true;},
   registration:{scope,showNotification:async(title,options)=>shown.push({title,options})}},
  caches:{open:async()=>({put:async(url,response)=>receipts.push(await response.json())})}
 });
 let done;
 handlers.install({waitUntil:p=>{done=p;}});
 await done;
 assert.equal(activated,true);
 for(const eventKey of ['W12_ASSET_READY_PICKS','DEVICE_TEST_IBRA_123']){
  handlers.push({data:{json:()=>({title:'Quiniela PMX',eventKey,url:scope})},waitUntil:p=>{done=p;}});
  await done;
  assert.equal(shown.at(-1).options.icon,logo);
  assert.equal(shown.at(-1).options.data.url,scope);
  assert.equal(receipts.at(-1).eventKey,eventKey);
 }
 assert.equal(fs.existsSync(new URL('../../quiniela-control/assets/'+logo.split('/').at(-1),import.meta.url)),true);
});

test('authorized visual push test routes only to the selected role and rejects invalid targeting',async()=>{
 const source=fs.readFileSync(new URL('../api/notify.js',import.meta.url),'utf8')
  .replace(/^import .*;$/gm,'').replace('export default async function handler','async function handler');
 const sent=[];
 const handler=vm.runInNewContext(source+'\nhandler;',{
  process:{env:{PMX_PUSH_SECRET:'qa',VAPID_PUBLIC_KEY:'public',VAPID_PRIVATE_KEY:'private'}},
  webpush:{setVapidDetails(){},sendNotification:async (sub,payload,options)=>sent.push({sub,options})},
  redis:async ([op,key])=>op==='GET'&&key.startsWith('subscription:')?JSON.stringify({subscription:key}):null,
  keys:{subscriptionFor:r=>'subscription:'+r,sentFor:r=>'sent:'+r},
  applyCors(){},json:(res,status,body)=>({status,body})
 });
 const base={eventKey:'DEVICE_TEST_STYLE',title:'QA',body:'QA',url:'https://example.test'};
 const call=data=>handler({headers:{authorization:'Bearer qa'},method:'POST',body:{...base,...data}},{});
 assert.equal((await call({testOperator:'UNKNOWN'})).status,400);
 assert.equal(sent.length,0);
 assert.equal((await call({testOperator:'IBRA'})).status,200);
 assert.equal(sent.length,1);
 assert.equal(sent[0].sub,'subscription:IBRA');
 assert.equal(sent[0].options.TTL,120);
 assert.equal((await call({})).status,200);
 assert.deepEqual(sent.slice(1).map(x=>x.sub),['subscription:RODRIGO','subscription:IBRA']);
});
