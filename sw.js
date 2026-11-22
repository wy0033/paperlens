/* PaperLens Service Worker：离线缓存（PWA）。
 * 缓存策略：同源资源 stale-while-revalidate（先用缓存，后台更新），
 * 跨域请求（如 OpenAlex）不拦截，直接走网络。
 * 发布新版本时请递增 CACHE 版本号。
 */
const CACHE = 'paperlens-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/styles.css',
  './assets/data.js',
  './assets/engine.js',
  './assets/app.js',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-192.png',
  './assets/icons/icon-maskable-512.png',
  './assets/icons/apple-touch-icon.png',
  './assets/icons/favicon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // 跨域不拦截

  event.respondWith(
    caches.match(req).then(cached => {
      const network = fetch(req).then(res => {
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(req, clone));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
