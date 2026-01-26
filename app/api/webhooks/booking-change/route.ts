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
  studio_id: number
  rental_date: string
  applicant_name: string
  status: string
  time_slots?: number[]
  sto_reqst_sn?: string
  created_at: string
  updated_at: string
}

// time_slots 배열을 "HH~HH시" 형식으로 변환
function formatTimeSlots(timeSlots?: number[]): string {
  if (!timeSlots || timeSlots.length === 0) return ''
  const start = timeSlots[0]
  const end = timeSlots[timeSlots.length - 1] + 1
  return `${String(start).padStart(2, '0')}~${String(end).padStart(2, '0')}시`
}

// 스튜디오 ID → 이름 매핑
const studioNames: Record<number, string> = {
  1: '스튜디오 A',
  2: '스튜디오 B',
  3: '스튜디오 C',
  4: '편집실 1',
  5: '편집실 2',
}

function getStudioName(studioId: number): string {
  return studioNames[studioId] || `스튜디오 ${studioId}`
}

// 푸시 알림 발송
async function sendPushNotification(title: string, body: string, url?: string) {
  try {
    // 프로덕션 URL 고정 (VERCEL_URL은 프리뷰 URL이라 사용하면 안됨)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sto-mediacenter.vercel.app'

    console.log('[Webhook] 푸시 발송 시도:', baseUrl, { title, body, url })

    const response = await fetch(`${baseUrl}/api/push/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body, url: url || '/bookings' }),
    })

    const result = await response.json()
    console.log('[Webhook] 푸시 발송 결과:', response.status, result)
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
    const studioName = getStudioName(booking.studio_id)

    if (type === 'new') {
      // 새 예약 이메일은 lib/email/send.ts의 sendNewBookingEmail 사용
      const { sendNewBookingEmail } = await import('@/lib/email/send')
      await sendNewBookingEmail({
        applicantName: booking.applicant_name,
        facilityName: studioName,
        rentalDate: booking.rental_date,
      })
    } else if (type === 'status_change' && oldStatus) {
      const { sendStatusChangeEmail } = await import('@/lib/email/send')
      await sendStatusChangeEmail(
        {
          applicantName: booking.applicant_name,
          facilityName: studioName,
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

    console.log('[Webhook] 받은 Authorization:', authHeader)
    console.log('[Webhook] 예상 Authorization:', webhookSecret ? `Bearer ${webhookSecret}` : '(설정안됨)')

    if (webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
      console.warn('[Webhook] 인증 실패 - 불일치')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload: WebhookPayload = await request.json()
    console.log('[Webhook] 수신:', payload.type, payload.table)
    console.log('[Webhook] record:', JSON.stringify(payload.record))

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
      const studioName = getStudioName(booking.studio_id)
      const timeRange = formatTimeSlots(booking.time_slots)
      console.log('[Webhook] 새 예약:', booking.applicant_name, studioName)

      // 푸시 알림: {스튜디오명}에 {신청자명}님의 새로운 예약이 있습니다. (YYYY-MM-DD / HH~HH시)
      await sendPushNotification(
        '새 예약 알림',
        `${studioName}에 ${booking.applicant_name}님의 새로운 예약이 있습니다. (${booking.rental_date} / ${timeRange})`
      )

      // 이메일 알림
      await sendEmailNotification('new', booking)

      return NextResponse.json({
        success: true,
        action: 'new_booking_notification',
        booking: booking.id
      })
    }

    // UPDATE: 변경 감지
    if (payload.type === 'UPDATE' && payload.record && payload.old_record) {
      const newRecord = payload.record
      const oldRecord = payload.old_record
      const studioName = getStudioName(newRecord.studio_id)

      // 상태가 변경된 경우
      if (newRecord.status !== oldRecord.status) {
        console.log('[Webhook] 상태 변경:', oldRecord.status, '→', newRecord.status)

        const oldStatusLabel = statusLabels[oldRecord.status] || oldRecord.status
        const newStatusLabel = statusLabels[newRecord.status] || newRecord.status

        // 푸시 알림: {스튜디오명}에 {신청자명}님의 예약 상태가 {이전상태} → {새상태}와 같이 변경되었습니다.
        await sendPushNotification(
          '예약 상태 변경',
          `${studioName}에 ${newRecord.applicant_name}님의 예약 상태가 ${oldStatusLabel} → ${newStatusLabel}(으)로 변경되었습니다.`
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

      // 상태 외 다른 필드가 변경된 경우
      console.log('[Webhook] 예약 수정:', newRecord.applicant_name, studioName)

      // 날짜 변경 확인
      const dateChanged = newRecord.rental_date !== oldRecord.rental_date
      // 시간 변경 확인
      const oldTimeSlots = JSON.stringify(oldRecord.time_slots || [])
      const newTimeSlots = JSON.stringify(newRecord.time_slots || [])
      const timeChanged = oldTimeSlots !== newTimeSlots

      let updateMessage: string
      if (dateChanged) {
        // 날짜 변경: {스튜디오명}에 {신청자명}님의 예약이 수정되었습니다. (YYYY-MM-DD → YYYY-MM-DD)
        updateMessage = `${studioName}에 ${newRecord.applicant_name}님의 예약이 수정되었습니다. (${oldRecord.rental_date} → ${newRecord.rental_date})`
      } else if (timeChanged) {
        // 시간만 변경: {스튜디오명}에 {신청자명}님의 YYYY-MM-DD일자 예약 시간이 수정되었습니다. (HH~HH시 → HH~HH시)
        const oldTimeRange = formatTimeSlots(oldRecord.time_slots)
        const newTimeRange = formatTimeSlots(newRecord.time_slots)
        updateMessage = `${studioName}에 ${newRecord.applicant_name}님의 ${newRecord.rental_date}일자 예약 시간이 수정되었습니다. (${oldTimeRange} → ${newTimeRange})`
      } else {
        // 기타 변경
        updateMessage = `${studioName}에 ${newRecord.applicant_name}님의 예약이 수정되었습니다.`
      }

      await sendPushNotification('예약 수정', updateMessage)

      return NextResponse.json({
        success: true,
        action: 'booking_updated_notification',
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
