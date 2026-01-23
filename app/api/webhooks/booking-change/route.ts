// Supabase Database Webhook 엔드포인트
// bookings 테이블에 INSERT/UPDATE 발생 시 호출됨
import { NextRequest, NextResponse } from 'next/server'

// Webhook payload 타입 (Supabase Database Webhook 형식)
interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  schema: string
  record: BookingRecord | null
  old_record: BookingRecord | null
}

interface BookingRecord {
  id: string
  facility_name: string
  rental_date: string
  applicant_name: string
  status: string
  sto_reqst_sn?: string
  created_at: string
  updated_at: string
}

// 푸시 알림 발송
async function sendPushNotification(title: string, body: string, url?: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

    await fetch(`${baseUrl}/api/push/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body, url: url || '/bookings' }),
    })
  } catch (error) {
    console.error('[Webhook] 푸시 알림 발송 실패:', error)
  }
}

// 이메일 알림 발송
async function sendEmailNotification(
  type: 'new' | 'status_change',
  booking: BookingRecord,
  oldStatus?: string
) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

    if (type === 'new') {
      // 새 예약 이메일은 lib/email/send.ts의 sendNewBookingEmail 사용
      const { sendNewBookingEmail } = await import('@/lib/email/send')
      await sendNewBookingEmail({
        applicantName: booking.applicant_name,
        facilityName: booking.facility_name,
        rentalDate: booking.rental_date,
      })
    } else if (type === 'status_change' && oldStatus) {
      const { sendStatusChangeEmail } = await import('@/lib/email/send')
      await sendStatusChangeEmail(
        {
          applicantName: booking.applicant_name,
          facilityName: booking.facility_name,
          rentalDate: booking.rental_date,
        },
        oldStatus,
        booking.status
      )
    }
  } catch (error) {
    console.error('[Webhook] 이메일 발송 실패:', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    // Webhook 시크릿 검증 (선택사항이지만 권장)
    const webhookSecret = process.env.SUPABASE_WEBHOOK_SECRET
    const authHeader = request.headers.get('authorization')

    if (webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
      console.warn('[Webhook] 인증 실패')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload: WebhookPayload = await request.json()
    console.log('[Webhook] 수신:', payload.type, payload.table)

    // bookings 테이블만 처리
    if (payload.table !== 'bookings') {
      return NextResponse.json({ message: 'Ignored: not bookings table' })
    }

    const statusLabels: Record<string, string> = {
      CONFIRMED: '승인됨',
      CANCELLED: '취소됨',
      TENTATIVE: '대기중',
      PENDING: '접수됨',
    }

    // INSERT: 새 예약
    if (payload.type === 'INSERT' && payload.record) {
      const booking = payload.record
      console.log('[Webhook] 새 예약:', booking.applicant_name, booking.facility_name)

      // 푸시 알림
      await sendPushNotification(
        '새 예약 알림',
        `${booking.applicant_name}님이 ${booking.facility_name}을(를) 예약했습니다. (${booking.rental_date})`
      )

      // 이메일 알림
      await sendEmailNotification('new', booking)

      return NextResponse.json({
        success: true,
        action: 'new_booking_notification',
        booking: booking.id
      })
    }

    // UPDATE: 상태 변경 감지
    if (payload.type === 'UPDATE' && payload.record && payload.old_record) {
      const newRecord = payload.record
      const oldRecord = payload.old_record

      // 상태가 변경된 경우만 알림
      if (newRecord.status !== oldRecord.status) {
        console.log('[Webhook] 상태 변경:', oldRecord.status, '→', newRecord.status)

        const oldStatusLabel = statusLabels[oldRecord.status] || oldRecord.status
        const newStatusLabel = statusLabels[newRecord.status] || newRecord.status

        // 푸시 알림
        await sendPushNotification(
          '예약 상태 변경',
          `${newRecord.applicant_name}님의 예약: ${oldStatusLabel} → ${newStatusLabel}`
        )

        // 이메일 알림
        await sendEmailNotification('status_change', newRecord, oldRecord.status)

        return NextResponse.json({
          success: true,
          action: 'status_change_notification',
          booking: newRecord.id,
          oldStatus: oldRecord.status,
          newStatus: newRecord.status
        })
      }

      return NextResponse.json({
        message: 'No status change detected',
        booking: newRecord.id
      })
    }

    // DELETE: 예약 삭제 (알림 선택적)
    if (payload.type === 'DELETE' && payload.old_record) {
      console.log('[Webhook] 예약 삭제:', payload.old_record.id)
      // 삭제 알림은 현재 발송하지 않음
      return NextResponse.json({
        message: 'Delete event received',
        booking: payload.old_record.id
      })
    }

    return NextResponse.json({ message: 'Event processed' })
  } catch (error) {
    console.error('[Webhook] 오류:', error)
    return NextResponse.json(
      { error: '웹훅 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// GET은 상태 확인용
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/webhooks/booking-change',
    description: 'Supabase Database Webhook for bookings table',
    events: ['INSERT', 'UPDATE'],
  })
}
