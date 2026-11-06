// Finance Track offline cache.
// The app's own files: network first (so updates arrive right away), the saved copy if the network is slow or blocked.
// Firebase's program files and the icon font: the saved copy first (their URLs never change), the network only the first time.
const CACHE = 'ft-v1';
const WAIT = 3500; // ms to wait for the network before using the saved copy

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (u.origin === self.location.origin) {
    if (u.searchParams.has('check')) return; // the update check always asks the server
    e.respondWith(networkFirst(req));
  } else if ((u.hostname === 'www.gstatic.com' && u.pathname.startsWith('/firebasejs/')) || u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com') {
    e.respondWith(cacheFirst(req));
  }
});

async function save(key, res) {
  if (res && (res.ok || res.type === 'opaque')) { const c = await caches.open(CACHE); await c.put(key, res.clone()); }
  return res;
}
async function networkFirst(req) {
  const u = new URL(req.url); const key = u.origin + u.pathname; // one saved copy per file, whatever the ?query
  const net = fetch(req).then((res) => save(key, res));
  const saved = await caches.match(key);
  if (!saved) return net;
  const timeout = new Promise((r) => setTimeout(() => r(null), WAIT));
  try { return (await Promise.race([net, timeout])) || saved; } catch { return saved; }
}
async function cacheFirst(req) {
  const saved = await caches.match(req);
  return saved || fetch(req).then((res) => save(req, res));
}
