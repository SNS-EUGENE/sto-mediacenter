// Gmail API를 사용하여 STO 인증 코드 자동 추출
import { google } from 'googleapis'

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']

// OAuth2 클라이언트 생성
function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth 설정이 필요합니다 (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)')
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    'https://developers.google.com/oauthplayground' // 리다이렉트 URI
  )

  if (refreshToken) {
    oauth2Client.setCredentials({ refresh_token: refreshToken })
  }

  return oauth2Client
}

// OAuth URL 생성 (처음 인증용)
export function getAuthUrl(): string {
  const oauth2Client = getOAuth2Client()
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  })
}

// 인증 코드로 토큰 교환
export async function exchangeCodeForTokens(code: string) {
  const oauth2Client = getOAuth2Client()
  const { tokens } = await oauth2Client.getToken(code)
  return tokens
}

// STO 인증 코드 이메일 검색 및 파싱
export async function fetchSTOVerificationCode(): Promise<{
  success: boolean
  code?: string
  error?: string
  emailDate?: string | null
}> {
  try {
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN
    if (!refreshToken) {
      return { success: false, error: 'GOOGLE_REFRESH_TOKEN이 설정되지 않았습니다' }
    }

    const oauth2Client = getOAuth2Client()
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

    // STO 인증 이메일 검색 (최근 10분 이내)
    // 수신자: sns.mediacenter@gmail.com (본인 메일함)
    // 발신자: STO 관련 또는 제목에 "인증" 포함
    const query = 'subject:인증 newer_than:10m'

    const listResponse = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 5,
    })

    const messages = listResponse.data.messages
    if (!messages || messages.length === 0) {
      return { success: false, error: '최근 10분 내 STO 인증 이메일이 없습니다' }
    }

    // 가장 최근 메일 가져오기
    const messageId = messages[0].id!
    const messageResponse = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full',
    })

    const message = messageResponse.data

    // 이메일 날짜 추출
    const headers = message.payload?.headers || []
    const dateHeader = headers.find(h => h.name?.toLowerCase() === 'date')
    const emailDate = dateHeader?.value

    // 이메일 본문 추출
    let body = ''

    // 멀티파트 메일 처리
    const extractBody = (payload: typeof message.payload): string => {
      if (!payload) return ''

      // 직접 body가 있는 경우
      if (payload.body?.data) {
        return Buffer.from(payload.body.data, 'base64').toString('utf-8')
      }

      // parts가 있는 경우 재귀적으로 탐색
      if (payload.parts) {
        for (const part of payload.parts) {
          // text/plain 또는 text/html 우선
          if (part.mimeType === 'text/plain' || part.mimeType === 'text/html') {
            if (part.body?.data) {
              return Buffer.from(part.body.data, 'base64').toString('utf-8')
            }
          }
          // 중첩된 multipart
          if (part.parts) {
            const nested = extractBody(part as typeof payload)
            if (nested) return nested
          }
        }
      }

      return ''
    }

    body = extractBody(message.payload)

    if (!body) {
      return { success: false, error: '이메일 본문을 추출할 수 없습니다' }
    }

    // 인증 코드 추출 (6자리 숫자)
    // 패턴: "822436" 형태의 6자리 숫자
    // HTML에서 추출할 수도 있으므로 태그 제거 후 검색
    const plainText = body.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')

    // STO 인증 코드 패턴 찾기
    // "인증코드" 근처의 6자리 숫자 또는 단독 6자리 숫자
    const codeMatch = plainText.match(/인증[^\d]*(\d{6})/i) ||
                      plainText.match(/코드[^\d]*(\d{6})/i) ||
                      plainText.match(/\b(\d{6})\b/)

    if (!codeMatch) {
      return { success: false, error: '인증 코드를 찾을 수 없습니다', emailDate }
    }

    return {
      success: true,
      code: codeMatch[1],
      emailDate,
    }

  } catch (error) {
    console.error('[Gmail] 인증 코드 조회 오류:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    }
  }
}

// 특정 시간 이후의 STO 인증 코드 대기 (폴링)
export async function waitForSTOVerificationCode(
  timeoutMs: number = 60000,
  pollIntervalMs: number = 3000
): Promise<{
  success: boolean
  code?: string
  error?: string
}> {
  const startTime = Date.now()

  while (Date.now() - startTime < timeoutMs) {
    const result = await fetchSTOVerificationCode()

    if (result.success && result.code) {
      return result
    }

    // 대기 후 재시도
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs))
  }

  return { success: false, error: `${timeoutMs / 1000}초 내에 인증 코드를 받지 못했습니다` }
}
