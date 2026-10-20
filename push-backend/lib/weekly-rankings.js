import crypto from 'node:crypto';
export function calculateWeeklyRankings(games,firstValid,seasonBase,overrides={}){
 const names=Object.keys(firstValid).sort();
 if(!names.length||games.some(g=>g.status!=='FINAL'&&g.status!=='TIE'))throw Error('WEEK_NOT_FULLY_FINAL');
 const ids=games.map(g=>g.id),unique=new Set(ids);
 if(unique.size!==games.length)throw Error('DUPLICATE_GAME_ID');
 const scoreable=games.filter(g=>g.status==='FINAL'&&g.winner),pushes=games.filter(g=>g.status==='TIE'&&!g.winner).length;
 if(scoreable.length+pushes!==games.length)throw Error('INVALID_GAME_STATUS');
 const base=new Map(seasonBase.map(x=>[x.name,x])); const weekly=[];
 for(const name of names){
  const record=firstValid[name],picks=record?.picks;
  if(!picks||ids.some(id=>!picks[id])||Object.keys(picks).length!==ids.length||!record.submission_id)throw Error('INVALID_LOCKED_PICKS');
  let correct=0;
  for(const game of scoreable){
    const original=picks[game.id];
    const ov=overrides[name+':'+game.id];
    if(ov && (ov.approved!==true||ov.original!==original))throw Error('OVERLAY_MISMATCH');
    const pick=ov?.pick||original;
    if(pick===game.winner)correct++;
  }
  weekly.push({name,correct,wrong:scoreable.length-correct,status:'VALID'});
 }
 weekly.sort((a,b)=>b.correct-a.correct||a.wrong-b.wrong||a.name.localeCompare(b.name));
 const season=weekly.map(x=>{const p=base.get(x.name);if(!p)throw Error('MISSING_SEASON_BASE');return {name:x.name,correct:p.correct+x.correct,wrong:p.wrong+x.wrong,status:'VALID'};})
 .sort((a,b)=>b.correct-a.correct||a.wrong-b.wrong||a.name.localeCompare(b.name));
 return {weekly,season,counts:{final:games.length,scored:scoreable.length,pushes},integrity:'COMPLETE'};
}
export function digestScores(result){return crypto.createHash('sha256').update(JSON.stringify(result)).digest('hex');}
