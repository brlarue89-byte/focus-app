self.addEventListener('push', event => {
  const data = event.data?.json() || {}
  const title = data.title || 'Focus'
  const options = {
    body: data.body || 'Time to start your next task!',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || 'focus-reminder',
    data: { url: data.url || '/' },
    requireInteraction: false,
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) { client.focus(); return }
      }
      return clients.openWindow(url)
    })
  )
})

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', event => event.waitUntil(clients.claim()))
