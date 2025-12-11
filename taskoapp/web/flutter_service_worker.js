// This is a placeholder service worker for development mode.
// In production builds, Flutter generates the actual service worker.
// This file prevents 404 errors during development.

self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', function(event) {
  // Do nothing - let the browser handle all requests normally
});
