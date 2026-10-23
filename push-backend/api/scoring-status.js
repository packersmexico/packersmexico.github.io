// Read-only aggregate rankings. Private submissions remain in Redis.
import {redis} from '../lib/redis.js';
import {applyCors,json,rejectMethod} from '../lib/http.js';
const BASE='https://raw.githubusercontent.com/packersmexico/packersmexico.github.io/main/quiniela-control/';
export default async function handler(req,res){
 applyCors(req,res);res.setHeader('Cache-Control','no-store,max-age=0');
 if(req.method==='OPTIONS')return res.status(204).end();
 if(req.method!=='GET')return rejectMethod(req,res,['GET']);
 const week=Number(req.query?.week);
 if(!Number.isInteger(week)||week<6||week>18)return json(res,404,{ok:false,error:'INVALID_WEEK'});
 try{
  const snapReq=await fetch(BASE+'weeks/week-'+String(week).padStart(2,'0')+'.json?t='+Date.now(),{cache:'no-store'});
  if(!snapReq.ok)return json(res,404,{ok:false,error:'WEEK_SOURCE_MISSING'});
  const snapshot=await snapReq.json();
  const length=snapshot.games?.length||0;
  if(!length||snapshot.week_number!==week||
     Number(snapshot.results?.final)!==length||snapshot.results?.status!=='FINAL')
    return json(res,202,{ok:false,status:'WAITING_ALL_NFL_FINALS'});
  const raw=await redis(['GET','pmx:quiniela:scoring:week:'+week]);
  if(!raw)return json(res,202,{ok:false,status:'PENDING_PRIVATE_SCORING'});
  const x=JSON.parse(raw);
  if(x.integrity!=='COMPLETE'||x.week!==week||x.weekly?.length!==9||
     x.season?.length!==9||x.counts?.final!==length)
    return json(res,503,{ok:false,error:'SCORING_INTEGRITY_HOLD'});
  return json(res,200,{ok:true,week,source:x.source,source_url:x.source_url,counts:x.counts,
    weekly:x.weekly,season:x.season,checksum:x.checksum,calculated_at:x.calculated_at,picks_visible:false});
 }catch{return json(res,503,{ok:false,error:'PRIVATE_SCORING_UNAVAILABLE'})}
}
