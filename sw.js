const CACHE = 'island-film-v12';
const ASSETS = ['./','./index.html','./styles.css','./develop-island.css','./camera-enhancements.css?v=12','./app.js?v=12','./manifest.webmanifest','./icon.svg'];

self.addEventListener('install', (event) => event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS))));
self.addEventListener('activate', (event) => event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))));
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});
