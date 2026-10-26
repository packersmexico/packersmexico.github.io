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
const interim=captureWeek===currentWeek+2?
  j(root+'/weeks/week-'+String(currentWeek+1).padStart(2,'0')+'.json'):null;
const safeEarlyRollover=captureWeek===currentWeek+2&&
  interim?.capture?.window==='CLOSED'&&
  Number(interim.capture.complete)===Number(interim.capture.total)&&
  Number(interim.capture.total)===9&&
  Number(interim.results?.total)>0&&
  Number(interim.results?.final)<Number(interim.results.total);
const separateCaptureWeek=(captureWeek===currentWeek+1||safeEarlyRollover) &&
  ['OPEN','CLOSED'].includes(String(config.status).toUpperCase());
assert(captureWeek<=currentWeek+1||safeEarlyRollover,'Invalid early rollover: middle week must be fully captured and still scoring');
assert.equal(Number(archive.week_number),currentWeek);
if (separateCaptureWeek) {
  const upcoming=j(root+'/weeks/week-'+String(captureWeek).padStart(2,'0')+'.json');
  assert.equal(Number(upcoming.week_number),captureWeek);
  const gameCount=upcoming.games.length;
  assert(gameCount>=1&&gameCount<=18,'Invalid weekly schedule count');
  assert.equal(new Set(upcoming.games.map(g=>g.id)).size,gameCount,'Duplicate game IDs');
  assert.deepEqual(upcoming.games.map(g=>g.id),Array.from({length:gameCount},(_,i)=>'G'+String(i+1).padStart(2,'0')));
  assert.equal(config.form_id,upcoming.capture.form_id);
  assert.equal(config.form_url,upcoming.capture.form_url);
  assert.equal(config.deadline,upcoming.capture.deadline);
  assert.equal(config.status,upcoming.capture.window);
  assert.equal(config.total,9);
  assert.equal(config.expected_picks,9*gameCount);
  assert.equal(config.complete,upcoming.capture.complete);
  assert.equal(config.received_picks,upcoming.capture.received_picks);
  assert.equal(config.received_picks,config.complete*gameCount);
  assert.equal(config.missing_picks,(9-config.complete)*gameCount);
  assert.equal(upcoming.capture.missing_picks,config.missing_picks);
  assert.equal(Object.keys(config.locked_submissions||{}).length,0,'Private picks must remain in Redis');
  assert.equal(Object.keys(upcoming.capture.locked_submissions||{}).length,0,'Never serialize first-valid picks publicly');
  assert.equal(config.stable_url,'https://packersmexico.github.io/quiniela-control/captura/');
  assert.equal(upcoming.results.total,gameCount);
  assert(upcoming.results.final>=0 && upcoming.results.final<=gameCount);
  assert.equal(new Set((upcoming.participants||[]).map(p=>p.name)).size,9);
  const roster=new Set((data.participants||[]).map(p=>p.name));
  assert((upcoming.participants||[]).every(p=>roster.has(p.name)),'Participant drift');
  const missing=config.missing_participants||[];
  const received=(upcoming.participants||[]).filter(p=>String(p.status).startsWith('COMPLETE')).map(p=>p.name);
  assert.equal(new Set(received).size,config.complete,'Duplicate first-valid identities');
  assert.equal(new Set(missing).size,config.total-config.complete,'Duplicate missing identities');
  assert.deepEqual([...received,...missing].sort(),[...roster].sort(),'Roster partition mismatch');
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
const privateVerified=data.capture.private_picks_integrity==='COMPLETE' ||
  data.capture.submission_integrity?.status==='COMPLETE';
if(privateVerified){
 assert.equal(data.capture.complete,data.capture.total);
 assert.equal(data.capture.received_picks,data.capture.total*data.games.length);
 assert.equal(valid.length,0,'Never serialize private FIRST_VALID picks into public scoreboard');
 assert.equal(data.results.final,data.games.length,'Published aggregate scoreboard must be FINAL');
 assert.equal(data.weekly_standings.length,9,'Missing nine verified weekly totals');
}else{
 assert.equal(valid.length,data.capture.complete,'Locked public pick matrix inconsistency');
 assert.equal(data.capture.received_picks,valid.length*data.games.length);
}
assert.equal(data.capture.expected_picks,data.capture.total*data.games.length);
assert([currentWeek,currentWeek-1].includes(index.score_week),'Index may temporarily lag one push while automatic index writer runs');
assert.equal(index.capture_week,captureWeek,'Capture week must track capture-config');
assert.equal(index.active_week,Math.max(currentWeek,captureWeek),'Active week must include capture even during finalization');
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
