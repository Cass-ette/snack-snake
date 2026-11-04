// Keep this at the former app's /sw.js URL so existing visitors can migrate.
// No fetch handler: navigation must reach the current website, not an offline shell.
self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    await self.clients.claim();
    await self.registration.unregister();
    const windows = await self.clients.matchAll({ type: 'window' });
    await Promise.allSettled(windows.map(client => {
      const url = new URL(client.url);
      if (url.origin === self.location.origin) return client.navigate(url.href);
    }));
  })());
});
