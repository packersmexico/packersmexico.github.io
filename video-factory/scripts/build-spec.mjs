import fs from 'node:fs';
import path from 'node:path';

const env = process.env;
const spec = {
  version: '1.0',
  pmxId: env.PMX_ID || 'PMX-UNSET',
  family: env.FAMILY || 'ANALYSIS',
  mode: env.MODE || 'HERO',
  aspect: env.ASPECT || '9:16',
  headline: env.HEADLINE || 'PACKERS MÉXICO',
  kicker: env.KICKER || undefined,
  subheadline: env.SUBHEADLINE || undefined,
  body: env.BODY || undefined,
  cta: env.CTA || undefined,
  sourceLabel: env.SOURCE_LABEL || undefined,
  destinationLabel: env.DESTINATION_LABEL || undefined,
  durationSeconds: Number(env.DURATION_SECONDS || 15),
  audioUrl: env.AUDIO_URL || undefined,
  assetUrl: env.ASSET_URL || undefined,
  assetCredit: env.ASSET_CREDIT || undefined,
};

fs.mkdirSync('generated', {recursive: true});
fs.writeFileSync(path.join('generated', 'spec.json'), JSON.stringify(spec, null, 2));
console.log(JSON.stringify(spec, null, 2));
