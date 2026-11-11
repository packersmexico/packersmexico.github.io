import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseJotformCredential} from '../lib/jotform-credentials.js';
const read='FAKE_READONLY_KEY';
const control='FAKE_FULLACCESS_CONTROL_KEY';
const get=(path,method='GET',withControl=true)=>chooseJotformCredential({path,method,readKey:read,controlKey:withControl?control:''});
test('first-valid submission reads use existing read-only credential',()=>{
  assert.equal(get('/form/263078323388060/submissions?limit=20'),read);
  assert.equal(get('/form/263078323388060/questions'),read);
  assert.equal(get('/form/263078323388060'),read);
  assert.equal(get('/user'),read);
});
test('webhook management and provider form mutations use isolated control key',()=>{
  assert.equal(get('/form/263078323388060/webhooks'),control);
  assert.equal(get('/form/263078323388060/webhooks','POST'),control);
  assert.equal(get('/form/263078323388060/properties','POST'),control);
  assert.equal(get('/form/263078323388060/question/10','POST'),control);
  assert.equal(get('/user/forms','POST'),control);
});
test('existing key compatibility remains until dedicated key is provisioned',()=>{
  assert.equal(get('/form/263078323388060/webhooks','GET',false),read);
  assert.equal(get('/form/263078323388060/properties','POST',false),read);
});
test('credential routing cannot expose any key or token by itself',()=>{
  assert.equal(chooseJotformCredential({path:'/form/263078323388060/submissions',readKey:'',controlKey:control}),control);
  assert.equal(chooseJotformCredential({path:'/form/263078323388060/webhooks',readKey:'',controlKey:''}), '');
});
