const BASE='https://raw.githubusercontent.com/packersmexico/packersmexico.github.io/main/quiniela-control/contracts/week-07.json';
async function get(u,key){const r=await fetch(u,{headers:{APIKEY:key,Accept:'application/json'},cache:'no-store'});const j=await r.json();if(!r.ok||Number(j.responseCode||0)!==200)throw Error('JOTFORM_API_'+r.status);return j.content;}
if(process.env.VERCEL_ENV!=='production')console.log('PMX_W7_SETUP_SKIP_NON_PRODUCTION');
else {
 try{
  const key=process.env.PMX_JOTFORM_API_KEY,token=process.env.PMX_JOTFORM_WEBHOOK_TOKEN;
  if(!key||!token)throw Error('JOTFORM_API_OR_WEBHOOK_CREDENTIAL_MISSING');
  const r=await fetch(BASE,{cache:'no-store'});if(!r.ok)throw Error('W7_CONTRACT_UNAVAILABLE');
  const cfg=await r.json(),form=String(cfg.form_id);
  const questionMap=await get('https://api.jotform.com/form/'+form+'/questions',key);
  const q=Object.fromEntries(Object.entries(questionMap||{}).map(([id,v])=>[String(id),v]));
  if(cfg.games.length!==14||Object.keys(q).length<15)throw Error('W7_14_GAMES_MISMATCH');
  const who=q['2'];if(!who||who.required!=='Yes'||String(who.options||'').split('|').length!==9)throw Error('W7_ROSTER_INVALID');
  for(const g of cfg.games){
    const x=q[g.question];if(!x||x.name!==g.field||!String(x.text||'').startsWith(g.id+' ')||x.required!=='Yes')throw Error('W7_FIELD_MAP_INVALID_'+g.id);
    const options=String(x.options||'').split('|');
    const intended=g.id==='G11'?[g.visitor[0]]:[g.visitor[0],g.home[0]];
    if(JSON.stringify(options)!==JSON.stringify(intended))throw Error('W7_PICK_OPTIONS_INVALID_'+g.id);
  }
  console.log('PMX_W7_SCHEMA_PASS',JSON.stringify({form:'W7',questions:14,roster:9,gb_fixed_game:'G11',gb_choices:1,source:'JOTFORM_API_ACTUAL_QID'}));
  const api='https://api.jotform.com/form/'+form+'/webhooks';
  const existing=await get(api,key);
  const desired='https://packersmexicogithubio-push-backend.vercel.app/api/jotform-submission?token='+encodeURIComponent(token);
  const list=Array.isArray(existing)?existing:Object.values(existing||{});
  let state='ALREADY_CONFIGURED';
  if(!list.includes(desired)){
    const body=new URLSearchParams({webhookURL:desired});
    const p=await fetch(api,{method:'POST',headers:{APIKEY:key,'Content-Type':'application/x-www-form-urlencoded'},body});
    const j=await p.json();
    if(!p.ok||Number(j.responseCode||0)!==200)throw Error('W7_WEBHOOK_REGISTRATION_FAILED_'+p.status);
    state='CREATED';
  }
  const back=await get(api,key);const after=Array.isArray(back)?back:Object.values(back||{});
  if(after.filter(v=>v===desired).length!==1)throw Error('W7_WEBHOOK_READBACK_MISMATCH');
  console.log('PMX_W7_WEBHOOK_PASS',JSON.stringify({form:'W7',state,matched:1,url_and_token_hidden:true}));
 }catch(e){console.error('PMX_W7_SETUP_HOLD',String(e?.message||'ERROR'));process.exitCode=1;}
}
