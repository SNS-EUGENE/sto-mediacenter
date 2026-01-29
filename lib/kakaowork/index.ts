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
  console.log('[KakaoWork] getRecipients 시작')
  console.log('[KakaoWork] SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '설정됨' : '없음')
  console.log('[KakaoWork] SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '설정됨' : '없음')

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

    console.log('[KakaoWork] DB 조회 결과:', { data, error })

    if (error || !data?.value) {
      console.log('[KakaoWork] 수신자 없음, 기본값 반환')
      return DEFAULT_RECIPIENTS
    }

    const recipients = JSON.parse(data.value)
    console.log('[KakaoWork] 파싱된 수신자:', recipients)

    return Array.isArray(recipients) && recipients.length > 0
      ? recipients
      : DEFAULT_RECIPIENTS
  } catch (error) {
    console.error('[KakaoWork] DB 조회 실패:', error)
    return DEFAULT_RECIPIENTS
  }
}

/**
 * 이메일로 카카오워크 메시지 보내기
 */
async function sendMessageByEmail(email: string, text: string): Promise<KakaoWorkResponse> {
  console.log(`[KakaoWork] sendMessageByEmail 시작 - ${email}`)

  if (!KAKAOWORK_BOT_KEY) {
    console.error('[KakaoWork] Bot key가 설정되지 않음!')
    return { success: false, error: { code: 'NO_KEY', message: 'Bot key not configured' } }
  }

  try {
    const url = `${KAKAOWORK_API_URL}/messages.send_by_email`
    const body = { email, text }
    console.log(`[KakaoWork] API 호출: ${url}`)
    console.log(`[KakaoWork] 요청 body:`, JSON.stringify(body))

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KAKAOWORK_BOT_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    console.log(`[KakaoWork] API 응답 상태: ${response.status}`)
    const data = await response.json()
    console.log(`[KakaoWork] API 응답 데이터:`, JSON.stringify(data))

    if (!data.success) {
      console.error(`[KakaoWork] 전송 실패 - ${email}:`, data.error)
    } else {
      console.log(`[KakaoWork] 전송 성공 - ${email}`)
    }

    return data
  } catch (error) {
    console.error(`[KakaoWork] 예외 발생 - ${email}:`, error)
    return { success: false, error: { code: 'FETCH_ERROR', message: String(error) } }
  }
}

/**
 * 모든 팀원에게 카카오워크 메시지 보내기
 */
export async function sendKakaoWorkNotification(text: string): Promise<void> {
  console.log('[KakaoWork] ===== sendKakaoWorkNotification 시작 =====')
  console.log('[KakaoWork] 메시지:', text)
  console.log('[KakaoWork] BOT_KEY 상태:', KAKAOWORK_BOT_KEY ? `설정됨 (${KAKAOWORK_BOT_KEY.substring(0, 8)}...)` : '없음')

  if (!KAKAOWORK_BOT_KEY) {
    console.error('[KakaoWork] Bot key가 없어서 알림 전송 건너뜀!')
    return
  }

  // DB에서 수신자 목록 조회
  const recipients = await getRecipients()

  console.log(`[KakaoWork] 수신자 수: ${recipients.length}명`)
  console.log('[KakaoWork] 수신자 목록:', recipients)

  if (recipients.length === 0) {
    console.warn('[KakaoWork] 수신자가 없어서 알림 전송 건너뜀!')
    return
  }

  // 병렬로 모든 팀원에게 전송
  const results = await Promise.allSettled(
    recipients.map(email => sendMessageByEmail(email, text))
  )

  const successCount = results.filter(
    r => r.status === 'fulfilled' && r.value.success
  ).length

  console.log(`[KakaoWork] 전송 완료: ${successCount}/${recipients.length} 성공`)
  console.log('[KakaoWork] ===== sendKakaoWorkNotification 종료 =====')
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
  console.log('[KakaoWork] notifyBookingChange 호출됨:', { type, studioName, rentalDate, timeRange, applicantName })

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
