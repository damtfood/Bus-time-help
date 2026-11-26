/* Service worker: shows bus alerts sent by /api/send-alerts and asks open tabs to play the chosen tone. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data.json() } catch (_) { d = { title: '🚌 Bus Timings', body: e.data ? e.data.text() : '' } }
  e.waitUntil((async () => {
    await self.registration.showNotification(d.title || '🚌 Bus Timings', {
      body: d.body || '', icon: '/logo.png', badge: '/logo.png', tag: d.tag || 'bus', renotify: true,
      vibrate: [200, 100, 200, 100, 400], requireInteraction: true, data: { url: d.url || '/' }
    });
    const cl = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    cl.forEach(c => c.postMessage({ type: 'play-tone', tone: d.tone || 'default' }));
  })());
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cl => {
    for (const c of cl) { if ('focus' in c) return c.focus() }
    return self.clients.openWindow(url);
  }));
});
