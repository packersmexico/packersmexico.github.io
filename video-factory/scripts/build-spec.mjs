import fs from 'node:fs';
import path from 'node:path';

const env = process.env;
const purpose = env.PURPOSE || 'TEST';
const family = env.FAMILY || 'ANALYSIS';
const mode = env.MODE || 'HERO';

const registry = JSON.parse(fs.readFileSync('config/families.json', 'utf8'));
const familyDef = registry.families?.[family];
if (!familyDef) throw new Error(`Unknown family: ${family}`);
if (!familyDef.allowedModes?.includes(mode)) throw new Error(`Mode ${mode} is not allowed for family ${family}`);
if (purpose === 'PRODUCTION' && familyDef.status !== 'ACTIVE') {
  throw new Error(`Family ${family} is ${familyDef.status}; PRODUCTION requires ACTIVE family status`);
}

let captions;
if (env.CAPTIONS_JSON) {
  try {
    captions = JSON.parse(env.CAPTIONS_JSON);
    if (!Array.isArray(captions)) throw new Error('captions must be an array');
  } catch (error) {
    throw new Error(`Invalid CAPTIONS_JSON: ${error.message}`);
  }
}

const spec = {
  version: '1.0',
  purpose,
  familyStatus: familyDef.status,
  canonicalMaster: familyDef.canonicalMaster,
  pmxId: env.PMX_ID || 'PMX-UNSET',
  family,
  mode,
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
  captions,
};

fs.mkdirSync('generated', {recursive: true});
fs.writeFileSync(path.join('generated', 'spec.json'), JSON.stringify(spec, null, 2));
console.log(JSON.stringify(spec, null, 2));
