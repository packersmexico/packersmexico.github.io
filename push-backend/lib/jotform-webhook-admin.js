// Jotform webhook registration readback, with no secrets in diagnostics.
// This is separate from polling and from FIRST_VALID Redis logic.
export function classifyJotformWebhooks(content, expectedUrl) {
  if (typeof expectedUrl!=='string' || !expectedUrl.startsWith('https://')) throw Error('WEBHOOK_EXPECTED_URL_INVALID');
  let refs;
  if (Array.isArray(content)) refs=content;
  else if (content && typeof content==='object') refs=Object.values(content);
  else throw Error('WEBHOOK_PROVIDER_RESPONSE_INVALID');
  if (!refs.every(x=>typeof x==='string')) throw Error('WEBHOOK_PROVIDER_RESPONSE_INVALID');
  const expected=new URL(expectedUrl);
  if(expected.protocol!=='https:' || !expected.searchParams.get('token')) throw Error('WEBHOOK_EXPECTED_AUTH_INVALID');
  let exact=0,conflicts=0;
  for (const value of refs) {
    let u;
    try{u=new URL(value);}catch{continue;}
    if(u.origin===expected.origin && u.pathname===expected.pathname){
      if (u.href===expected.href) exact++;
      else conflicts++;
    }
  }
  if(exact>1) return {status:'HOLD_DUPLICATE_WEBHOOK',matches:exact};
  if(conflicts>0) return {status:'HOLD_CONFLICTING_WEBHOOK',matches:exact};
  if(exact===1) return {status:'REGISTERED',matches:1};
  return {status:'NEEDS_REGISTRATION',matches:0};
}
