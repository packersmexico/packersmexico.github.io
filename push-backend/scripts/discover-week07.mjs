// Discover Jotform-generated question IDs without creating sample submissions.
if(process.env.VERCEL_ENV==='production'&&process.env.PMX_JOTFORM_API_KEY){
 try{
 const r=await fetch('https://api.jotform.com/form/262923769438068/questions',{headers:{APIKEY:process.env.PMX_JOTFORM_API_KEY,Accept:'application/json'},cache:'no-store'});
 const j=await r.json();
 if(!r.ok||Number(j.responseCode)!==200)throw Error('JOTFORM_QUESTIONS_HTTP_'+r.status);
 const fields=Object.entries(j.content||{}).map(([qid,q])=>({qid,name:q.name,text:String(q.text||'').slice(0,110),type:q.type,required:q.required,options:String(q.options||'').slice(0,110),readOnly:q.readOnly})).filter(q=>q.text.startsWith('G')||q.text==='Participante');
 console.log('PMX_W7_QUESTION_MAP',JSON.stringify({form:'W7',count:fields.length,fields}));
 }catch(e){console.warn('PMX_W7_QUESTION_MAP_HOLD',String(e?.message||'ERROR'));}
}
