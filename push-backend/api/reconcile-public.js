// Public, explicitly requested synchronization of the ACTIVE quiniela form.
// Server-side only: no Jotform credentials, individual picks or submission IDs ever returned.
// Existing authenticated scheduled reconciliation remains the safety fallback.
import { redis } from '../lib/redis.js';
import { catchupWeek08 } from '../scripts/catchup-week08.mjs';
import { applyCors, json, rejectMethod, isAllowedOrigin } from '../lib/http.js';

export default async function handler(req, res) {
  applyCors(req, res);
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  if(req.method==='OPTIONS')return res.status(204).end();
  if(req.method!=='POST')return rejectMethod(req,res,['POST']);
  // The admin credential is never shipped to GitHub Pages.
  if(!req.headers.origin || !isAllowedOrigin(req))return json(res,403,{ok:false,error:'ORIGIN_NOT_ALLOWED'});
  if(process.env.VERCEL_ENV!=='production')return json(res,503,{ok:false,error:'PRODUCTION_ONLY'});
  const cooldown='pmx:quiniela:public:manual-reconcile-lock';
  try {
    // Global rate limit and concurrency lock, across browser sessions and instances.
    const lock=await redis(['SET',cooldown,new Date().toISOString(),'NX','EX',20]);
    if(lock!=='OK')return json(res,202,{ok:true,status:'RECONCILIATION_RECENTLY_REQUESTED',retry_after_seconds:20});
    const result=await catchupWeek08();
    if(!result.ok)return json(res,503,{ok:false,error:'RECONCILIATION_NOT_EXECUTED'});
    // Only anonymous aggregate totals. Never expose names, picks or raw IDs.
    return json(res,200,{
      ok:true,status:'JOTFORM_RECONCILED',week:result.week,
      jotform_submissions:result.jotform_submissions??null,
      valid_submissions:result.valid_submissions??null,
      rejected_submissions:result.rejected_submissions??null,
      verified_count:result.verified_count??null,
      added:result.added??0,
      checked_at:result.checked_at??new Date().toISOString()
    });
  } catch(err) {
    console.error('PMX_PUBLIC_MANUAL_RECONCILE_FAILED',String(err?.message||'UNKNOWN').replace(/[0-9]{10,}/g,'[REDACTED]'));
    return json(res,503,{ok:false,error:'MANUAL_RECONCILIATION_UNAVAILABLE'});
  }
}
