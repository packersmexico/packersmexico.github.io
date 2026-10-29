#!/usr/bin/env node
// PMX Quiniela 2026: fail-closed readiness audit. Never opens forms or publishes assets.
import fs from 'node:fs';
import path from 'node:path';
const root='quiniela-control';
const read=(p)=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const roster=read('production-config.json').participants.base;
const report=[];
for(let week=8;week<=18;week++){
  const tag=String(week).padStart(2,'0');
  const cp='contracts/week-'+tag+'.json', wp='weeks/week-'+tag+'.json', fp='figma-week-'+tag+'.json';
  const blockers=[];
  const exists=p=>fs.existsSync(path.join(root,p));
  if(!exists(cp)) blockers.push('MISSING_VERIFIED_WEEKLY_CONTRACT');
  if(!exists(wp)) blockers.push('MISSING_WEEK_SNAPSHOT');
  if(!exists(fp)) blockers.push('MISSING_FIGMA_WEEK_QA');
  let contract=null;
  if(exists(cp)){
    contract=read(cp);
    if(contract.week_number!==week) blockers.push('CONTRACT_WEEK_MISMATCH');
    if(JSON.stringify(contract.roster)!==JSON.stringify(roster)) blockers.push('ROSTER_MISMATCH');
    if(!contract.form_id || !/^\\d{10,}$/.test(String(contract.form_id))) blockers.push('FORM_NOT_ASSIGNED');
    if(!contract.source_schedule || !String(contract.source_schedule).includes('/2026/by-week/week-'+week)) blockers.push('NFL_SCHEDULE_SOURCE_MISSING');
    if(!contract.source_schedule_verified) blockers.push('SCHEDULE_NOT_VERIFIED');
    if(!Array.isArray(contract.bye_teams)) blockers.push('BYE_NOT_VERIFIED');
    if(!Array.isArray(contract.games)||contract.games.length<1) blockers.push('GAMES_MISSING');
    else {
      const ids=contract.games.map(g=>g.id);
      if(new Set(ids).size!==ids.length||ids.some((id,i)=>id!==('G'+String(i+1).padStart(2,'0')))) blockers.push('GAME_IDS_NOT_CANONICAL');
      if(contract.games.some(g=>!Array.isArray(g.visitor)||!Array.isArray(g.home)||g.visitor.length!==2||g.home.length!==2||!g.field||!g.question)) blockers.push('GAME_MAPPING_INCOMPLETE');
      if(new Set(contract.games.map(g=>String(g.question))).size!==ids.length) blockers.push('JOTFORM_QUESTION_IDS_NOT_UNIQUE');
      const hasGB=contract.games.some(g=>g.visitor?.[1]==='GB'||g.home?.[1]==='GB');
      if(hasGB && contract.packers_locked!==true) blockers.push('PACKERS_PICK_NOT_LOCKED');
      if(!hasGB && contract.packers_bye!==true) blockers.push('PACKERS_BYE_NOT_CONFIRMED');
      if(hasGB && contract.packers_bye===true) blockers.push('PACKERS_BYE_CONTRADICTION');
    }
    if(contract.field_map_qa!=='PASS') blockers.push('JOTFORM_AUTHENTICATED_QUESTION_MAP_NOT_CERTIFIED');
  }
  if(exists(fp)){
    const visual=read(fp);
    if(visual.week!==week) blockers.push('FIGMA_WEEK_MISMATCH');
    const approvals=visual.asset_approvals||{};
    for(const slot of ['results','weekly','season']){
      const a=approvals[slot]||{};
      if(a.figma_qa!=='PASS'||a.direction_review!=='PASS'||a.export_verified!==true||!a.evidence)
        blockers.push('FINAL_'+slot.toUpperCase()+'_FIGMA_APPROVAL_MISSING');
    }
  }
  report.push({week,contract:exists(cp),snapshot:exists(wp),figma:exists(fp),ready:!blockers.length,blockers});
}
const summary={schema:'PMX_QUINIELA_W08_W18_READINESS_V1',season:2026,ready_weeks:report.filter(x=>x.ready).map(x=>x.week),weeks:report};
if(process.argv.includes('--json')) console.log(JSON.stringify(summary,null,2));
else for(const w of report) console.log('W'+String(w.week).padStart(2,'0'),w.ready?'READY':'HOLD',w.blockers.join(', '));
if(process.argv.includes('--require-ready')&&report.some(x=>!x.ready)) process.exitCode=1;
