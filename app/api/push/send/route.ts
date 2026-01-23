import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

// VAPID 키 설정
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
const vapidEmail = process.env.VAPID_EMAIL || 'mailto:admin@example.com'

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey)
}

// Supabase Admin Client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { title, body, url, userId } = await request.json()

    if (!vapidPublicKey || !vapidPrivateKey) {
      return NextResponse.json({ error: 'VAPID keys not configured' }, { status: 500 })
    }

    // 구독 정보 조회 (특정 유저 또는 전체)
    let query = supabaseAdmin.from('push_subscriptions').select('*')
    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data: subscriptions, error } = await query

    if (error) {
      console.error('Failed to fetch subscriptions:', error)
      return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 })
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ message: 'No subscriptions found', sent: 0 })
    }

    // 푸시 발송
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        }

        const data = {
          title: title || '새 예약 알림',
          body: body || '새로운 예약이 등록되었습니다.',
          url: url || '/bookings',
          tag: `booking-${Date.now()}`,
        }

        // Base64 인코딩으로 한글 깨짐 방지
        const jsonStr = JSON.stringify(data)
        const base64Payload = Buffer.from(jsonStr, 'utf-8').toString('base64')
        const payload = JSON.stringify({ encoded: base64Payload })

        return webpush.sendNotification(pushSubscription, payload)
      })
    )

    // 실패한 구독 정리 (만료된 토큰 등)
    const failedEndpoints: string[] = []
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const error = result.reason
        if (error.statusCode === 410 || error.statusCode === 404) {
          // 구독 만료 - DB에서 삭제
          failedEndpoints.push(subscriptions[index].endpoint)
        }
      }
    })

    if (failedEndpoints.length > 0) {
      await supabaseAdmin
        .from('push_subscriptions')
        .delete()
        .in('endpoint', failedEndpoints)
    }

    const successCount = results.filter((r) => r.status === 'fulfilled').length

    return NextResponse.json({
      message: 'Push notifications sent',
      sent: successCount,
      failed: results.length - successCount,
    })
  } catch (error) {
    console.error('Push send error:', error)
    return NextResponse.json({ error: 'Failed to send push' }, { status: 500 })
  }
}
