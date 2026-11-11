import test from 'node:test';
import assert from 'node:assert/strict';
import {ensureActiveWebhook} from '../lib/jotform-webhook-ensure.js';

const formId='263078323388060';
const token='TEST_FAKE_NOT_A_REAL_SECRET_1234';
const endpoint='https://packersmexicogithubio-push-backend.vercel.app/api/jotform-submission?token='+encodeURIComponent(token);
const adapter=(hooks=[])=>{
  let adds=0;
  return {
    get fetchWebhookList(){return async()=>Object.fromEntries(hooks.map((url,i)=>[i,url]));},
    get createWebhook(){return async(_path,body)=>{hooks.push(body.webhookURL);adds++;return hooks;};},
    get adds(){return adds;},get hooks(){return hooks;}
  };
};
test('existing authorized callback is read back without rewriting or duplicating',async()=>{
  const io=adapter([endpoint]);
  const result=await ensureActiveWebhook({formId,token,...io});
  assert.equal(result.status,'ALREADY_CONFIGURED');
  assert.equal(result.verified,true);
  assert.equal(io.adds,0);
  assert(!JSON.stringify(result).includes(token));
});
test('missing callback gets created exactly once and verified, not published to logs',async()=>{
  const io=adapter(['https://another-service.example/handler']);
  const result=await ensureActiveWebhook({formId,token,...io});
  assert.equal(result.status,'CREATED_AND_VERIFIED');
  assert.equal(io.adds,1);
  assert.equal(io.hooks.length,2);
  assert(!JSON.stringify(result).includes(token));
  assert(!JSON.stringify(result).includes(endpoint));
  const again=await ensureActiveWebhook({formId,token,...io});
  assert.equal(again.status,'ALREADY_CONFIGURED');
  assert.equal(io.adds,1);
});
test('provider 403 is reported as nonfatal permission HOLD without POST or picks',async()=>{
  let writes=0;
  const result=await ensureActiveWebhook({formId,token,
    fetchWebhookList:async()=>{throw Error('JOTFORM_API_403');},
    createWebhook:async()=>{writes++;}});
  assert.equal(result.status,'PROVIDER_WEBHOOK_PERMISSION_HOLD');
  assert.equal(result.provider_status,403);
  assert.equal(result.configured,false);
  assert.equal(writes,0);
  assert(!JSON.stringify(result).includes(token));
});
test('401 and provider rejected 403 are handled without assuming a credential upgrade',async()=>{
  for(const msg of ['JOTFORM_API_401','JOTFORM_API_REJECTED_403']){
    const result=await ensureActiveWebhook({formId,token,
      fetchWebhookList:async()=>{throw Error(msg);},
      createWebhook:async()=>{throw Error('MUST_NOT_BE_CALLED');}});
    assert.equal(result.status,'PROVIDER_WEBHOOK_PERMISSION_HOLD');
  }
});
test('preexisting PMX callback with different token fails closed rather than duplicating',async()=>{
  const io=adapter(['https://packersmexicogithubio-push-backend.vercel.app/api/jotform-submission?token=REDACTED_OLD_TOKEN']);
  const result=await ensureActiveWebhook({formId,token,...io});
  assert.equal(result.status,'HOLD_EXISTING_CALLBACK_CONFLICT');
  assert.equal(result.configured,false);
  assert.equal(io.adds,0);
});
test('duplicate identical provider callbacks require review, do not mutate',async()=>{
  const io=adapter([endpoint,endpoint]);
  const result=await ensureActiveWebhook({formId,token,...io});
  assert.equal(result.status,'HOLD_EXISTING_CALLBACK_CONFLICT');
  assert.equal(io.adds,0);
});
test('reject invalid form/token without contacting the provider',async()=>{
  const io=adapter();
  assert.equal((await ensureActiveWebhook({formId:'oops',token,...io})).status,'INVALID_FORM');
  assert.equal((await ensureActiveWebhook({formId,token:'',...io})).status,'CALLBACK_SECRET_NOT_CONFIGURED');
  assert.equal(io.adds,0);
});
test('unrelated API failures still report an error, never fake READY',async()=>{
  await assert.rejects(
    ensureActiveWebhook({formId,token,fetchWebhookList:async()=>{throw Error('JOTFORM_API_500');},
      createWebhook:async()=>{}}),
    /JOTFORM_API_500/
  );
});
test('provider-created callback must be verified by a second live GET',async()=>{
  let calls=0,adds=0;
  const result=await ensureActiveWebhook({formId,token,
    fetchWebhookList:async()=>{calls++;return {};},
    createWebhook:async()=>{adds++;}});
  assert.equal(result.status,'HOLD_READBACK_MISMATCH');
  assert.equal(result.configured,false);
  assert.equal(calls,2);
  assert.equal(adds,1);
});
