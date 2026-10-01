const PUSH_CONFIG_URL='./push-config.json';
const NOTIFICATIONS_URL='./notifications.json';
const push$=id=>document.getElementById(id);

function b64ToUint8Array(value){
  const pad='='.repeat((4-value.length%4)%4);
  const base64=(value+pad).replace(/-/g,'+').replace(/_/g,'/');
  const raw=atob(base64);
  return Uint8Array.from([...raw].map(ch=>ch.charCodeAt(0)));
}

function uint8ToB64Url(buffer){
  const bytes=new Uint8Array(buffer);
  let binary='';
  bytes.forEach(b=>{binary+=String.fromCharCode(b);});
  return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}

function serializeSubscription(subscription){
  const p256dh=subscription.getKey('p256dh');
  const auth=subscription.getKey('auth');
  if(!p256dh || !auth) throw new Error('SUBSCRIPTION_KEYS_MISSING');
  return {
    endpoint:subscription.endpoint,
    expirationTime:subscription.expirationTime??null,
    keys:{
      p256dh:uint8ToB64Url(p256dh),
      auth:uint8ToB64Url(auth)
    }
  };
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

function registerViaForm(api, registrationCode, subscription){
  return new Promise((resolve,reject)=>{
    const serialized=serializeSubscription(subscription);
    const target='pmx_push_'+Date.now()+'_'+Math.random().toString(36).slice(2);
    const iframe=document.createElement('iframe');
    iframe.name=target;
    iframe.hidden=true;

    const form=document.createElement('form');
    form.method='POST';
    form.action=api+'/api/subscribe-form';
    form.target=target;
    form.hidden=true;

    const fields={
      registrationCode,
      endpoint:serialized.endpoint,
      expirationTime:serialized.expirationTime??'',
      p256dh:serialized.keys.p256dh,
      auth:serialized.keys.auth,
      deviceLabel:navigator.userAgent
    };
    Object.entries(fields).forEach(([name,value])=>{
      const input=document.createElement('input');
      input.type='hidden';
      input.name=name;
      input.value=String(value??'');
      form.append(input);
    });

    const expectedOrigin=new URL(api).origin;
    let done=false;
    const cleanup=()=>{
      window.removeEventListener('message',onMessage);
      clearTimeout(timer);
      form.remove();
      iframe.remove();
    };
    const onMessage=(event)=>{
      if(event.origin!==expectedOrigin)return;
      if(event.data?.source!=='PMX_PUSH_SUBSCRIBE')return;
      done=true;
      cleanup();
      const payload=event.data.payload||{};
      if(payload.ok)return resolve(payload);
      reject(new Error(payload.error||'FORM_SUBSCRIBE_FAILED'));
    };
    window.addEventListener('message',onMessage);
    document.body.append(iframe,form);
    const timer=setTimeout(()=>{
      if(done)return;
      cleanup();
      reject(new Error('FORM_SUBSCRIBE_TIMEOUT'));
    },12000);
    form.submit();
  });
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
    let stage='PERMISO';
    try{
      const permission=await Notification.requestPermission();
      if(permission!=='granted')throw new Error('NOTIFICATION_PERMISSION_DENIED');

      stage='CONFIG';
      let vapidPublicKey=localConfig.vapid_public_key||'';
      if(!vapidPublicKey){
        const cfgResp=await fetch(api+'/api/config',{cache:'no-store'});
        if(!cfgResp.ok)throw new Error('CONFIG_HTTP_'+cfgResp.status);
        const cfg=await cfgResp.json();
        if(!cfg.enabled || !cfg.vapidPublicKey)throw new Error('BACKEND_NOT_READY');
        vapidPublicKey=cfg.vapidPublicKey;
      }

      stage='SUSCRIPCIÓN';
      subscription=await currentSubscription(registration);
      if(!subscription){
        const key=b64ToUint8Array(vapidPublicKey);
        subscription=await registration.pushManager.subscribe({
          userVisibleOnly:true,
          applicationServerKey:key.buffer
        });
      }

      stage='CÓDIGO';
      const code=window.prompt('Código de vinculación de Rodrigo');
      if(!code)throw new Error('REGISTRATION_CODE_REQUIRED');

      stage='REGISTRO';
      let payload;
      try{
        const save=await fetch(api+'/api/subscribe',{
          method:'POST',
          mode:'cors',
          headers:{'Content-Type':'text/plain;charset=UTF-8'},
          body:JSON.stringify({
            registrationCode:code,
            subscription:serializeSubscription(subscription),
            deviceLabel:navigator.userAgent
          })
        });
        payload=await save.json().catch(()=>({}));
        if(!save.ok)throw new Error(payload.error||('SUBSCRIBE_HTTP_'+save.status));
      }catch(fetchError){
        if(fetchError?.name!=='TypeError' && !String(fetchError?.message||'').includes('Load failed')) throw fetchError;
        stage='REGISTRO FALLBACK';
        payload=await registerViaForm(api,code,subscription);
      }

      localStorage.setItem('pmxPushRegistered','1');
      button.textContent='NOTIFICACIONES ACTIVAS';
      button.disabled=true;
      pushStatus('ACTIVAS EN ESTE DISPOSITIVO','on');
    }catch(error){
      console.error(error);
      button.disabled=false;
      const code=String(error?.message||error?.name||'UNKNOWN_PUSH_ERROR');
      const errorName=String(error?.name||'Error');
      const detail=(errorName+': '+code).slice(0,120);
      pushStatus(
        code==='INVALID_REGISTRATION_CODE'?'CÓDIGO DE VINCULACIÓN INCORRECTO':
        code==='NOTIFICATION_PERMISSION_DENIED'?'PERMISO NO CONCEDIDO':
        code==='REGISTRATION_CODE_REQUIRED'?'ACTIVACIÓN CANCELADA':
        code==='BACKEND_NOT_READY'?'BACKEND DE NOTIFICACIONES NO LISTO':
        code.startsWith('CONFIG_HTTP_')?'ERROR DE CONFIGURACIÓN · '+code.replace('CONFIG_HTTP_','HTTP '):
        code.startsWith('SUBSCRIBE_HTTP_')?'ERROR DE REGISTRO · '+code.replace('SUBSCRIBE_HTTP_','HTTP '):
        errorName==='AbortError'?'ACTIVACIÓN INTERRUMPIDA POR EL NAVEGADOR':
        errorName==='InvalidStateError'?'ESTADO DE PUSH INVÁLIDO · REABRE LA APP':
        errorName==='NotAllowedError'?'PERMISO DE NOTIFICACIONES BLOQUEADO':
        errorName==='NotSupportedError'?'PUSH NO SOPORTADO EN ESTE DISPOSITIVO':
        'ERROR '+stage+' · '+detail,
        'off'
      );
    }
  });
}

loadNoticeCenter();
initializePush().catch(err=>{console.error(err);pushStatus('NO SE PUDO INICIAR PUSH','off');});
