// Caches only this site's public files. No data, credentials, or GitHub API calls are cached.
const CACHE = 'camovault-assets-v1.7.0';
// Don't download 3 MB of optional 3D meshes as a prerequisite for activating
// a new version of the camo tracker. A single missing asset must not block SW.
const CORE = ['./', './index.html', './assets/style.css', './js/app.js', './js/catalog.js',
  './js/storage.js', './js/loadouts.js', './js/attachment-library.js', './js/github.js', './js/token-vault.js', './js/enhancements.js',
  './data/seasonal-weapons.json', './manifest.webmanifest'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(async cache => {
    await Promise.allSettled(CORE.map(url => cache.add(url)));
    await self.skipWaiting();
  }));
});
self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([caches.keys().then(names => Promise.all(names.filter(name => name.startsWith('camovault-assets-') && name !== CACHE).map(name => caches.delete(name)))), self.clients.claim()]));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  // Network-first for HTML updates; cache-first for known static modules, with offline support.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put('./index.html', copy)); }
      return response;
    }).catch(() => caches.match('./index.html')));
    return;
  }
  if (url.pathname.endsWith('/data/seasonal-weapons.json')) {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(request, copy)); }
      return response;
    }).catch(() => caches.match(request, {ignoreSearch:true})));
    return;
  }
  // Optional 3D assets are saved only after users open a weapon inspector.
  // Keep offline use possible without delaying the rest of the website.
  if (url.pathname.endsWith('.glb')) {
    event.respondWith(caches.match(request, {ignoreSearch:true}).then(cached => cached || fetch(request).then(response => {
      if (response.ok) {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE).then(cache => cache.put(request, copy)));
      }
      return response;
    })));
    return;
  }
  // Network first for scripts, styles, and catalog data to prevent mixed-version startup.
  if (/\.(?:js|css|json)$/.test(url.pathname)) {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE).then(cache => cache.put(request, copy)));
      }
      return response;
    }).catch(() => caches.match(request, {ignoreSearch:true})));
    return;
  }
  event.respondWith(caches.match(request, {ignoreSearch:true}).then(saved => saved || fetch(request)));
});
