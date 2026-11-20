// Service worker: salva l'app sul dispositivo per usarla senza rete.
// La versione della cache cambia a ogni build, così gli aggiornamenti arrivano da soli.
const CACHE = 'balistica-a580fcd8fe';
const FILES = ["./","./index.html","./style.css","./app.js","./manifest.webmanifest","./icon-192.png","./icon-512.png","./icon-maskable-512.png","./apple-touch-icon.png"];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('balistica-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return fetch(e.request).catch(() => (e.request.mode === 'navigate' ? caches.match('./index.html') : Response.error()));
    })
  );
});
