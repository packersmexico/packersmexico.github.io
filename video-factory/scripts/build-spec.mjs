import fs from 'node:fs';
import path from 'node:path';

const env = process.env;
const purpose = env.PURPOSE || 'TEST';
const registry = JSON.parse(fs.readFileSync('config/families.json', 'utf8'));

const parseArray = (value, label) => {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) throw new Error(`${label} must be an array`);
    return parsed;
  } catch (error) {
    throw new Error(`Invalid ${label}: ${error.message}`);
  }
};

let spec;
if (env.SPEC_PATH) {
  const specPath = path.resolve(env.SPEC_PATH);
  if (!fs.existsSync(specPath)) throw new Error(`SPEC_PATH not found: ${env.SPEC_PATH}`);
  spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
} else {
  spec = {
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
    captions: parseArray(env.CAPTIONS_JSON, 'CAPTIONS_JSON'),
    scenes: parseArray(env.SCENES_JSON, 'SCENES_JSON'),
  };
}

const familyDef = registry.families?.[spec.family];
if (!familyDef) throw new Error(`Unknown family: ${spec.family}`);
if (!familyDef.allowedModes?.includes(spec.mode)) throw new Error(`Mode ${spec.mode} is not allowed for family ${spec.family}`);
if (purpose === 'PRODUCTION' && familyDef.status !== 'ACTIVE') {
  throw new Error(`Family ${spec.family} is ${familyDef.status}; PRODUCTION requires ACTIVE family status`);
}

spec.purpose = purpose;
spec.familyStatus = familyDef.status;
spec.canonicalMaster = familyDef.canonicalMaster;

if (env.AUDIO_URL) spec.audioUrl = env.AUDIO_URL;
if (env.ASSET_URL) spec.assetUrl = env.ASSET_URL;
if (env.ASSET_CREDIT) spec.assetCredit = env.ASSET_CREDIT;

if (!Number.isFinite(Number(spec.durationSeconds)) || Number(spec.durationSeconds) <= 0) {
  throw new Error('durationSeconds must be a positive number');
}
if (spec.family === 'DR_PALMA' && spec.mode === 'WEEKLY_PREVIEW' && (!Array.isArray(spec.scenes) || spec.scenes.length < 2)) {
  throw new Error('DR_PALMA WEEKLY_PREVIEW requires at least two scenes');
}

fs.mkdirSync('generated', {recursive: true});
fs.writeFileSync(path.join('generated', 'spec.json'), JSON.stringify(spec, null, 2));
console.log(JSON.stringify(spec, null, 2));
