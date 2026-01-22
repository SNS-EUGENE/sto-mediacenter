// 푸시 알림 관련 유틸리티 (Supabase + Web Push API)
import { supabase } from '@/lib/supabase/client'

// 푸시 알림 권한 요청 및 구독 저장
export async function requestNotificationPermission(userId: string): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.log('This browser does not support notifications')
    return false
  }

  // 권한 요청
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    console.log('Notification permission denied')
    return false
  }

  // Service Worker 등록
  const registration = await registerServiceWorker()
  if (!registration) {
    console.error('Service Worker registration failed')
    return false
  }

  // Web Push 구독 생성
  const subscription = await subscribeToPush(registration)
  if (!subscription) {
    console.error('Push subscription failed')
    return false
  }

  // 구독 정보를 Supabase에 저장
  const subscriptionJSON = subscription.toJSON()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('push_subscriptions').upsert(
    {
      user_id: userId,
      endpoint: subscriptionJSON.endpoint,
      p256dh: subscriptionJSON.keys?.p256dh,
      auth: subscriptionJSON.keys?.auth,
      device_type: getDeviceType(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,endpoint' }
  )

  if (error) {
    console.error('Failed to save push subscription:', error)
    return false
  }

  console.log('Push notification enabled successfully')
  return true
}

// Web Push 구독 생성
async function subscribeToPush(registration: ServiceWorkerRegistration): Promise<PushSubscription | null> {
  try {
    // VAPID 공개키 (환경변수에서)
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!vapidPublicKey) {
      console.error('VAPID public key is not configured')
      return null
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    })

    return subscription
  } catch (error) {
    console.error('Push subscription error:', error)
    return null
  }
}

// 푸시 구독 해제
export async function unsubscribeFromPush(userId: string): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      await subscription.unsubscribe()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('endpoint', subscription.endpoint)
    }

    return true
  } catch (error) {
    console.error('Unsubscribe error:', error)
    return false
  }
}

// 현재 푸시 구독 상태 확인
export async function isPushSubscribed(userId: string): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator)) return false

    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (!subscription) return false

    // DB에서도 확인
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('push_subscriptions')
      .select('id')
      .eq('user_id', userId)
      .eq('endpoint', subscription.endpoint)
      .single()

    return !!data
  } catch {
    return false
  }
}

// Service Worker 등록
async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.error('Service Worker not supported')
    return null
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js')
    console.log('Service Worker registered:', registration.scope)
    return registration
  } catch (error) {
    console.error('Service Worker registration failed:', error)
    return null
  }
}

// 디바이스 타입 감지
function getDeviceType(): string {
  const ua = navigator.userAgent
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios'
  if (/Android/.test(ua)) return 'android'
  if (/Windows/.test(ua)) return 'windows'
  if (/Mac/.test(ua)) return 'mac'
  return 'web'
}

// Base64 URL을 Uint8Array로 변환 (VAPID 키용)
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const buffer = new ArrayBuffer(rawData.length)
  const outputArray = new Uint8Array(buffer)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
