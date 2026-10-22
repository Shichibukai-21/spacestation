// SpaceStation offline cache. The page is network-first (so every push shows up on the next open) and falls back to
// the last copy when offline; its icons and the Google fonts are cached as they load. Weather always goes to the
// network: the page keeps its own last forecast.
const CACHE = 'ss-v2';
const SHELL = ['./', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'favicon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;
  if (req.mode === 'navigate') { // the page itself: fresh when online, the saved copy when not
    e.respondWith(fetch(req, { cache: 'no-cache' }).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put('./', c)); return r; })
      .catch(() => caches.match('./')));
    return;
  }
  const own = url.origin === location.origin, font = /^fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!own && !font) return; // weather, favicons of other sites: straight to the network
  e.respondWith(caches.match(req).then(hit => {
    const net = fetch(req).then(r => { if (r.ok || r.type === 'opaque') { const c = r.clone(); caches.open(CACHE).then(x => x.put(req, c)); } return r; });
    return hit ? (e.waitUntil(net.catch(() => {})), hit) : net;
  }));
});
