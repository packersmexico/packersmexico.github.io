// PMX · Existing Quiniela backend: authenticated, week-agnostic private scoring.
// Does NOT expose individual picks or publish any image/social post.
import crypto from 'node:crypto';
import { redis } from '../lib/redis.js';
import { calculateWeeklyRankings, digestScores } from '../lib/weekly-rankings.js';
import { json, rejectMethod } from '../lib/http.js';
const BASE='https://raw.githubusercontent.com/packersmexico/packersmexico.github.io/main/quiniela-control/';
const safeEqual=(a,b)=>{
 const x=Buffer.from(String(a||'')),y=Buffer.from(String(b||''));
 return x.length>0&&x.length===y.length&&crypto.timingSafeEqual(x,y);
};
async function read(p){
 const r=await fetch(BASE+p+'?t='+Date.now(),{cache:'no-store'});
 if(!r.ok)throw Error('SOURCE_'+r.status);
 return r.json();
}

async function verifiedGitHubRead(path){
 // Authoritative origin fallback when raw.githubusercontent's main ref is stale
 // immediately after the season-transition commit. Public JSON only.
 const url='https://api.github.com/repos/packersmexico/packersmexico.github.io/contents/quiniela-control/'+path+'?ref=main';
 const r=await fetch(url,{cache:'no-store',headers:{
  Accept:'application/vnd.github+json',
  'User-Agent':'PMX-Quiniela-Scoring-Certification-Readback'
 }});
 if(!r.ok)throw Error('CANONICAL_GITHUB_API_'+r.status);
 const payload=await r.json();
 if(payload.type!=='file'||payload.encoding!=='base64'||!payload.content)
  throw Error('CANONICAL_GITHUB_API_PAYLOAD');
 return JSON.parse(Buffer.from(payload.content.replace(/\s+/g,''),'base64').toString('utf8'));
}
function captureCertified(snapshot,contract){
 return String(snapshot?.capture?.form_id)===String(contract?.form_id)&&
  String(snapshot?.capture?.window).toUpperCase()==='CLOSED'&&
  Number(snapshot?.capture?.complete)===contract?.roster?.length;
}
function parseHash(raw){
 if(raw==null)return {};
 const e=Array.isArray(raw)?Array.from({length:Math.floor(raw.length/2)},(_,i)=>[raw[i*2],raw[i*2+1]]):Object.entries(raw);
 return Object.fromEntries(e.map(([k,v])=>[k,typeof v==='string'?JSON.parse(v):v]));
}
function reject(res,status,error){return json(res,status,{ok:false,error});}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store,max-age=0');
 if(req.method!=='POST')return rejectMethod(req,res,['POST']);
 if(!process.env.PMX_PUSH_SECRET || !safeEqual(req.headers.authorization,'Bearer '+process.env.PMX_PUSH_SECRET))return reject(res,401,'UNAUTHORIZED');
 const week=Number(req.body?.week||req.query?.week);
 if(!Number.isInteger(week)||week<7||week>18)return reject(res,400,'INVALID_WEEK');
 try{
  let [snapshot,previous,contract]=await Promise.all([
   read('weeks/week-'+String(week).padStart(2,'0')+'.json'),
   read('weeks/week-'+String(week-1).padStart(2,'0')+'.json'),
   read('contracts/week-'+String(week).padStart(2,'0')+'.json')
  ]);
  if(!captureCertified(snapshot,contract)){
    // Re-check after GitHub Actions commits CLOSED + 9/9 to main.
    // The raw CDN can transiently serve the previous OPEN snapshot, so consult
    // GitHub's authoritative Contents API. NO changes to the certification gate.
    const current=await verifiedGitHubRead('weeks/week-'+String(week).padStart(2,'0')+'.json');
    if(current?.week_number===week && captureCertified(current,contract)){
      snapshot=current;
      console.info('PMX_SCORING_CANONICAL_READBACK',JSON.stringify({week,status:'CLOSED',complete:9,source:'GITHUB_CONTENTS_API'}));
    }
  }
  if(snapshot.week_number!==week||previous.week_number!==week-1||contract.week_number!==week)throw Error('WEEK_CHAIN_MISMATCH');
  if(!captureCertified(snapshot,contract))throw Error('CAPTURE_NOT_CERTIFIED');

  // Private pre-kickoff matrix for the approved PICKS image. The same server
  // credential is required; the public site never receives these values.
  if(req.body?.picks===true){
    const games=snapshot.games||[];
    if(week<9 || games.length<13 || games.length>16 ||
       snapshot.capture?.window!=='CLOSED' ||
       Number(snapshot.capture?.received_picks)!==contract.roster.length*games.length ||
       games.length!==contract.games.length || 
       games.some((g,i)=>g.id!==contract.games[i].id||
       g.matchup!==contract.games[i].visitor[1]+' @ '+contract.games[i].home[1]))
      throw Error('PICK_MATRIX_RELEASE_NOT_CERTIFIED');
    const picks=parseHash(await redis(['HGETALL','pmx:quiniela:jotform:first-valid:'+contract.form_id]));
    if(Object.keys(picks).length!==9 ||
       contract.roster.some(name=>{
        const r=picks[name];
        return !r||r.participant!==name||r.picks==null||
          Object.keys(r.picks).length!==games.length||
          games.some(g=>!g.matchup.split(' @ ').includes(r.picks[g.id]));
       }))throw Error('PRIVATE_CAPTURE_MATRIX_INTEGRITY');
    const matrix=Object.fromEntries(contract.roster.map(name=>[name,
      games.map(g=>({id:g.id,team:picks[name].picks[g.id]}))]));
    const hash=crypto.createHash('sha256').update(JSON.stringify(matrix)).digest('hex');
    return json(res,200,{ok:true,week,integrity:'COMPLETE',status:'CLOSED_FIRST_VALID_9_OF_9',
      roster:contract.roster,games:games.map(g=>({id:g.id,matchup:g.matchup,time:g.time})),
      matrix,picks:games.length*contract.roster.length,checksum:hash,
      source:'REDIS_ORIGINAL_FIRST_VALID',picks_visible:false});
  }
  const games=snapshot.games||[];
  if(!games.length||games.length!==contract.games.length||
     games.some((g,i)=>g.id!==contract.games[i].id||
       !((g.status==='FINAL'&&g.winner&&g.matchup.split(' @ ').includes(g.winner))||
         (g.status==='TIE'&&!g.winner))))throw Error('OFFICIAL_FINALS_INCOMPLETE');
  if(Number(snapshot.results?.final)!==games.length||snapshot.results?.status!=='FINAL')throw Error('FINAL_STATUS_MISSING');
  const prev=previous.season_standings||[];
  if(prev.length!==contract.roster.length||
     contract.roster.some(name=>!prev.some(x=>x.name===name)))throw Error('PREVIOUS_SEASON_BASE_MISSING');
  const locks=parseHash(await redis(['HGETALL','pmx:quiniela:jotform:first-valid:'+contract.form_id]));
  if(Object.keys(locks).length!==contract.roster.length||
     contract.roster.some(name=>!locks[name]||locks[name].participant!==name))throw Error('FIRST_VALID_9_OF_9_REQUIRED');
  // Only explicitly approved, original-matched corrections can change scoring.
  const rawOverlays=parseHash(await redis(['HGETALL','pmx:quiniela:scoring:overlays:w'+week]));
  const overrides={};
  for(const [k,v] of Object.entries(rawOverlays)){
   if(!v||v.approved!==true||!v.reference||!v.approved_by||
      !locks[v.participant]||v.game_id!==k.split(':').at(-1)||
      locks[v.participant].picks?.[v.game_id]!==v.original||
      !games.some(g=>g.id===v.game_id&&g.matchup.split(' @ ').includes(v.pick)))
    throw Error('OVERLAY_AUDIT_MISMATCH');
   overrides[k]=v;
  }
  for(const name of contract.roster){
   const picks=locks[name].picks;
   if(!picks||Array.isArray(picks)||Object.keys(picks).length!==games.length||
      games.some(g=>!g.matchup.split(' @ ').includes(picks[g.id])))throw Error('PRIVATE_PICKS_INVALID');
  }
  const score=calculateWeeklyRankings(games,locks,prev,overrides);
  if(score.weekly.length!==contract.roster.length||score.season.length!==contract.roster.length||
     score.counts.final!==games.length)throw Error('RANKING_INTEGRITY_MISMATCH');
  const checksum=digestScores({week,weekly:score.weekly,season:score.season,games:games.map(g=>[g.id,g.status,g.winner,g.score])});
  const value={week,source:'NFL_RESULTS_VERIFIED_BY_MONITOR',source_url:snapshot.schedule_source||null,
   calculated_at:new Date().toISOString(),...score,checksum};
  const key='pmx:quiniela:scoring:week:'+week;
  await redis(['SET',key,JSON.stringify(value)]);
  const back=JSON.parse(await redis(['GET',key])||'null');
  if(!back||back.checksum!==checksum||back.weekly.length!==contract.roster.length)throw Error('PRIVATE_SCORE_READBACK_FAILED');
  const response={ok:true,week,integrity:'COMPLETE',weekly:score.weekly,season:score.season,
    counts:score.counts,checksum,source:value.source,source_url:value.source_url,picks_visible:false};
  // Only this authenticated POST may return the private render matrix, AFTER
  // capture CLOSED and every NFL game FINAL. Never log or persist this matrix.
  if(req.body?.render===true){
    response.render={
      roster:contract.roster,
      games:games.map(g=>({id:g.id,matchup:g.matchup,score:g.score,winner:g.winner,status:g.status})),
      matrix:Object.fromEntries(contract.roster.map(name=>[name,games.map(g=>{
        const original=locks[name].picks[g.id];
        const selected=overrides[name+':'+g.id]?.pick||original;
        return {team:selected,result:g.status==='TIE'?'PUSH':selected===g.winner?'CORRECT':'WRONG'};
      })]))
    };
  }
  return json(res,200,response);
 }catch(e){
  console.error('PMX_SCORING_HOLD',JSON.stringify({week,reason:String(e?.message||'ERROR').slice(0,90)}));
  return reject(res,409,'SCORING_HOLD_'+String(e?.message||'UNKNOWN').slice(0,70));
 }
}
