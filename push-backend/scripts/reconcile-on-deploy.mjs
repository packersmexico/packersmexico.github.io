// Executed exclusively during the existing production Vercel backend deploy.
// Calls the already authenticated POST handler in-process: secrets/picks never
// leave the backend environment or the private Redis/Jotform connections.
if(process.env.VERCEL_ENV !== 'production'){
  console.log('PMX_W6_PRIVATE_RECONCILE: SKIP_NON_PRODUCTION');
}else if(!process.env.PMX_RECONCILE_SECRET || !process.env.PMX_JOTFORM_API_KEY){
  console.log('PMX_W6_PRIVATE_RECONCILE: HOLD_CREDENTIALS_UNAVAILABLE');
}else{
  const {default:handler}=await import('../api/reconcile-week-06.js');
  let code=0,body=null;
  const res={setHeader(){return this},status(n){code=n;return this},json(v){body=v;return this}};
  const req={method:'POST',headers:{authorization:'Bearer '+process.env.PMX_RECONCILE_SECRET}};
  try{
    await handler(req,res);
    console.log('PMX_W6_PRIVATE_RECONCILE',JSON.stringify({
      http:code,complete_records:body?.complete_records??null,
      private_picks_count:body?.private_picks_count??null,
      integrity:body?.integrity??'UNKNOWN',
      notifications_sent:body?.notifications_sent??null,
      failed:body?.outcome?.failed??null
    }));
    if(code!==200||body?.integrity!=='COMPLETE'||body?.complete_records!==9||body?.private_picks_count!==126)
      process.exitCode=1;
  }catch(e){
    console.error('PMX_W6_PRIVATE_RECONCILE: FAILED',String(e?.message||'ERROR').replace(/\d{10,}/g,'[REDACTED]'));
    process.exitCode=1;
  }
}
