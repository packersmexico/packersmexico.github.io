import test from 'node:test';
import assert from 'node:assert/strict';
import {milestoneEvents} from '../lib/milestone-events.js';
const defaultCfg={week_number:6,status:'OPEN',form_id:'262845110194050',form_url:'https://form.jotform.com/262845110194050',complete:0,total:9,deadline_label:'15 OCT · 16:00 CDMX'};
function games(finalCount){return Array.from({length:15},(_,i)=>({id:'G'+String(i+1).padStart(2,'0'),status:i===8?'TIE':i<finalCount?'FINAL':'SCHEDULED',winner:i===8?null:i<finalCount?'GB':null}));}
const before={week_number:5,results:{final:14,total:15,status:'LIVE',ties:1,scored:13,pushes:1},games:games(14),capture:{complete:9,total:9,window:'CLOSED'}};
function events(input){return milestoneEvents(input).map(e=>e.eventKey);}
test('W6 opening comes from active capture-config while MNF W5 is pending',()=>{
  const keys=events({data:before,captureConfig:defaultCfg});
  assert.deepEqual(keys,['W6_OPEN']); // no W5 stale 9/9
});
test('W6 open event requires a real form, valid week advance, and OPEN',()=>{
  assert.deepEqual(events({data:before,captureConfig:{...defaultCfg,form_id:''}}),[]);
  assert.deepEqual(events({data:before,captureConfig:{...defaultCfg,week_number:8}}),[]);
  assert.deepEqual(events({data:before,captureConfig:{...defaultCfg,status:'CLOSED'}}),[]);
});
test('final MNF alert fires without Figma or PNG; PUSH is decided but not scored',()=>{
  const final={...before,results:{final:15,total:15,status:'FINAL',ties:1,scored:14,pushes:1},games:games(15)};
  const keys=events({data:final,captureConfig:defaultCfg,assetIndex:{weeks:{}}});
  assert.deepEqual(keys,['W6_OPEN','W5_FINAL']);
  const all=milestoneEvents({data:final,captureConfig:defaultCfg});
  assert.match(all.find(x=>x.eventKey==='W5_FINAL').body,/14 puntuables/);
});
test('all finals need real FINALS and official winner or tie',()=>{
  const final={...before,results:{final:15,total:15,status:'FINAL',ties:1,scored:14,pushes:1},games:games(15)};
  final.games[0].status='IN_PROGRESS';
  assert(!events({data:final,captureConfig:defaultCfg}).includes('W5_FINAL'));
});
test('only verified real ready slots receive download push',()=>{
  const index={weeks:{5:{assets:{picks:{state:'READY',href:'./w5-picks-board.png'},results:{state:'READY',href:'./w5-results-live.png'},weekly:{state:'QA_PENDING',href:null},season:{state:'WAITING_EVENT',href:null}}}}};
  const keys=events({data:before,captureConfig:defaultCfg,assetIndex:index});
  assert(keys.includes('W5_ASSET_READY_RESULTS'));
  assert(!keys.some(x=>x.includes('W5_ASSET_READY_PICKS')),'Never retro-notify published W5 picks');
  assert(!keys.some(x=>x.includes('W5_ASSET_READY_WEEKLY')));
  assert(!keys.some(x=>x.includes('PUBLISHED')),'Download is NOT social publication');
});
test('publication event requires explicit slot-level real production approval and evidence, week>=6',()=>{
  const data={week_number:6,results:{final:0,total:14,status:'SCHEDULED'},games:Array.from({length:14},()=>({status:'SCHEDULED'}))};
  const index={weeks:{6:{assets:{picks:{state:'READY',href:'./w6-picks-board.png'}}}}};
  const missing={6:{asset_approvals:{picks:{distribution:'PUBLISHED_USER_CONFIRMED',figma_qa:'PASS',direction_review:'PASS',export_verified:true}}}};
  assert(!events({data,captureConfig:defaultCfg,assetIndex:index,stages:missing}).includes('W6_PUBLISHED_PICKS'));
  const stages={6:{asset_approvals:{picks:{distribution:'PUBLISHED_USER_CONFIRMED',figma_qa:'PASS',direction_review:'PASS',export_verified:true,evidence:'Direction user confirmed post + timestamp'}}}};
  const keys=events({data,captureConfig:defaultCfg,assetIndex:index,stages});
  assert(keys.includes('W6_ASSET_READY_PICKS'));
  assert(keys.includes('W6_PUBLISHED_PICKS'));
  assert(keys.filter(x=>x==='W6_PUBLISHED_PICKS').length===1);
});
test('when 9/9 locked, notify separately; no W5 captures replay',()=>{
  const cfg={...defaultCfg,status:'CLOSED',complete:9,locked_submissions:Object.fromEntries(Array.from({length:9},(_,i)=>['P'+i,{status:'LOCKED_FIRST_VALID'}]))};
  assert(events({data:before,captureConfig:cfg}).includes('W6_9OF9'));
  assert(!events({data:before,captureConfig:{...cfg,locked_submissions:{}}}).includes('W6_9OF9'));
});
test('no picks, submission identity or PII in broadcast milestone body',()=>{
  const out=milestoneEvents({data:before,captureConfig:defaultCfg});
  for(const item of out){assert(!item.body.includes('picks:['));assert(!item.body.includes('submissionID'));assert(item.url.startsWith('https://packersmexico.github.io/'));}
});

test('newly verified participant produces exactly one safe operator notice, no private picks',()=>{
  const cfg={...defaultCfg,complete:3,total:9,submission_integrity:{received_names:['LALO','IBRACHO','JENNI'],recently_verified_names:['JENNI']}};
  const alerts=milestoneEvents({data:before,captureConfig:cfg});
  const specific=alerts.filter(x=>x.eventKey==='W6_FORM_VERIFIED_JENNI');
  assert.equal(specific.length,1);
  assert.match(specific[0].body,/JENNI completó/);
  assert(!specific[0].body.includes('picks:['));
  assert(!alerts.some(x=>x.eventKey==='W6_FORM_VERIFIED_LALO'));
});

test('W8 can open while W7 MNF is pending only if W7 is already 9/9 CLOSED',()=>{
  const data={week_number:6,results:{final:14,total:14,status:'FINAL'},games:Array.from({length:14},()=>({status:'FINAL',winner:'GB'}))};
  const cfg={week_number:8,status:'OPEN',form_id:'262986491498075',form_url:'https://form.jotform.com/262986491498075',complete:0,total:9,deadline_label:'29 OCT · 16:00 CDMX'};
  const index={weeks:{7:{capture:{complete:9,total:9,window:'CLOSED'},results:{final:13,total:14}}}};
  const valid=milestoneEvents({data,captureConfig:cfg,assetIndex:index});
  assert.equal(valid.filter(x=>x.eventKey==='W8_OPEN').length,1);
  assert.match(valid.find(x=>x.eventKey==='W8_OPEN').url,/\/captura\/$/);
  assert(!events({data,captureConfig:cfg,assetIndex:{weeks:{}}}).includes('W8_OPEN'));
  const incomplete={weeks:{7:{capture:{complete:8,total:9,window:'OPEN'},results:{final:13,total:14}}}};
  assert(!events({data,captureConfig:cfg,assetIndex:incomplete}).includes('W8_OPEN'));
  assert(!events({data,captureConfig:{...cfg,week_number:9},assetIndex:index}).includes('W9_OPEN'));
});
