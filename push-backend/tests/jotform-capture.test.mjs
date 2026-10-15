import test from 'node:test';
import assert from 'node:assert/strict';
import {parseRawRequest,resolveParticipant,validateWeek6Submission,week6Games} from '../lib/jotform-capture.js';

const roster=new Set(['EL DOC','ARI','LALO','ALEX','LUIS C.','DR PALMA','JENNI','RODRI','IBRACHO']);
function validRaw(name='RODRI'){
  const raw={q2_dropdown0:name};
  for(const g of week6Games) raw[g.field]=g.home[0];
  return raw;
}

test('resolves canonical participant and validates exactly 14 games',()=>{
  const raw=validRaw();
  assert.equal(resolveParticipant(raw,roster),'RODRI');
  const result=validateWeek6Submission(raw);
  assert.equal(result.valid,true);
  assert.equal(Object.keys(result.picks).length,14);
  assert.deepEqual(result.missing_or_invalid,[]);
});

test('partial submission never becomes first-valid',()=>{
  const raw=validRaw('EL DOC');
  delete raw.q9_radio7;
  const result=validateWeek6Submission(raw);
  assert.equal(result.valid,false);
  assert.deepEqual(result.missing_or_invalid,['G07']);
});

test('rawRequest JSON string is accepted without exposing extra fields',()=>{
  const raw=parseRawRequest(JSON.stringify(validRaw('JENNI')));
  assert.equal(resolveParticipant(raw,roster),'JENNI');
  assert.equal(validateWeek6Submission(raw).valid,true);
});

test('unknown team answer is rejected',()=>{
  const raw=validRaw('ALEX');
  raw.q3_radio1='NOT A TEAM';
  assert.equal(validateWeek6Submission(raw).valid,false);
});
