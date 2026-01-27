// 구글 시트 연동 유틸리티
// 2026년 온라인미디어센터 스튜디오 이용 만족도 조사 양식 기준
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

// 2026년 새 양식 데이터 타입
interface SurveyDataV2 {
  submittedAt: string
  studioName: string
  rentalDate: string
  applicantName: string
  organization: string | null
  // 항목별 만족도 (1-5점)
  categoryRatings: Record<string, number>
  // 조건부 질문 답변 (improvement_request JSON에서 파싱)
  overallReason: string
  equipmentImprovement: string
  costSmallStudio: string
  costLargeStudio: string
  // 추천/재이용 의향
  recommendation: string
  recommendationReason: string
  reuseIntention: string
  // 기타 의견
  comment: string | null
}

// 제출 일시를 YYYY-MM-DD HH:mm:ss 형식으로 변환 (한국 시간)
function formatSubmittedAt(isoString: string): string {
  const date = new Date(isoString)
  // 한국 시간으로 변환
  const kstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000))
  const year = kstDate.getUTCFullYear()
  const month = String(kstDate.getUTCMonth() + 1).padStart(2, '0')
  const day = String(kstDate.getUTCDate()).padStart(2, '0')
  const hours = String(kstDate.getUTCHours()).padStart(2, '0')
  const minutes = String(kstDate.getUTCMinutes()).padStart(2, '0')
  const seconds = String(kstDate.getUTCSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

// 만족도조사 데이터를 구글 시트에 추가 (2026년 양식)
export async function appendSurveyToSheet(
  spreadsheetId: string,
  surveyData: SurveyDataV2
) {
  const sheets = getGoogleSheetsClient()

  // 카테고리별 평점 추출 (새 양식: overall, equipment, staff, cost)
  const categoryKeys = ['overall', 'equipment', 'staff', 'cost']
  const categoryRatings = categoryKeys.map(key => surveyData.categoryRatings[key] || '')

  // 추천/재이용 의향 한글 변환
  const recommendationLabel = surveyData.recommendation === 'yes' ? '있다' : surveyData.recommendation === 'no' ? '없다' : ''
  const reuseLabel = surveyData.reuseIntention === 'yes' ? '있다' : surveyData.reuseIntention === 'no' ? '없다' : ''

  // 제출 일시 형식 변환 (YYYY-MM-DD HH:mm:ss)
  const formattedSubmittedAt = formatSubmittedAt(surveyData.submittedAt)

  // 행 데이터 구성 (2026년 양식)
  const row = [
    formattedSubmittedAt,                        // A: 제출일시 (YYYY-MM-DD HH:mm:ss)
    surveyData.studioName,                       // B: 스튜디오
    surveyData.rentalDate,                       // C: 방문일자
    surveyData.applicantName,                    // D: 이용자
    surveyData.organization || '',               // E: 업체명
    categoryRatings[0] || '',                    // F: 전반적 만족도
    surveyData.overallReason || '',              // G: 만족도 이유
    categoryRatings[1] || '',                    // H: 시설/장비 만족도
    surveyData.equipmentImprovement || '',       // I: 시설/장비 보완점
    categoryRatings[2] || '',                    // J: 직원 응대 만족도
    categoryRatings[3] || '',                    // K: 대관 비용 만족도
    surveyData.costSmallStudio || '',            // L: 1인 스튜디오 적정 비용
    surveyData.costLargeStudio || '',            // M: 대형 스튜디오 적정 비용
    recommendationLabel,                         // N: 추천 의향
    surveyData.recommendationReason || '',       // O: 추천 이유
    reuseLabel,                                  // P: 재이용 의향
    surveyData.comment || '',                    // Q: 기타 의견
  ]

  // 시트에 데이터 추가
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'A:Q', // A열부터 Q열까지
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [row],
    },
  })
}

// 시트 헤더 확인 및 생성 (2026년 양식)
export async function ensureSheetHeaders(spreadsheetId: string) {
  const sheets = getGoogleSheetsClient()

  // 첫 번째 행 확인
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'A1:Q1',
  })

  // 헤더가 없으면 생성
  if (!response.data.values || response.data.values.length === 0) {
    const headers = [
      '제출일시',           // A
      '스튜디오',           // B
      '방문일자',           // C
      '이용자',             // D
      '업체명',             // E
      '전반적 만족도',      // F
      '만족도 이유',        // G
      '시설/장비 만족도',   // H
      '시설/장비 보완점',   // I
      '직원 응대 만족도',   // J
      '대관 비용 만족도',   // K
      '1인 스튜디오 적정비용', // L
      '대형 스튜디오 적정비용', // M
      '추천 의향',          // N
      '추천 이유',          // O
      '재이용 의향',        // P
      '기타 의견',          // Q
    ]

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'A1:Q1',
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
    await sheets.spreadsheets.get({
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
