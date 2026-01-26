// 구글 시트 연동 유틸리티
import { google } from 'googleapis'

// 구글 시트 ID를 URL에서 추출
export function extractSheetIdFromUrl(url: string): string | null {
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/)
  return match ? match[1] : null
}

// 구글 시트 인증 클라이언트 생성
export function getGoogleSheetsClient() {
  const credentials = process.env.GOOGLE_SERVICE_ACCOUNT_KEY

  if (!credentials) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY 환경 변수가 설정되지 않았습니다.')
  }

  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(credentials),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })

  return google.sheets({ version: 'v4', auth })
}

// 만족도조사 데이터를 구글 시트에 추가
export async function appendSurveyToSheet(
  spreadsheetId: string,
  surveyData: {
    submittedAt: string
    studioName: string
    rentalDate: string
    applicantName: string
    organization: string | null
    overallRating: number
    categoryRatings: Record<string, number>
    discoveryChannel: string
    benefits: string[]
    comment: string | null
  }
) {
  const sheets = getGoogleSheetsClient()

  // 카테고리별 평점 추출
  const categoryLabels = ['overall', 'staff_kindness', 'staff_expertise', 'booking_process', 'cleanliness', 'equipment']
  const categoryRatings = categoryLabels.map(key => surveyData.categoryRatings[key] || '')

  // 행 데이터 구성
  const row = [
    surveyData.submittedAt,
    surveyData.studioName,
    surveyData.rentalDate,
    surveyData.applicantName,
    surveyData.organization || '',
    ...categoryRatings,
    surveyData.discoveryChannel,
    surveyData.benefits.join(', '),
    surveyData.comment || '',
  ]

  // 시트에 데이터 추가
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'A:N', // A열부터 N열까지
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [row],
    },
  })
}

// 시트 헤더 확인 및 생성
export async function ensureSheetHeaders(spreadsheetId: string) {
  const sheets = getGoogleSheetsClient()

  // 첫 번째 행 확인
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'A1:N1',
  })

  // 헤더가 없으면 생성
  if (!response.data.values || response.data.values.length === 0) {
    const headers = [
      '제출일시',
      '스튜디오',
      '대관일',
      '신청자',
      '소속',
      '전반적 만족도',
      '직원 친절도',
      '장비 전문성',
      '예약 프로세스',
      '청결 상태',
      '장비 및 소품',
      '인지 경로',
      '도움이 된 부분',
      '기타 의견',
    ]

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'A1:N1',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [headers],
      },
    })
  }
}

// 시트 접근 권한 확인
export async function testSheetAccess(spreadsheetId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const sheets = getGoogleSheetsClient()

    // 시트 정보 조회 시도
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
    })

    return {
      success: true,
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류'

    if (errorMessage.includes('not found')) {
      return {
        success: false,
        error: '시트를 찾을 수 없습니다. URL을 확인해주세요.',
      }
    }

    if (errorMessage.includes('permission')) {
      return {
        success: false,
        error: '시트 접근 권한이 없습니다. 서비스 계정에 편집 권한을 부여해주세요.',
      }
    }

    return {
      success: false,
      error: errorMessage,
    }
  }
}
