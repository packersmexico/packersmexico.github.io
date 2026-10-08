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
assert.equal(Number(data.week_number),Number(config.week_number));
assert.equal(Number(archive.week_number),Number(data.week_number));
assert.equal(data.capture.deadline,config.deadline);
assert.equal(data.capture.window,config.status);
assert.equal(Number(data.capture.complete),Number(config.complete));
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
