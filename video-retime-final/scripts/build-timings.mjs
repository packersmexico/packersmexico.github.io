import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const fps = 30;
const tails = {S01:.18,S02:.18,S03:.18,S04:.22,S05:.18,S06:.2,S07:.25,S08:.55,S09:.35,S10:.35,S11:.3,S12:1.15,S13:1.5};
const scenes = [];
for (let i = 1; i <= 13; i++) {
  const id = `S${String(i).padStart(2,'0')}`;
  const file = path.join(root, 'public', 'audio', `${id}.mp3`);
  const out = execFileSync('ffprobe', ['-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',file], {encoding:'utf8'}).trim();
  const seconds = Number(out) + (tails[id] ?? .2);
  scenes.push({id, seconds: Number(seconds.toFixed(3))});
}
const data = {fps, scenes};
fs.writeFileSync(path.join(root, 'src', 'timings.json'), JSON.stringify(data, null, 2) + '\n');
console.log(JSON.stringify(data, null, 2));
console.log('TOTAL_SECONDS=' + scenes.reduce((s,x)=>s+x.seconds,0).toFixed(3));
