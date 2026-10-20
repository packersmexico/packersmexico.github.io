import webpush from 'web-push';
import {redis,keys} from '../lib/redis.js';
const eventKey='PMX_W6_FOUR_PNG_PRIVATE_QA_W7_OPEN_20261020';
if(process.env.VERCEL_ENV!=='production'){console.log('PMX_OPERATOR_STATUS_PUSH_SKIP_NONPRODUCTION');}
else{
 try{
  const existing=await redis(['GET',keys.sentFor('RODRIGO',eventKey)]);
  if(existing){console.log('PMX_OPERATOR_STATUS_PUSH',JSON.stringify({recipient:'RODRIGO',status:'ALREADY_SENT',eventKey}));}
  else{
   const raw=await redis(['GET',keys.subscriptionFor('RODRIGO')]);
   if(!raw)console.log('PMX_OPERATOR_STATUS_PUSH',JSON.stringify({recipient:'RODRIGO',status:'NOT_SUBSCRIBED',eventKey}));
   else {
    const {VAPID_PUBLIC_KEY:pub,VAPID_PRIVATE_KEY:priv,VAPID_SUBJECT:subject}=process.env;
    if(!pub||!priv||!subject)throw Error('VAPID_UNAVAILABLE');
    webpush.setVapidDetails(subject,pub,priv);
    const payload={title:'QUINIELA CONTROL · CORTE OPERATIVO',
      body:'W6: 4 PNG listos en repositorio PRIVADO de Producción. W7: formulario abierto. Pendientes: webhook Jotform y autorización 00/03.5 para descargas. Revisa #43.',
      url:'https://packersmexico.github.io/quiniela-control/',
      tag:'pmx-control-w6-four-private-png-20261020',eventKey};
    await webpush.sendNotification(JSON.parse(raw).subscription,JSON.stringify(payload),{TTL:86400,urgency:'normal'});
    const sentAt=new Date().toISOString();
    await redis(['SET',keys.sentFor('RODRIGO',eventKey),sentAt]);
    console.log('PMX_OPERATOR_STATUS_PUSH',JSON.stringify({recipient:'RODRIGO',status:'SENT',at:sentAt,eventKey}));
   }
  }
 }catch(err){console.warn('PMX_OPERATOR_STATUS_PUSH',JSON.stringify({recipient:'RODRIGO',status:'FAILED',reason:String(err.statusCode||err.message||'UNKNOWN').slice(0,70)}));}
}
