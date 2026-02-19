// Minimal Service Worker to enable PWA installation
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
    // Pass-through fetch (no caching for now to avoid complexity)
    event.respondWith(fetch(event.request));
});
