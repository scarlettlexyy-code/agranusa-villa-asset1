/* Service worker: membuat aplikasi tampil cepat dan tetap terbuka saat sinyal lemah.
   Data aset tidak pernah disimpan di sini; permintaan ke Apps Script selalu langsung ke server. */
var VERSI = 'agranusa-v1';
var INTI = ['./', 'index.html', 'config.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSI).then(function (c) { return c.addAll(INTI); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== VERSI; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var r = e.request;
  if (r.method !== 'GET') return;
  var u = new URL(r.url);
  if (u.hostname === 'script.google.com' || u.hostname.slice(-18) === 'googleusercontent.com') return;
  if (u.origin === self.location.origin) {
    e.respondWith(fetch(r).then(function (res) {
      var salin = res.clone(); caches.open(VERSI).then(function (c) { c.put(r, salin); }); return res;
    }).catch(function () { return caches.match(r).then(function (m) { return m || caches.match('index.html'); }); }));
    return;
  }
  e.respondWith(caches.match(r).then(function (m) {
    var net = fetch(r).then(function (res) {
      if (res && (res.ok || res.type === 'opaque')) { var salin = res.clone(); caches.open(VERSI).then(function (c) { c.put(r, salin); }); }
      return res;
    }).catch(function () { return m; });
    return m || net;
  }));
});
