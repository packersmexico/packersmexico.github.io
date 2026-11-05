#!/usr/bin/env node
// Stage immutable, private-pick-free NFL weeks 10–18 from ESPN schedule.
// The NFL.com source URLs are recorded; the official byes are checked against all teams.
// NEVER opens a Jotform, changes the active week, or publishes a PNG.
import fs from 'node:fs';
import path from 'node:path';
const DIR='quiniela-control/season-plan';
const BYES={
 10:['CHI','DEN','PHI','TB'],11:['ATL','CLE','GB','LAR','NE','SEA'],12:[],
 13:['BAL','IND','LV','NYJ'],14:['AZ','DAL'],15:[],16:[],17:[],18:[]
};
const EXPECTED={10:14,11:13,12:16,13:14,14:15,15:16,16:16,17:16,18:16};
const NORM={JAC:'JAX',WSH:'WAS',LA:'LAR',ARI:'AZ',OAK:'LV',SD:'LAC',STL:'LAR'};
const all='AZ ATL BAL BUF CAR CHI CIN CLE DAL DEN DET GB HOU IND JAX KC LAC LAR LV MIA MIN NE NO NYG NYJ PHI PIT SEA SF TB TEN WAS'.split(' ');
const ROSTER=['EL DOC','ARI','LALO','ALEX','LUIS C.','DR PALMA','JENNI','RODRI','IBRACHO'];
const mapping=t=>{const a=String(t||'').toUpperCase();return NORM[a]||a};
async function loadWeek(w){
 const url=`https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=2026&seasontype=2&week=${w}&limit=100`;
 const res=await fetch(url,{headers:{'User-Agent':'PACKERS-MX-Quiniela-2026-SeasonPlan/1.0'},signal:AbortSignal.timeout(30000)});
 if(!res.ok)throw Error('ESPN_SCHEDULE_HTTP_'+w+'_'+res.status);
 const data=await res.json(),events=data.events||[];
 const games=events.map(e=>{
   const comp=e.competitions?.[0];
   const sides=Object.fromEntries((comp?.competitors||[]).map(x=>[x.homeAway,x.team]));
   if(!sides.away||!sides.home)throw Error('ESPN_MISSING_TEAMS_'+w);
   const a=mapping(sides.away.abbreviation),h=mapping(sides.home.abbreviation);
   const dt=String(e.date||comp?.date||'');
   if(!/^202[67]-\d\d-\d\dT\d\d:\d\d/.test(dt))throw Error('ESPN_KICKOFF_MISSING_'+w);
   const stamp=Date.parse(dt);
   if(!Number.isFinite(stamp))throw Error('ESPN_BAD_DATE_'+w);
   return {event_id:String(e.id),matchup:a+' @ '+h,away:a,home:h,
     away_name:String(sides.away.name||a).toUpperCase(),home_name:String(sides.home.name||h).toUpperCase(),
     kickoff_iso:new Date(stamp).toISOString(),schedule_precision:w>=16?'TBD_FLEX_WINDOW':'PROVISIONAL_REVALIDATE_BEFORE_OPEN'};
 }).sort((a,b)=>a.kickoff_iso.localeCompare(b.kickoff_iso)||a.matchup.localeCompare(b.matchup));
 if(games.length!==EXPECTED[w])throw Error('WRONG_GAME_COUNT_'+w+'_'+games.length);
 const used=games.flatMap(x=>[x.away,x.home]),byes=BYES[w];
 if(used.length+byes.length!==32||new Set([...used,...byes]).size!==32||
     [...used,...byes].some(x=>!all.includes(x)))throw Error('TEAM_OR_BYE_CONFLICT_'+w);
 if(games.filter(x=>x.away==='GB'||x.home==='GB').length!==(byes.includes('GB')?0:1))throw Error('GB_COUNT_MISMATCH_'+w);
 const first=games[0].kickoff_iso;
 const manifest={schema:'PMX_QUINIELA_PREBUILD_SEASON_2026_V1',week:w,season:2026,
   source_schedule:`https://www.nfl.com/schedules/2026/by-week/week-${w}`,
   source_comparison:'ESPN_PUBLIC_SCHEDULE_MATCHUPS_WITH_NFL_OFFICIAL_BYE_AND_TEAM_COVERAGE',
   espn_url:url,generated_at:new Date().toISOString(),
   status:w>=16?'STAGED_FLEX_DATES_UNCONFIRMED':'STAGED_LOCKED_NOT_PUBLIC',
   public_form_status:'NOT_OPEN',roster:ROSTER,bye_teams:byes,
   packers_fixed:!byes.includes('GB'),packers_bye:byes.includes('GB'),
   planned_game_count:games.length,first_kickoff_utc:first,
   deadline_policy:'EARLIEST_KICKOFF_MINUS_3_HOURS_OR_EARLIER_WITH_DIRECTION_APPROVAL',
   release_gate:{previous_week_final_required:true,jotform_form_enabled_only_after_validation:true,
     server_side_question_map_required:true,unique_roster_required:true,
     flex_or_tbd_revalidation_required:w>=16,social_auto_publish:false},
   games:games.map((g,i)=>({id:'G'+String(i+1).padStart(2,'0'),...g,
     fixed_pick:(g.away==='GB'||g.home==='GB')?'GB':null}))};
 return manifest;
}
const offline=process.argv.includes('--self-test');
if(offline){for(let w=10;w<=18;w++){if(EXPECTED[w]*2+BYES[w].length!==32)throw Error('BYE_ARITHMETIC_'+w);}
 console.log('PASS schedule planner team counts/bye policies/GB bye W11; no form activation');process.exit(0);}
fs.mkdirSync(DIR,{recursive:true});
const stats=[];
for(let week=10;week<=18;week++){
 const manifest=await loadWeek(week);
 const filepath=path.join(DIR,`week-${String(week).padStart(2,'0')}.json`);
 // Never overwrite a state that has been progressed beyond STAGED.
 if(fs.existsSync(filepath)){
  const existing=JSON.parse(fs.readFileSync(filepath,'utf8'));
  if(existing.status&&!existing.status.startsWith('STAGED')){stats.push({week,skipped:'PRODUCTION_STATE_PROTECTED'});continue;}
  // Preserve manually assigned form data, never invent IDs or reset QA gates.
  for(const k of ['form_id','form_url','field_map_verified','form_metadata','direction_approval'])
    if(existing[k]!==undefined)manifest[k]=existing[k];
 }
 fs.writeFileSync(filepath,JSON.stringify(manifest,null,2)+'\n');
 stats.push({week,games:manifest.games.length,byes:manifest.bye_teams.join(','),packers_bye:manifest.packers_bye,status:manifest.status});
}
console.log('PMX_STAGED_WEEK10_18',JSON.stringify(stats));
