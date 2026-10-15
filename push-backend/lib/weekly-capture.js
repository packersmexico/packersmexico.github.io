// Versioned weekly capture contract. No private picks or submission IDs in this file.
export function assertWeekConfig(c) {
  if (!Number.isInteger(c?.week_number) || c.week_number<1 || c.week_number>25) throw Error('INVALID_WEEK');
  if (!/^\d{10,25}$/.test(String(c.form_id||''))) throw Error('INVALID_FORM');
  if (!Array.isArray(c.roster)||new Set(c.roster.map(x=>String(x).trim().toUpperCase())).size!==c.roster.length||!c.roster.length) throw Error('INVALID_ROSTER');
  if (!Array.isArray(c.games)||!c.games.length||new Set(c.games.map(g=>g.id)).size!==c.games.length) throw Error('INVALID_GAMES');
  for(const g of c.games){
    if(!/^G\d{2}$/.test(g.id)||!g.field||!/^\d+$/.test(String(g.question))||!g.visitor?.[1]||!g.home?.[1]||g.visitor[1]===g.home[1]) throw Error('INVALID_GAME');
  }
  if (!c.timezone || !c.deadline) throw Error('INVALID_WINDOW');
  return c;
}
export function normalizeName(s){return String(s??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').trim().replace(/\s+/g,' ').toUpperCase();}
function pickValue(v){
  if(Array.isArray(v))return v.length===1?pickValue(v[0]):null;
  if(v&&typeof v==='object')return pickValue(v.answer??v.value??v.text);
  return typeof v==='string'?normalizeName(v):null;
}
export function validateWeeklyPicks(raw,config){
  assertWeekConfig(config);
  const picks={},invalid=[];
  for(const g of config.games){
    const value=pickValue(raw?.[g.field]??raw?.[String(g.question)]);
    const visitor=g.visitor.map(normalizeName),home=g.home.map(normalizeName);
    let selected=null;
    if(visitor.includes(value))selected=g.visitor[1];
    else if(home.includes(value))selected=g.home[1];
    const requiresGB=g.visitor[1]==='GB'||g.home[1]==='GB';
    if(!selected||(requiresGB&&config.packers_locked===true&&selected!=='GB')) invalid.push(g.id);
    else picks[g.id]=selected;
  }
  return {valid:invalid.length===0&&Object.keys(picks).length===config.games.length,picks,missing_or_invalid:invalid};
}
// Store pick corrections in an independently audited overlay, never mutate raw Jotform evidence.
export function scoringPick(original,overlay,gameId){
  return overlay?.[gameId]?.approved===true?overlay[gameId].pick:original?.[gameId]??null;
}
export function scoreGame(pick,winner,status){
  if(status==='TIE'||winner==='TIE')return {correct:0,wrong:0,push:1,scored:0};
  if(status!=='FINAL'||!winner)return {correct:0,wrong:0,push:0,scored:0};
  return {correct:Number(pick===winner),wrong:Number(pick!==winner),push:0,scored:1};
}
