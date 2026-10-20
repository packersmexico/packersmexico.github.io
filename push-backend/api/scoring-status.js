import {redis} from '../lib/redis.js';
import {applyCors,json,rejectMethod} from '../lib/http.js';
export default async function handler(req,res){
 applyCors(req,res);res.setHeader('Cache-Control','no-store, max-age=0');
 if(req.method==='OPTIONS')return res.status(204).end();
 if(req.method!=='GET')return rejectMethod(req,res,['GET']);
 if(String(req.query?.week)!=='6')return json(res,404,{ok:false,error:'WEEK_NOT_SCORED'});
 try{
 const raw=await redis(['GET','pmx:quiniela:scoring:week:6']);
 if(!raw)return json(res,202,{ok:false,status:'PENDING_PRIVATE_SCORING'});
 const x=JSON.parse(raw);
 if(x.integrity!=='COMPLETE'||x.weekly?.length!==9||x.counts?.final!==14)return json(res,503,{ok:false,error:'SCORING_INTEGRITY_HOLD'});
 return json(res,200,{ok:true,week:6,source:x.source,source_url:x.source_url,counts:x.counts,weekly:x.weekly,season:x.season,checksum:x.checksum,calculated_at:x.calculated_at,picks_visible:false});
 }catch{return json(res,503,{ok:false,error:'REDIS_READ_FAILED'})}
}
