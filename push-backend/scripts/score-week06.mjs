import {redis} from '../lib/redis.js';
import {calculateWeeklyRankings,digestScores} from '../lib/weekly-rankings.js';
const BASE='https://raw.githubusercontent.com/packersmexico/packersmexico.github.io/main/quiniela-control/';
async function read(p){const r=await fetch(BASE+p+'?t='+Date.now(),{cache:'no-store'});if(!r.ok)throw Error('SOURCE_'+r.status);return r.json();}
function entries(raw){if(!Array.isArray(raw))return raw||{};const d={};for(let i=0;i<raw.length;i+=2)d[raw[i]]=JSON.parse(raw[i+1]);return d;}
if(process.env.VERCEL_ENV!=='production'){console.log('PMX_W6_SCORING_SKIP_NONPRODUCTION');}
else{
 try{
  const [w6,w5,locks]=await Promise.all([read('weeks/week-06.json'),read('weeks/week-05.json'),redis(['HGETALL','pmx:quiniela:jotform:first-valid:262845110194050'])]);
  if(w6.results?.final!==14||w5.week_number!==5||w5.results?.final!==15)throw Error('SCORES_NOT_FINAL');
  const first=entries(locks);
  if(Object.keys(first).length!==9)throw Error('LOCKS_NOT_9');
  const source=first['EL DOC'];
  if(!source||source.picks?.G08!=='PHI')throw Error('ORIGINAL_G08_NOT_PHI');
  const overlay={approved:true,original:'PHI',pick:'CAR',approved_by:'DIRECCION',reference:'github:packersmexico/packersmexico.github.io/issues/43#issuecomment-6201515761',game_id:'G08',participant:'EL DOC'};
  const key='pmx:quiniela:scoring:overlays:w6',field='EL DOC:G08';
  await redis(['HSETNX',key,field,JSON.stringify(overlay)]);
  const audit=await redis(['HGET',key,field]);
  if(!audit||JSON.stringify(JSON.parse(audit))!==JSON.stringify(overlay))throw Error('OVERLAY_CONFLICT');
  const result=calculateWeeklyRankings(w6.games,first,w5.season_standings,{[field]:overlay});
  const sum={week:6,source:'NFL_OFFICIAL_FINAL',source_url:w6.results_source,calculated_at:new Date().toISOString(),...result};
  sum.checksum=digestScores({weekly:result.weekly,season:result.season,games:w6.games.map(g=>[g.id,g.status,g.winner])});
  await redis(['SET','pmx:quiniela:scoring:week:6',JSON.stringify(sum)]);
  const readback=JSON.parse(await redis(['GET','pmx:quiniela:scoring:week:6'])||'null');
  if(!readback||readback.checksum!==sum.checksum||readback.weekly.length!==9||readback.counts.final!==14)throw Error('SCORE_READBACK_MISMATCH');
  console.log('PMX_W6_SCORING_PASS',JSON.stringify({week:6,players:9,final:result.counts.final,scored:result.counts.scored,pushes:result.counts.pushes,hash:sum.checksum,weekly:result.weekly,season:result.season,picks_visible:false}));
 }catch(e){console.error('PMX_W6_SCORING_HOLD',String(e?.message||'ERROR'));process.exitCode=1;}
}
