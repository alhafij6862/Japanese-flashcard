// Service Worker: অ্যাপের ফাইলগুলো ফোনে জমা রাখে, যাতে ইন্টারনেট ছাড়াও চলে।
// ফাইল বদলালে নিচের সংখ্যা (v1 → v2) বাড়াতে হবে, নইলে ফোনে পুরনো ফাইলই দেখাবে।
const CACHE = "jp-flashcards-v1";
const FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./words.js",
  "./app.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  // পুরনো ভার্সনের জমা ফাইল মুছে ফেলা
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// জমা থাকলে সেখান থেকে, না থাকলে ইন্টারনেট থেকে
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request))
  );
});
