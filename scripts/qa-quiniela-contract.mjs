import fs from 'node:fs';
import assert from 'node:assert/strict';
const r=p=>fs.readFileSync(p,'utf8');
const j=p=>JSON.parse(r(p));
const root='quiniela-control';
const data=j(root+'/data.json');
const config=j(root+'/capture-config.json');
const archive=j(root+'/weeks/week-'+String(data.week_number).padStart(2,'0')+'.json');
const index=j(root+'/exports/asset-index.json');
const logo='PMX_LOGO_HISTORICO_HORIZONTAL_CANVA_MASTER_V1.1.svg';
// When capture and scoring refer to adjacent weeks, retain the
// prior week in data.json for the live-results monitor. Only capture-config
// advances. Never wipe historical picks to activate the new form.
const currentWeek=Number(data.week_number);
const captureWeek=Number(config.week_number);
const separateCaptureWeek=captureWeek===currentWeek+1 && ['OPEN','CLOSED'].includes(String(config.status).toUpperCase());
assert.equal(Number(archive.week_number),currentWeek);
if (separateCaptureWeek) {
  const upcoming=j(root+'/weeks/week-'+String(captureWeek).padStart(2,'0')+'.json');
  assert.equal(Number(upcoming.week_number),captureWeek);
  assert.equal(upcoming.games.length,14,'Active weekly slate must contain 14 games');
  assert.equal(new Set(upcoming.games.map(g=>g.id)).size,14,'Duplicate W6 Game IDs');
  assert.deepEqual(upcoming.games.map(g=>g.id),Array.from({length:14},(_,i)=>'G'+String(i+1).padStart(2,'0')));
  assert.equal(upcoming.games.find(g=>g.id==='G11')?.matchup,'GB @ DET');
  assert.equal(config.default_green_bay_pick,'GB');
  assert.equal(config.default_green_bay_game_id,'G11');
  assert.equal(upcoming.capture.green_bay_default_pick,'GB');
  assert.equal(config.duplicate_policy,'FIRST_VALID_SUBMISSION_LOCKED_PER_PARTICIPANT');
  assert.equal(config.form_id,upcoming.capture.form_id);
  assert.equal(config.form_url,upcoming.capture.form_url);
  assert.equal(config.deadline,upcoming.capture.deadline);
  assert.equal(config.status,upcoming.capture.window);
  // Week 6 has verified participant-level Jotform receipts before individual picks
  // are materialized: validate counts without claiming first-valid pick locks.
  assert.equal(config.total,9);
  assert.equal(config.expected_picks,126);
  assert.equal(config.complete,upcoming.capture.complete);
  assert.equal(config.received_picks,upcoming.capture.received_picks);
  assert.equal(config.received_picks,config.complete*14);
  assert.equal(config.missing_picks,(config.total-config.complete)*14);
  assert.equal(upcoming.capture.missing_picks,config.missing_picks);
  assert.equal(Object.keys(config.locked_submissions||{}).length,0,
    'Jotform receipt status does not establish immutable picks');
  assert.equal(Object.keys(upcoming.capture.locked_submissions||{}).length,0,
    'Do not claim pick locks before reconciliation');
  assert.equal(config.stable_url,'https://packersmexico.github.io/quiniela-control/captura/');
  assert.equal(upcoming.results.total,14);
  assert.equal(upcoming.results.final,0);
  assert.equal(upcoming.results.scored,0);
  assert(upcoming.games.every(g=>g.status==='SCHEDULED'&&!g.winner),'W7 must not fabricate results');
  assert.equal(upcoming.season_standings.length,0,'Never use provisional W5 season as W6 base');
  const canonical=(data.participants||[]).map(p=>p.name);
  const missing=config.missing_participants||[];
  const received=(upcoming.participants||[]).filter(p=>String(p.status).startsWith('COMPLETE')).map(p=>p.name);
  assert.equal(new Set(received).size,config.complete,'Duplicate Week 6 receipt identities');
  assert.equal(new Set(missing).size,config.total-config.complete,'Duplicate Week 6 missing identities');
  assert.deepEqual([...received,...missing].sort(),canonical.sort(),
    'W6 received and missing must partition canonical participants');
} else {
  assert.equal(currentWeek,captureWeek);
  assert.equal(data.capture.deadline,config.deadline);
  assert.equal(data.capture.window,config.status);
  assert.equal(Number(data.capture.complete),Number(config.complete));
}
assert.equal(data.games.length,Number(data.results.total));
assert.equal(new Set(data.games.map(g=>g.id)).size,data.games.length);
const subs=data.capture.locked_submissions||{};
const valid=Object.entries(subs).filter(([n,v])=>Array.isArray(v.picks)&&v.picks.length===data.games.length);
if(data.capture.private_picks_integrity==='COMPLETE'){
 assert.equal(data.capture.complete,9);
 assert.equal(data.capture.received_picks,126);
 assert.equal(valid.length,0,'Never put private W6 first-valid picks in public data.json');
 assert.equal(data.results.final,14,'W6 official results must be finalized');
 assert.equal(data.weekly_standings.length,9,'W6 scoring must have 9 private-verified aggregates');
}else{
 assert.equal(valid.length,data.capture.complete,'Submission total does not match locked pick matrix');
 assert.equal(data.capture.received_picks,valid.length*data.games.length);
}
assert.equal(data.capture.expected_picks,data.capture.total*data.games.length);
assert.equal(index.score_week,currentWeek,'Scoring week must track data.json');
assert.equal(index.capture_week,captureWeek,'Capture week must track capture-config');
assert.equal(index.active_week,Math.max(currentWeek,captureWeek),'Active week must include open next-week capture');
const html=r(root+'/index.html');
const gallery=r(root+'/exports/live.html');
assert(html.includes(logo)&&gallery.includes(logo),'Missing approved PMX horizontal logo');
assert(gallery.includes('assets-library.js'),'Missing dynamic asset library');
for(const w of Object.values(index.weeks)){
  for(const [slot,a] of Object.entries(w.assets||{})){
    if(a.state!=='READY')continue;
    assert(a.href && /^\.\/w\d+[-a-z]+\.png$/.test(a.href),'Invalid download URL: '+slot);
    const png=root+'/exports/'+a.href.split('/').pop();
    const b=fs.readFileSync(png);
    assert(b.length>10000);
    assert.equal(b.readUInt32BE(16),slot==='weekly'||slot==='season'?1080:1600);
    assert.equal(b.readUInt32BE(20),slot==='weekly'||slot==='season'?1350:2000);
  }
}
const push=r(root+'/push.js');
const subscribe=r('push-backend/api/subscribe.js');
assert(push.includes('IBRA')&&subscribe.includes('IBRA_PUSH_CODE'));
assert(!push.includes('IBRA_PUSH_CODE'),'Secret name accidentally exposed via frontend');
console.log('PASS · Quiniela weekly data, capture, approved logos, downloads and dual-admin push contract.');
