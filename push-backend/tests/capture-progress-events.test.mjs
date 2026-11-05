import test from 'node:test';
import assert from 'node:assert/strict';
import {planCaptureProgress,ROSTER} from '../lib/capture-progress-events.js';

const games=Array.from({length:15},(_,i)=>({
  id:'G'+String(i+1).padStart(2,'0'),matchup:'GB @ NE'
}));
const form='263063334940050';
function record(name){
  return {participant:name,submission_id:'263000000000001',
    picks:Object.fromEntries(games.map(g=>[g.id,'GB']))};
}
function rows(names){
  return names.flatMap(n=>[n,JSON.stringify(record(n))]);
}
function fixture(week=9,names=['IBRACHO','JENNI','EL DOC','LALO'],utc='2026-11-05T16:01:00Z'){
  const config={week_number:week,form_id:form,status:'OPEN',
    deadline:week===9?'2026-11-05T16:00:00-06:00':'2026-11-12T16:00:00-06:00'};
  const snapshot={week_number:week,capture:{form_id:form},
    participants:ROSTER.map(name=>({name})),games};
  return planCaptureProgress({config,snapshot,rawFirstValid:rows(names),now:new Date(utc)});
}
test('W9 existing 4 FIRST_VALID are not burst-notified on feature activation',()=>{
  const r=fixture(9,undefined,'2026-11-05T15:59:00Z');
  assert.equal(r.status,'PASS');
  assert.equal(r.verified,4);
  assert.equal(r.pending.length,5);
  assert.deepEqual(r.events,[]);
});
test('one newly verified W9 participant receives one live-count push including missing names',()=>{
  const r=fixture(9,['IBRACHO','JENNI','EL DOC','LALO','ARI'],'2026-11-05T16:09:00Z');
  assert.equal(r.events.length,2); // ARI + 10AM recap
  const entry=r.events.find(e=>e.eventKey==='W9_FIRST_VALID_ARI');
  assert.match(entry.body,/ARI registró sus picks/);
  assert.match(entry.body,/5\/9; faltan 4/);
  assert.match(entry.body,/ALEX, LUIS C\., DR PALMA, RODRI/);
  assert(!JSON.stringify(entry).includes('submission_id'));
  assert(!JSON.stringify(entry).includes('G01'));
});
test('W9 recap reuses manual idempotency event key, 10AM Mexico only',()=>{
  const r=fixture();
  const recap=r.events.find(e=>e.eventKey==='W9_CLOSE_REMINDER_20261105_1600');
  assert(recap);
  assert.match(recap.body,/Registrados: 4\/9/);
  assert.match(recap.body,/Faltan: 5/);
  assert.match(recap.body,/ARI, ALEX, LUIS C\., DR PALMA, RODRI/);
  assert(!fixture(9,undefined,'2026-11-05T15:59:00Z').events.some(e=>e.eventKey.includes('CLOSE_REMINDER')));
  assert(!fixture(9,undefined,'2026-11-05T17:01:00Z').events.some(e=>e.eventKey.includes('CLOSE_REMINDER')));
  assert(!fixture(9,undefined,'2026-11-05T22:01:00Z').events.some(e=>e.eventKey.includes('CLOSE_REMINDER')));
});
test('W10 emits one event per distinct FIRST_VALID, without historical skip',()=>{
  const r=fixture(10,['IBRACHO','RODRI'],'2026-11-12T15:50:00Z');
  assert.deepEqual(r.events.map(e=>e.eventKey),['W10_FIRST_VALID_RODRI','W10_FIRST_VALID_IBRACHO']);
  for(const event of r.events){assert.match(event.body,/Van 2\/9; faltan 7/);}
});
test('W10 10AM recap works dynamically, zero submissions and 9/9 completeness',()=>{
  const zero=fixture(10,[],'2026-11-12T16:01:00Z');
  assert.equal(zero.events.length,1);
  assert.equal(zero.events[0].eventKey,'W10_CLOSE_REMINDER_20261112_1600');
  assert.match(zero.events[0].body,/Registrados: 0\/9/);
  assert.equal(zero.events[0].body.length<=240,true);
  const all=fixture(10,ROSTER,'2026-11-12T16:01:00Z');
  assert.equal(all.pending.length,0);
  assert.match(all.events.at(-1).body,/Faltan: 0/);
});
test('fail closed on noncanonical form, wrong snapshot, malformed or incomplete private selections',()=>{
  const f=fixture(10,['ARI'],'2026-11-12T16:01:00Z');
  assert.equal(f.status,'PASS');
  const wrong=planCaptureProgress({config:{week_number:10,form_id:form,status:'OPEN',deadline:'2026-11-12T16:00:00-06:00'},
    snapshot:{week_number:10,capture:{form_id:'1234567890000'},participants:ROSTER.map(name=>({name})),games},
    rawFirstValid:rows(['ARI']),now:new Date('2026-11-12T16:01:00Z')});
  assert.match(wrong.status,/HOLD/); assert.equal(wrong.events.length,0);
  const bad=rows(['ARI']);
  bad[1]=JSON.stringify({...record('ARI'),picks:{G01:'GB'}});
  const invalid=planCaptureProgress({config:{week_number:10,form_id:form,status:'OPEN',deadline:'2026-11-12T16:00:00-06:00'},
    snapshot:{week_number:10,capture:{form_id:form},participants:ROSTER.map(name=>({name})),games},
    rawFirstValid:bad,now:new Date('2026-11-12T16:01:00Z')});
  assert.equal(invalid.status,'HOLD_INVALID_FIRST_VALID');
  assert.equal(invalid.events.length,0);
});
