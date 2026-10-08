// Caches only this site's public files. No data, credentials, or GitHub API calls are cached.
const CACHE = 'camovault-assets-v1.1.0';
const FILES = ['./', './index.html', './assets/style.css', './assets/favicon.svg', './js/catalog.js', './js/storage.js', './js/github.js', './js/app.js', './manifest.webmanifest'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting()));
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
  event.respondWith(caches.match(request).then(saved => saved || fetch(request)));
});
