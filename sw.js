const CACHE_NAME = 'bd-pro-v4-mobile-v4.1.0';

const APP_FILES = [
  './',
  './index.html',
  './mobile.html',
  './manifest.json'
];

// Installation : mise en cache de la nouvelle version
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting())
  );
});

// Activation : suppression des anciens caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Navigation / fichiers de l'application
self.addEventListener('fetch', event => {
  const request = event.request;

  // Ne pas intercepter les requêtes POST
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // Ne pas intercepter les ressources externes
  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then(response => {
        // Mettre à jour le cache avec la nouvelle version
        if (response && response.status === 200) {
          const copy = response.clone();

          caches.open(CACHE_NAME)
            .then(cache => cache.put(request, copy))
            .catch(() => {});
        }

        return response;
      })
      .catch(() => {
        // Si Internet est indisponible, utiliser le cache
        return caches.match(request)
          .then(cached => {
            if (cached) {
              return cached;
            }

            // Pour une navigation, retourner l'application
            if (request.mode === 'navigate') {
              return caches.match('./mobile.html');
            }

            return new Response('', {
              status: 503,
              statusText: 'Offline'
            });
          });
      })
  );
});

// Permet de forcer immédiatement l'activation
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
