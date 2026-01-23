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
        const rawData = event.data.json()

        // Base64 인코딩된 데이터인 경우 디코딩
        if (rawData.encoded) {
          const decoded = atob(rawData.encoded)
          // UTF-8 바이트를 문자열로 변환
          const bytes = new Uint8Array(decoded.length)
          for (let i = 0; i < decoded.length; i++) {
            bytes[i] = decoded.charCodeAt(i)
          }
          const text = new TextDecoder('utf-8').decode(bytes)
          const parsed = JSON.parse(text)
          data = { ...data, ...parsed }
        } else {
          data = { ...data, ...rawData }
        }
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
