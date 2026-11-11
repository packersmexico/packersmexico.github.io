import assert from 'node:assert/strict';
import test from 'node:test';
import {classifyJotformWebhooks} from '../lib/jotform-webhook-admin.js';

const key='test-secret-DO-NOT-LOG';
const desired='https://packersmexicogithubio-push-backend.vercel.app/api/jotform-submission?token='+key;
test('preexisting authenticated webhook is recognized, not registered twice',()=>{
  assert.deepEqual(classifyJotformWebhooks({0:'https://other.example/cb',1:desired},desired),
    {status:'REGISTERED',matches:1});
});
test('missing endpoint would be registered exactly once',()=>{
  assert.deepEqual(classifyJotformWebhooks({0:'https://other.example/cb'},desired),
    {status:'NEEDS_REGISTRATION',matches:0});
  assert.deepEqual(classifyJotformWebhooks([],desired),
    {status:'NEEDS_REGISTRATION',matches:0});
});
test('same endpoint with another token fails closed rather than duplicate',()=>{
  const wrong=desired.replace(key,'old-or-unknown-token');
  const result=classifyJotformWebhooks([wrong],desired);
  assert.equal(result.status,'HOLD_CONFLICTING_WEBHOOK');
  assert(!JSON.stringify(result).includes(key));
  assert(!JSON.stringify(result).includes('old-or-unknown-token'));
});
test('duplicate exact webhooks fail closed',()=>{
  assert.deepEqual(classifyJotformWebhooks([desired,desired],desired),
    {status:'HOLD_DUPLICATE_WEBHOOK',matches:2});
});
test('unknown webhook URL entries never become implicitly authorized',()=>{
  assert.equal(classifyJotformWebhooks(['not a url'],desired).status,'NEEDS_REGISTRATION');
  assert.throws(()=>classifyJotformWebhooks({0:{callback:desired}},desired),/PROVIDER_RESPONSE/);
  assert.throws(()=>classifyJotformWebhooks(null,desired),/PROVIDER_RESPONSE/);
});
test('recipient must be HTTPS with token, not an open anonymous webhook',()=>{
  assert.throws(()=>classifyJotformWebhooks([],desired.replace('https:','http:')),/EXPECTED_URL/);
  assert.throws(()=>classifyJotformWebhooks([],desired.split('?')[0]),/EXPECTED_AUTH/);
});
