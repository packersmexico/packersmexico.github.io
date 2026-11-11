// Add/verify native Jotform webhooks only when provider credentials permit it.
// Runs inside the existing authenticated reconciliation endpoint. Does NOT handle
// any picks, mutate forms/questions, or disable scheduled FIRST_VALID polling.
// Never log or return the token or callback URL containing it.
const CALLBACK_ORIGIN='https://packersmexicogithubio-push-backend.vercel.app';
const CALLBACK_PATH='/api/jotform-submission';

function webhookUrl(token){
  const url=new URL(CALLBACK_PATH,CALLBACK_ORIGIN);
  url.searchParams.set('token',token);
  return url.toString();
}
function isSameCallback(u){
  try{
    const parsed=new URL(u);
    return parsed.origin===CALLBACK_ORIGIN&&parsed.pathname===CALLBACK_PATH;
  }catch{return false;}
}
function webhookList(content){
  if(Array.isArray(content))return content.filter(x=>typeof x==='string');
  if(content&&typeof content==='object')return Object.values(content).filter(x=>typeof x==='string');
  throw Error('PROVIDER_WEBHOOK_LIST_INVALID');
}
function providerError(e){
  const msg=String(e?.message||'');
  if(msg==='JOTFORM_API_401'||msg==='JOTFORM_API_403'||
     msg==='JOTFORM_API_REJECTED_401'||msg==='JOTFORM_API_REJECTED_403')
    return {status:'PROVIDER_WEBHOOK_PERMISSION_HOLD',configured:false,
      permission:'JOTFORM_API_KEY_FULL_ACCESS_REQUIRED',
      provider_status:msg.endsWith('401')?401:403};
  return null;
}
export async function ensureActiveWebhook({formId,token,fetchWebhookList,createWebhook}){
  if(!/^\d{10,25}$/.test(String(formId||'')))
    return {status:'INVALID_FORM',configured:false};
  if(typeof token!=='string'||token.length<16)
    return {status:'CALLBACK_SECRET_NOT_CONFIGURED',configured:false};
  if(typeof fetchWebhookList!=='function'||typeof createWebhook!=='function')
    throw Error('WEBHOOK_PROVIDER_ADAPTER_REQUIRED');
  const path='/form/'+formId+'/webhooks';
  let list;
  try{list=webhookList(await fetchWebhookList(path));}
  catch(e){
    const rejected=providerError(e);
    if(rejected)return rejected;
    throw e;
  }
  const desired=webhookUrl(token);
  const canonical=list.filter(isSameCallback);
  const matches=canonical.filter(x=>x===desired);
  if(matches.length===1&&canonical.length===1)
    return {status:'ALREADY_CONFIGURED',configured:true,verified:true,
      provider_webhook_count:1};
  if(canonical.length>0)
    return {status:'HOLD_EXISTING_CALLBACK_CONFLICT',configured:false,
      provider_webhook_count:canonical.length};
  // Strictly one new callback, only if no PMX callback exists on the provider.
  try{await createWebhook(path,{webhookURL:desired});}
  catch(e){
    const rejected=providerError(e);
    if(rejected)return rejected;
    throw e;
  }
  let reread;
  try{reread=webhookList(await fetchWebhookList(path));}
  catch(e){
    const rejected=providerError(e);
    if(rejected)return {...rejected,status:'HOLD_CREATED_UNVERIFIED_PERMISSION'};
    throw e;
  }
  const after=reread.filter(isSameCallback);
  if(after.length!==1||after[0]!==desired)
    return {status:'HOLD_READBACK_MISMATCH',configured:false,provider_webhook_count:after.length};
  return {status:'CREATED_AND_VERIFIED',configured:true,verified:true,
    provider_webhook_count:1};
}
