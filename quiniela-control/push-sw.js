self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_) {}
  const title = data.title || 'PACKERS MÉXICO · Quiniela';
  const options = {
    body: data.body || 'Hay una actualización de la Quiniela.',
    tag: data.tag || data.eventKey || 'pmx-quiniela',
    renotify: true,
    data: { url: data.url || './' }
  };
  event.waitUntil((async () => {
    await self.registration.showNotification(title, options);
    // Local device-only receipt. Does not include subscription keys or private picks.
    // This proves the SW handled the push, not that Android displayed a banner.
    try {
      const cache=await caches.open('pmx-push-receipt-v1');
      const url=new URL('./.pmx-push-receipt',self.registration.scope).href;
      await cache.put(url,new Response(JSON.stringify({
        eventKey:String(data.eventKey||'').slice(0,120),
        receivedAt:new Date().toISOString()
      }),{headers:{'Content-Type':'application/json'}}));
    }catch(_){/* Cache is best-effort. Never block notification display. */}
  })());
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || './', self.location.origin).href;
  event.waitUntil((async () => {
    const list = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of list) {
      if ('focus' in client && client.url.startsWith(self.location.origin + '/quiniela-control/')) {
        await client.navigate(target);
        return client.focus();
      }
    }
    if (clients.openWindow) return clients.openWindow(target);
  })());
});
