// 이메일 발송 유틸리티
import { newBookingEmail, statusChangeEmail, surveyRequestEmail } from './templates'

const getBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

interface SendEmailParams {
  to: string | string[]
  subject: string
  html: string
  text?: string
}

async function sendEmail(params: SendEmailParams): Promise<boolean> {
  try {
    const baseUrl = getBaseUrl()
    const response = await fetch(`${baseUrl}/api/email/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('[Email] 발송 실패:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('[Email] 발송 오류:', error)
    return false
  }
}

// 새 예약 알림 이메일 발송
export async function sendNewBookingEmail(booking: {
  applicantName: string
  facilityName: string
  rentalDate: string
  timeSlots?: string
  organization?: string
}): Promise<boolean> {
  const adminEmails = process.env.ADMIN_NOTIFICATION_EMAILS?.split(',').map(e => e.trim()) || []

  if (adminEmails.length === 0) {
    console.log('[Email] ADMIN_NOTIFICATION_EMAILS 환경변수가 설정되지 않아 이메일을 발송하지 않습니다.')
    return false
  }

  const baseUrl = getBaseUrl()
  const html = newBookingEmail(booking, baseUrl)

  return sendEmail({
    to: adminEmails,
    subject: `[종로 스튜디오] 새 예약: ${booking.applicantName}님 - ${booking.facilityName}`,
    html,
  })
}

// 상태 변경 알림 이메일 발송
export async function sendStatusChangeEmail(
  booking: {
    applicantName: string
    facilityName: string
    rentalDate: string
  },
  oldStatus: string,
  newStatus: string
): Promise<boolean> {
  const adminEmails = process.env.ADMIN_NOTIFICATION_EMAILS?.split(',').map(e => e.trim()) || []

  if (adminEmails.length === 0) {
    console.log('[Email] ADMIN_NOTIFICATION_EMAILS 환경변수가 설정되지 않아 이메일을 발송하지 않습니다.')
    return false
  }

  const statusLabels: Record<string, string> = {
    CONFIRMED: '승인',
    CANCELLED: '취소',
    TENTATIVE: '대기',
    PENDING: '접수',
  }

  const baseUrl = getBaseUrl()
  const html = statusChangeEmail(booking, oldStatus, newStatus, baseUrl)

  return sendEmail({
    to: adminEmails,
    subject: `[종로 스튜디오] 예약 상태 변경: ${booking.applicantName}님 (${statusLabels[oldStatus] || oldStatus} → ${statusLabels[newStatus] || newStatus})`,
    html,
  })
}

// 만족도 조사 요청 이메일 발송
export async function sendSurveyRequestEmail(
  booking: {
    applicantName: string
    facilityName: string
    rentalDate: string
    timeSlots?: string
    email: string
  },
  surveyToken: string
): Promise<boolean> {
  if (!booking.email) {
    console.log('[Email] 이메일 주소가 없어 만족도 조사 메일을 발송하지 않습니다.')
    return false
  }

  const baseUrl = getBaseUrl()
  const surveyUrl = `${baseUrl}/survey/${surveyToken}`
  const html = surveyRequestEmail(booking, surveyUrl, baseUrl)

  return sendEmail({
    to: booking.email,
    subject: `[종로 스튜디오] ${booking.applicantName}님, 만족도 조사 참여 부탁드립니다`,
    html,
  })
}
