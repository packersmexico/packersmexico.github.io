import test from 'node:test';
import assert from 'node:assert/strict';
import {readNativeFormMap} from '../lib/jotform-native-form.js';
import {assertWeekConfig,validateWeeklyPicks} from '../lib/weekly-capture.js';
import {reconcileCanonical,canClose} from '../../scripts/quiniela-season-cycle.mjs';

const roster=['EL DOC','ARI','LALO','ALEX','LUIS C.','DR PALMA','JENNI','RODRI','IBRACHO'];
const manifest={roster,games:[
 {id:'G01',matchup:'GB @ LAR',away:'GB',away_name:'PACKERS',home:'LAR',home_name:'RAMS',fixed_pick:'GB'},
 {id:'G02',matchup:'CHI @ DET',away:'CHI',away_name:'BEARS',home:'DET',home_name:'LIONS'}
]};
const html=`<li id="id_21" data-type="control_dropdown"><label><span>Participante</span></label>
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
