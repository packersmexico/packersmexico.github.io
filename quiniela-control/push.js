const PUSH_CONFIG_URL='./push-config.json';
const NOTIFICATIONS_URL='./notifications.json';
const push$=id=>document.getElementById(id);

function b64ToUint8Array(value){
  const pad='='.repeat((4-value.length%4)%4);
  const base64=(value+pad).replace(/-/g,'+').replace(/_/g,'/');
  const raw=atob(base64);
  return Uint8Array.from([...raw].map(ch=>ch.charCodeAt(0)));
}

function pushStatus(text,state='idle'){
  const el=push$('push-status');
  if(!el)return;
  el.textContent=text;
  el.dataset.state=state;
}

function renderNotices(items=[]){
  const wrap=push$('notification-list');
  if(!wrap)return;
  wrap.replaceChildren();
  if(!items.length){
    const p=document.createElement('p');
    p.className='notification-empty';
    p.textContent='SIN AVISOS OPERATIVOS.';
    wrap.append(p);
    return;
  }
  items.slice(0,5).forEach(item=>{
    const article=document.createElement('article');
    article.className='notification-item';
    const title=document.createElement('strong');
    title.textContent=item.title||'AVISO';
    const body=document.createElement('p');
    body.textContent=item.body||'';
    const links=document.createElement('div');
    links.className='notification-links';
    if(item.href){
      const a=document.createElement('a');
      a.href=item.href;a.textContent='ABRIR PANEL →';links.append(a);
    }
    if(item.secondary_href){
      const a=document.createElement('a');
      a.href=item.secondary_href;a.textContent=(item.secondary_label||'ABRIR')+' →';links.append(a);
    }
    article.append(title,body,links);
    wrap.append(article);
  });
}

async function loadNoticeCenter(){
  try{
    const r=await fetch(NOTIFICATIONS_URL+'?t='+Date.now(),{cache:'no-store'});
    if(!r.ok)throw new Error('HTTP '+r.status);
    const data=await r.json();
    renderNotices(data.items||[]);
  }catch(e){
    console.error(e);
    renderNotices([]);
  }
}

async function getRuntimeConfig(){
  const r=await fetch(PUSH_CONFIG_URL+'?t='+Date.now(),{cache:'no-store'});
  if(!r.ok)throw new Error('PUSH_CONFIG_HTTP_'+r.status);
  return r.json();
}

async function currentSubscription(registration){
  return registration.pushManager.getSubscription();
}

async function initializePush(){
  const button=push$('push-enable');
  if(!button)return;

  if(!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)){
    button.disabled=true;
    pushStatus('NO COMPATIBLE EN ESTE NAVEGADOR','off');
    return;
  }

  let localConfig;
  try{localConfig=await getRuntimeConfig();}
  catch(e){
    button.disabled=true;
    pushStatus('CONFIGURACIÓN NO DISPONIBLE','off');
    return;
  }

  if(!localConfig.enabled || !localConfig.api_base){
    button.hidden=true;
    pushStatus('CENTRO DE AVISOS ACTIVO','idle');
    return;
  }

  const api=String(localConfig.api_base).replace(/\/$/,'');
  const registration=await navigator.serviceWorker.register('./push-sw.js',{scope:'./'});
  let subscription=await currentSubscription(registration);

  const registered=localStorage.getItem('pmxPushRegistered')==='1';
  if(Notification.permission==='granted' && subscription && registered){
    button.textContent='NOTIFICACIONES ACTIVAS';
    button.disabled=true;
    pushStatus('ACTIVAS EN ESTE DISPOSITIVO','on');
    return;
  }

  button.disabled=false;
  pushStatus(Notification.permission==='denied'?'PERMISO BLOQUEADO EN EL NAVEGADOR':'LISTAS PARA ACTIVAR',Notification.permission==='denied'?'off':'idle');
  if(Notification.permission==='denied'){button.disabled=true;return;}

  button.addEventListener('click',async()=>{
    button.disabled=true;
    pushStatus('ACTIVANDO…','busy');
    try{
      const permission=await Notification.requestPermission();
      if(permission!=='granted')throw new Error('NOTIFICATION_PERMISSION_DENIED');

      const cfgResp=await fetch(api+'/api/config',{cache:'no-store'});
      if(!cfgResp.ok)throw new Error('CONFIG_HTTP_'+cfgResp.status);
      const cfg=await cfgResp.json();
      if(!cfg.enabled || !cfg.vapidPublicKey)throw new Error('BACKEND_NOT_READY');

      subscription=await currentSubscription(registration);
      if(!subscription){
        subscription=await registration.pushManager.subscribe({
          userVisibleOnly:true,
          applicationServerKey:b64ToUint8Array(cfg.vapidPublicKey)
        });
      }

      const code=window.prompt('Código de vinculación de Rodrigo');
      if(!code)throw new Error('REGISTRATION_CODE_REQUIRED');

      const save=await fetch(api+'/api/subscribe',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          registrationCode:code,
          subscription:subscription.toJSON(),
          deviceLabel:navigator.userAgent
        })
      });
      const payload=await save.json().catch(()=>({}));
      if(!save.ok)throw new Error(payload.error||('SUBSCRIBE_HTTP_'+save.status));

      localStorage.setItem('pmxPushRegistered','1');
      button.textContent='NOTIFICACIONES ACTIVAS';
      button.disabled=true;
      pushStatus('ACTIVAS EN ESTE DISPOSITIVO','on');
    }catch(error){
      console.error(error);
      button.disabled=false;
      const code=String(error?.message||'');
      pushStatus(
        code==='INVALID_REGISTRATION_CODE'?'CÓDIGO DE VINCULACIÓN INCORRECTO':
        code==='NOTIFICATION_PERMISSION_DENIED'?'PERMISO NO CONCEDIDO':
        code==='REGISTRATION_CODE_REQUIRED'?'ACTIVACIÓN CANCELADA':
        'NO SE PUDO ACTIVAR · INTENTA DE NUEVO',
        'off'
      );
    }
  });
}

loadNoticeCenter();
initializePush().catch(err=>{console.error(err);pushStatus('NO SE PUDO INICIAR PUSH','off');});
