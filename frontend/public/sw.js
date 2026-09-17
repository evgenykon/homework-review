// Service worker нужен только для устанавливаемости PWA.
// Офлайн-режима нет: ничего не кэшируем, запросы идут напрямую в сеть.

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', () => {
  // network-only: намеренно не вызываем respondWith, чтобы ничего не кэшировать
})
