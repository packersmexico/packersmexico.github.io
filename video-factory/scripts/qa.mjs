import {execFileSync} from 'node:child_process';
import fs from 'node:fs';

const file = process.argv[2] || 'out/video.mp4';
if (!fs.existsSync(file)) throw new Error(`Missing render: ${file}`);

const raw = execFileSync('ffprobe', [
  '-v','error',
  '-show_entries','format=duration,size:stream=codec_type,width,height',
  '-of','json',
  file,
], {encoding:'utf8'});

const data = JSON.parse(raw);
const video = data.streams.find((s) => s.codec_type === 'video');
if (!video) throw new Error('No video stream');

const allowed = new Set(['1080x1920','1080x1350','1080x1080']);
const dims = `${video.width}x${video.height}`;
if (!allowed.has(dims)) throw new Error(`Unexpected dimensions ${dims}`);

const duration = Number(data.format.duration || 0);
if (duration <= 2) throw new Error(`Duration too short: ${duration}`);

const report = {
  status: 'PASS',
  file,
  dimensions: dims,
  durationSeconds: Number(duration.toFixed(2)),
  sizeBytes: Number(data.format.size || 0),
  hasAudio: data.streams.some((s) => s.codec_type === 'audio'),
};

fs.mkdirSync('out', {recursive:true});
fs.writeFileSync('out/qa.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
