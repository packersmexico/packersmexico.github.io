// Data-only payload for 04/Figma. No visual approval or publication is inferred.
import fs from 'node:fs';
const root='quiniela-control';
const data=JSON.parse(fs.readFileSync(root+'/data.json','utf8'));
const week=Number(data.week_number);
const capture=data.capture||{};
const games=data.games||[];
const submissions=capture.locked_submissions||{};
const participants=(data.participants||[]).map(x=>x.name);
const validNames=participants.filter(n=>Array.isArray(submissions[n]?.picks)&&submissions[n].picks.length===games.length);
const deadlineClosed=String(capture.window).toUpperCase()==='CLOSED';
const finals=games.filter(g=>g.status==='FINAL'&&g.winner);
const allFinal=games.length>0&&finals.length===games.length&&String(data.results?.status).toUpperCase()==='FINAL';
const states={
 picks:deadlineClosed&&validNames.length>0?'READY_FOR_04':'WAITING_CAPTURE_CLOSE',
 results:allFinal?'READY_FOR_04':'WAITING_ALL_FINAL',
 weekly:allFinal?'READY_FOR_04':'WAITING_ALL_FINAL',
 season:allFinal?'READY_FOR_04':'WAITING_ALL_FINAL'
};
const base=Object.fromEntries((data.season_base_before_week||[]).map(x=>[x.name,x]));
const weekly=participants.map(name=>{
 const picks=submissions[name]?.picks||[];
 if(picks.length!==games.length)return{name,status:'NO_PICK',correct:null,wrong:null};
 const correct=games.reduce((sum,g,i)=>sum+(g.winner&&g.status==='FINAL'&&picks[i]===g.winner?1:0),0);
 return{name,status:'VALID',correct,wrong:finals.length-correct};
});
const season=weekly.map(x=>{const b=base[x.name]||{correct:0,wrong:0};return {name:x.name,status:x.status,correct:x.correct===null?null:Number(b.correct||0)+x.correct,wrong:x.wrong===null?null:Number(b.wrong||0)+x.wrong};});
const payload={schema:'PMX_QUINIELA_FIGMA_DATA_HANDOFF_V1',week,season:2026,governance:{figma_owner:'04',auto_publish:false,logo:'PMX_HORIZONTAL_V1.1',never_approve_without_real_canvas_qa:true},capture:{status:capture.window,complete:validNames.length,total:participants.length,missing:participants.filter(x=>!validNames.includes(x))},games:games.map(g=>({id:g.id,matchup:g.matchup,time:g.time,winner:g.winner,score:g.score,status:g.status})),participants,matrix:Object.fromEntries(validNames.map(n=>[n,submissions[n].picks])),weekly,season_standings:season,stages:states,asset_keys:{picks:`w${week}-picks-board.png`,results:`w${week}-results-live.png`,weekly:`w${week}-ranking-weekly.png`,season:`w${week}-ranking-season.png`}};
const folder=root+'/production';fs.mkdirSync(folder,{recursive:true});
const output=folder+`/week-${String(week).padStart(2,'0')}-figma-handoff.json`;
const serialized=JSON.stringify(payload,null,2)+'\n';
if(!fs.existsSync(output)||fs.readFileSync(output,'utf8')!==serialized)fs.writeFileSync(output,serialized);
console.log(JSON.stringify({week,stages:states,valid_participants:validNames.length,finals:finals.length,games:games.length}));
