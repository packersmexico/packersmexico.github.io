// PMX Quiniela · deterministic operator-only progress and closing-day recap.
// No picks, submission IDs, tokens or snapshots are included in notifications.
// Called by the ONE existing milestone-sync endpoint; never publishes to socials.
export const ROSTER = Object.freeze(['EL DOC','ARI','LALO','ALEX','LUIS C.','DR PALMA','JENNI','RODRI','IBRACHO']);
const PANEL='https://packersmexico.github.io/quiniela-control/';
const CAPTURE=PANEL+'captura/';
const LEGACY_W9_PRE_AUTOMATION=new Set(['IBRACHO','JENNI','EL DOC','LALO']);

const norm = x => String(x||'').trim().replace(/\s+/g,' ').toUpperCase();
const slug = x => norm(x).replace(/[^A-Z0-9]+/g,'_').replace(/^_|_$/g,'').slice(0,28);
function mexico(instant) {
  const parts=new Intl.DateTimeFormat('en-US',{
    timeZone:'America/Mexico_City',year:'numeric',month:'2-digit',day:'2-digit',
    hour:'2-digit',minute:'2-digit',hourCycle:'h23'
  }).formatToParts(new Date(instant));
  const value=Object.fromEntries(parts.filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
  return {
    date:value.year+'-'+value.month+'-'+value.day,
    ymd:value.year+value.month+value.day,
    hour:Number(value.hour),minute:Number(value.minute),
    hhmm:value.hour+value.minute,clock:value.hour+':'+value.minute
  };
}
function parseRows(rows) {
  if(!Array.isArray(rows)||rows.length%2!==0)return null;
  const out={};
  for(let i=0;i<rows.length;i+=2){
    const key=norm(rows[i]);
    if(key in out)return null;
    try {out[key]=JSON.parse(rows[i+1]);}
    catch{return null;}
  }
  return out;
}
export function planCaptureProgress({config,snapshot,rawFirstValid,now=new Date()}={}) {
  const hold=reason=>({status:'HOLD_'+reason,events:[],verified:0,pending:[]});
  const week=Number(config?.week_number);
  const form=String(config?.form_id||'');
  const window=String(config?.status||'').toUpperCase();
  if(!Number.isInteger(week)||week<9||week>18||!['OPEN','CLOSED'].includes(window))return hold('INACTIVE');
  if(!/^\d{10,25}$/.test(form))return hold('INVALID_FORM');
  const games=snapshot?.games||[];
  if(snapshot?.week_number!==week||String(snapshot?.capture?.form_id||'')!==form||
     games.length<13||games.length>16)return hold('SNAPSHOT');
  const roster=(snapshot.participants||[]).map(p=>norm(p.name));
  if(roster.length!==9||JSON.stringify(roster)!==JSON.stringify(ROSTER))return hold('ROSTER');
  const records=parseRows(rawFirstValid);
  if(!records)return hold('REDIS_RECORDS');
  if(Object.keys(records).some(name=>!ROSTER.includes(name)))return hold('UNKNOWN_PARTICIPANT');
  const valid=[];
  for(const name of ROSTER){
    if(!(name in records))continue;
    const row=records[name];
    if(row?.participant!==name||!row.submission_id||!row.picks||
       Array.isArray(row.picks)||Object.keys(row.picks).length!==games.length)return hold('INVALID_FIRST_VALID');
    if(!games.every(g=>{
      const choices=String(g.matchup||'').split('@').map(x=>x.trim());
      return choices.length===2 && choices.includes(row.picks[g.id]);
    }))return hold('INVALID_PICK_MATRIX');
    valid.push(name);
  }
  const pending=ROSTER.filter(n=>!valid.includes(n));
  const deadline=Date.parse(config.deadline||'');
  const moment=Number(new Date(now));
  if(!Number.isFinite(deadline)||!Number.isFinite(moment))return hold('DEADLINE');
  const local=mexico(moment),due=mexico(deadline);
  const fresh=moment<=deadline+12*3600000;
  const events=[];
  if(fresh && valid.length) {
    for(const name of valid){
      // W9 had four submissions before recurrent alerts were introduced.
      // Do not bombard devices with historical first-valid notifications.
      if(week===9 && LEGACY_W9_PRE_AUTOMATION.has(name))continue;
      const key='W'+week+'_FIRST_VALID_'+slug(name); // matches authenticated Jotform webhook
      const remaining=pending.length ? pending.join(', ') : 'ninguno';
      events.push({
        eventKey:key,
        title:'PACKERS MÉXICO · QUINIELA W'+week+' · NUEVO REGISTRO',
        body:name+' registró sus picks. Van '+valid.length+'/9; faltan '+pending.length+': '+remaining+'.',
        url:PANEL,tag:'pmx-w'+week+'-valid-'+slug(name).toLowerCase()
      });
    }
  }
  // GitHub's existing */10 cron attempts at 10:00, 10:10... CDMX.
  // Same eventKey as a manually delivered reminder ensures no duplicate in W9.
  if(local.date===due.date && local.hour===10 && moment<deadline) {
    const key='W'+week+'_CLOSE_REMINDER_'+due.ymd+'_'+due.hhmm;
    events.push({
      eventKey:key,
      title:'PACKERS MÉXICO · QUINIELA W'+week+' · CIERRE HOY',
      body:'Registrados: '+valid.length+'/9. Faltan: '+pending.length+
        (pending.length?' — '+pending.join(', '):' — ninguno')+
        '. Cierre hoy '+due.clock+' CDMX.'+
        (pending.length?' Envía tus picks.':' Captura completa.'),
      url:pending.length?CAPTURE:PANEL,
      tag:'pmx-quiniela-w'+week+'-closing-'+due.ymd
    });
  }
  if(events.some(x=>x.body.length>240||x.title.length>100))return hold('NOTIFICATION_FIT');
  return {status:'PASS',week,verified:valid.length,pending,events};
}
