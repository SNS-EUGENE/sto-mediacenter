// 카카오워크 알림 모듈

import { createClient } from '@supabase/supabase-js'

const KAKAOWORK_BOT_KEY = process.env.KAKAOWORK_BOT_KEY || ''
const KAKAOWORK_API_URL = 'https://api.kakaowork.com/v1'

// 기본 수신자 없음 - 설정 페이지에서 추가 필요
const DEFAULT_RECIPIENTS: string[] = []

interface KakaoWorkResponse {
  success: boolean
  error?: {
    code: string
    message: string
  }
}

/**
 * DB에서 알림 수신자 목록 조회
 */
async function getRecipients(): Promise<string[]> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'kakaowork_recipients')
      .single()

    if (error || !data?.value) {
      return DEFAULT_RECIPIENTS
    }

    const recipients = JSON.parse(data.value)
    return Array.isArray(recipients) && recipients.length > 0
      ? recipients
      : DEFAULT_RECIPIENTS
  } catch (error) {
    console.warn('[KakaoWork] Failed to load recipients from DB, using defaults:', error)
    return DEFAULT_RECIPIENTS
  }
}

/**
 * 이메일로 카카오워크 메시지 보내기
 */
async function sendMessageByEmail(email: string, text: string): Promise<KakaoWorkResponse> {
  if (!KAKAOWORK_BOT_KEY) {
    console.warn('[KakaoWork] Bot key not configured')
    return { success: false, error: { code: 'NO_KEY', message: 'Bot key not configured' } }
  }

  try {
    const response = await fetch(`${KAKAOWORK_API_URL}/messages.send_by_email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KAKAOWORK_BOT_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, text }),
    })

    const data = await response.json()

    if (!data.success) {
      console.error(`[KakaoWork] Failed to send to ${email}:`, data.error)
    }

    return data
  } catch (error) {
    console.error(`[KakaoWork] Error sending to ${email}:`, error)
    return { success: false, error: { code: 'FETCH_ERROR', message: String(error) } }
  }
}

/**
 * 모든 팀원에게 카카오워크 메시지 보내기
 */
export async function sendKakaoWorkNotification(text: string): Promise<void> {
  if (!KAKAOWORK_BOT_KEY) {
    console.warn('[KakaoWork] Bot key not configured, skipping notification')
    return
  }

  // DB에서 수신자 목록 조회
  const recipients = await getRecipients()

  console.log(`[KakaoWork] Sending notification to ${recipients.length} team members`)

  // 병렬로 모든 팀원에게 전송
  const results = await Promise.allSettled(
    recipients.map(email => sendMessageByEmail(email, text))
  )

  const successCount = results.filter(
    r => r.status === 'fulfilled' && r.value.success
  ).length

  console.log(`[KakaoWork] Notification sent: ${successCount}/${recipients.length} success`)
}

/**
 * 예약 변경 알림
 */
export async function notifyBookingChange(
  type: 'new' | 'updated' | 'cancelled',
  studioName: string,
  rentalDate: string,
  timeRange: string,
  applicantName: string
): Promise<void> {
  const typeText = {
    new: '새 예약',
    updated: '예약 변경',
    cancelled: '예약 취소',
  }[type]

  const emoji = {
    new: '📅',
    updated: '🔄',
    cancelled: '❌',
  }[type]

  const text = `${emoji} [${typeText}] ${studioName}
📆 ${rentalDate} ${timeRange}
👤 ${applicantName}`

  await sendKakaoWorkNotification(text)
}

/**
 * 만족도 조사 완료 알림
 */
export async function notifySurveyCompleted(
  studioName: string,
  rentalDate: string,
  timeRange: string
): Promise<void> {
  const text = `📝 [만족도 조사 완료]
${studioName} ${rentalDate} ${timeRange}`

  await sendKakaoWorkNotification(text)
}
