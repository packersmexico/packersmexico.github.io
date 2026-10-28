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
    // An accepted Web Push request does not prove the browser ran this worker.
    // Acknowledge only after showNotification resolves; this does not claim that
    // Android showed a visible banner.
    if (typeof data.ackId === 'string' && /^[a-f0-9]{48}$/.test(data.ackId) &&
        data.ackUrl === 'https://packersmexicogithubio-push-backend.vercel.app/api/subscribe') {
      try {
        await fetch(data.ackUrl, {
          method: 'POST',
          mode: 'cors',
          cache: 'no-store',
          headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
          body: JSON.stringify({ action: 'ack', ackId: data.ackId })
        });
      } catch (_) { /* Leave test as unacknowledged; never fabricate delivery. */ }
    }
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
