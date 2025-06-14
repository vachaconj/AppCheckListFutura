// public/sw.js

// Este es un service worker mínimo. Su única función es existir
// para que el navegador considere la aplicación como instalable (PWA).
self.addEventListener('fetch', (event) => {
  // Por ahora, no manejamos el caché. Solo dejamos que la petición continúe.
  event.respondWith(fetch(event.request));
});