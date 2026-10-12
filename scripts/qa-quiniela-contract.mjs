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
// When the upcoming week's capture opens before MNF finishes, retain the
// prior week in data.json for the live-results monitor. Only capture-config
// advances. Never wipe historical picks to activate the new form.
const currentWeek=Number(data.week_number);
const captureWeek=Number(config.week_number);
const earlyWeekOpen=captureWeek===currentWeek+1 && String(config.status).toUpperCase()==='OPEN';
assert.equal(Number(archive.week_number),currentWeek);
if (earlyWeekOpen) {
  const upcoming=j(root+'/weeks/week-'+String(captureWeek).padStart(2,'0')+'.json');
  assert.equal(Number(upcoming.week_number),captureWeek);
  assert.equal(upcoming.games.length,14,'W6 official slate must contain exactly 14 games');
  assert.equal(new Set(upcoming.games.map(g=>g.id)).size,14,'Duplicate W6 Game IDs');
  assert.deepEqual(upcoming.games.map(g=>g.id),Array.from({length:14},(_,i)=>'G'+String(i+1).padStart(2,'0')));
  assert.equal(upcoming.games.find(g=>g.id==='G13')?.matchup,'DAL @ GB');
  assert.equal(config.default_green_bay_pick,'GB');
  assert.equal(config.default_green_bay_game_id,'G13');
  assert.equal(upcoming.capture.green_bay_default_pick,'GB');
  assert.equal(config.duplicate_policy,'FIRST_VALID_SUBMISSION_LOCKED_PER_PARTICIPANT');
  assert.equal(config.form_id,upcoming.capture.form_id);
  assert.equal(config.form_url,upcoming.capture.form_url);
  assert.equal(config.deadline,upcoming.capture.deadline);
  assert.equal(config.status,upcoming.capture.window);
  assert.equal(config.complete,0);
  assert.equal(config.total,9);
  assert.equal(config.received_picks,0);
  assert.equal(config.expected_picks,126);
  assert.equal(Object.keys(config.locked_submissions||{}).length,0);
  assert.equal(config.stable_url,'https://packersmexico.github.io/quiniela-control/captura/');
  assert.equal(upcoming.results.total,14);
  assert.equal(upcoming.results.final,0);
  assert.equal(upcoming.season_standings.length,0,'Never use provisional W5 season as W6 base');
  assert.deepEqual((config.missing_participants||[]).sort(),
    (data.participants||[]).map(p=>p.name).sort(),'W6 roster must match locked nine participants');
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
assert.equal(valid.length,data.capture.complete,'Submission total does not match locked pick matrix');
assert.equal(data.capture.received_picks,valid.length*data.games.length);
assert.equal(data.capture.expected_picks,data.capture.total*data.games.length);
assert.equal(index.active_week,Number(data.week_number));
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
