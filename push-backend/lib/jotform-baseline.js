import crypto from 'node:crypto';

const W6_FORM_ID='262845110194050';

function parseBaseline(){
  try{
    const raw=process.env.PMX_W6_BASELINE_FIRST_VALID;
    if(!raw) return [];
    const data=JSON.parse(raw);
    return Array.isArray(data)?data:[];
  }catch{
    return [];
  }
}

export async function seedW6Baseline(redis,formID,roster){
  if(String(formID)!==W6_FORM_ID) return {configured:false,seeded:0,total:0};
  const rows=parseBaseline();
  try { const completed=JSON.parse(process.env.PMX_W6_FINAL_FIRST_VALID||'[]'); if(Array.isArray(completed))rows.push(...completed); } catch { /* no private recovery baseline */ }
  const ari=String(process.env.PMX_W6_ARI_SUBMISSION_ID||'').trim();
  if(/^\d{10,25}$/.test(ari))rows.push({name:'ARI',submission_id:ari});
  if(!rows.length) return {configured:false,seeded:0,total:0};
  const key=`pmx:quiniela:jotform:first-valid:${formID}`;
  let seeded=0,accepted=0;
  for(const row of rows){
    const name=String(row?.name||'').trim().replace(/\s+/g,' ').toUpperCase();
    const sid=String(row?.submission_id||'').trim();
    if(!name||!/^\d{10,25}$/.test(sid)||(roster&& !roster.has(name))) continue;
    accepted++;
    const hash=crypto.createHash('sha256').update(sid).digest('hex').slice(0,12).toUpperCase();
    const record=JSON.stringify({
      participant:name,
      submission_id:sid,
      submission_hash:hash,
      received_at:new Date().toISOString(),
      submitted_at:null,
      integrity:'14_OF_14_AUDITED_BASELINE',
      picks:null,
      source:'JOTFORM_CONNECTOR_AUDIT_BASELINE'
    });
    const saved=await redis(['HSETNX',key,name,record]);
    if(Number(saved)===1) seeded++;
  }
  return {configured:true,seeded,total:accepted};
}
