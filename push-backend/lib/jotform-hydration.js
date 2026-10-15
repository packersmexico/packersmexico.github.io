import crypto from 'node:crypto';
import { normalizeName, validateWeeklyPicks } from './weekly-capture.js';
import { resolveParticipant } from './jotform-capture.js';

export const HYDRATE_CAS_LUA = `
local raw = redis.call('HGET', KEYS[1], ARGV[1])
if not raw then return 'NOT_FOUND' end
local ok,rec = pcall(cjson.decode, raw)
if not ok or type(rec) ~= 'table' then return 'CORRUPT_RECORD' end
if tostring(rec.submission_id or '') ~= ARGV[2] then return 'SUBMISSION_MISMATCH' end
if rec.picks ~= cjson.null and rec.picks ~= nil then return 'ALREADY_COMPLETE' end
local picks = cjson.decode(ARGV[3])
if type(picks) ~= 'table' then return 'INVALID_PICKS' end
local count=0
for _,_ in pairs(picks) do count=count+1 end
if count ~= tonumber(ARGV[4]) then return 'INVALID_PICKS' end
rec.picks=picks
rec.integrity='FULL_ORIGINAL_JOTFORM'
rec.hydrated_at=ARGV[5]
rec.picks_checksum=ARGV[6]
rec.source='JOTFORM_API_VERIFIED_RECOVERY'
redis.call('HSET',KEYS[1],ARGV[1],cjson.encode(rec))
return 'HYDRATED'
`;

export function parseOriginalSubmission(body, contract, name, originalId){
  const original=body?.content??body;
  if(String(original?.id??'')!==String(originalId)) throw Error('JOTFORM_ID_MISMATCH');
  if(String(original.form_id??original.formID??'')!==String(contract.form_id)) throw Error('JOTFORM_FORM_MISMATCH');
  if(!original.answers || typeof original.answers!=='object') throw Error('JOTFORM_ANSWERS_MISSING');
  const actual=resolveParticipant(original.answers,new Set(contract.roster.map(normalizeName)));
  if(actual!==normalizeName(name))throw Error('JOTFORM_PARTICIPANT_MISMATCH');
  const validated=validateWeeklyPicks(original.answers,contract);
  if(!validated.valid)throw Error('JOTFORM_INVALID_PICKS');
  return {picks:validated.picks,created_at:String(original.created_at||'')};
}
export function checksum(picks){
  return crypto.createHash('sha256').update(JSON.stringify(Object.entries(picks).sort(([a],[b])=>a.localeCompare(b)))).digest('hex');
}
export async function hydrateFirstValid(redis,formId,name,id,picks){
  const result=await redis(['EVAL',HYDRATE_CAS_LUA,1,`pmx:quiniela:jotform:first-valid:${formId}`,name,String(id),JSON.stringify(picks),String(Object.keys(picks).length),new Date().toISOString(),checksum(picks)]);
  if(!['HYDRATED','ALREADY_COMPLETE','SUBMISSION_MISMATCH','NOT_FOUND','CORRUPT_RECORD','INVALID_PICKS'].includes(result))throw Error('CAS_UNEXPECTED_REPLY');
  return result;
}
