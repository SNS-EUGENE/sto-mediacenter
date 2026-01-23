// Service Worker for Web Push Notifications
// Supabase + Web Push API

self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker installed')
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activated')
  event.waitUntil(self.clients.claim())
})

// 푸시 알림 수신
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event)

  const showNotification = async () => {
    let data = {
      title: '새 예약 알림',
      body: '새로운 예약이 등록되었습니다.',
      url: '/bookings',
    }

    if (event.data) {
      try {
        // ArrayBuffer를 UTF-8 문자열로 디코딩
        const buffer = await event.data.arrayBuffer()
        const decoder = new TextDecoder('utf-8')
        const text = decoder.decode(buffer)
        const parsed = JSON.parse(text)
        data = { ...data, ...parsed }
      } catch (e) {
        console.error('[SW] Parse error:', e)
        // 파싱 실패 시 기본값 사용
      }
    }

    const options = {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: data.tag || 'booking-notification',
      data: { url: data.url },
      vibrate: [200, 100, 200],
      actions: [
        { action: 'view', title: '확인하기' },
        { action: 'dismiss', title: '닫기' },
      ],
    }

    return self.registration.showNotification(data.title, options)
  }

  event.waitUntil(showNotification())
})

// 알림 클릭 핸들러
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event)

  event.notification.close()

  if (event.action === 'dismiss') return

  const urlToOpen = event.notification.data?.url || '/bookings'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // 이미 열린 창이 있으면 포커스
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(urlToOpen)
            return client.focus()
          }
        }
        // 없으면 새 창 열기
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen)
        }
      })
  )
})
