import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { extractSheetIdFromUrl, appendSurveyToSheet, ensureSheetHeaders } from '@/lib/google-sheets'
import { notifySurveyCompleted } from '@/lib/kakaowork'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// time_slots 배열을 "HH~HH시" 형식으로 변환
function formatTimeSlots(timeSlots?: number[]): string {
  if (!timeSlots || timeSlots.length === 0) return ''
  const start = timeSlots[0]
  const end = timeSlots[timeSlots.length - 1] + 1
  return `${String(start).padStart(2, '0')}~${String(end).padStart(2, '0')}시`
}

// 푸시 알림 발송
async function sendPushNotification(title: string, body: string, url?: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sto-mediacenter.vercel.app'

    await fetch(`${baseUrl}/api/push/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body, url: url || '/surveys' }),
    })
  } catch (error) {
    console.error('[Survey] 푸시 알림 발송 실패:', error)
  }
}

// 구글 시트 동기화 함수 (2026년 새 양식)
async function syncToGoogleSheet(surveyId: string, surveyData: {
  submittedAt: string
  studioName: string
  rentalDate: string
  applicantName: string
  organization: string | null
  categoryRatings: Record<string, number>
  overallReason: string
  equipmentImprovement: string
  costSmallStudio: string
  costLargeStudio: string
  recommendation: string
  recommendationReason: string
  reuseIntention: string
  comment: string | null
}) {
  try {
    // 설정에서 구글 시트 URL 가져오기
    const { data: settings } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'survey_google_sheet_url')
      .single()

    if (!settings?.value) {
      console.log('Google Sheet URL not configured, skipping sync')
      return { synced: false, error: '구글 시트 URL이 설정되지 않았습니다.' }
    }

    const spreadsheetId = extractSheetIdFromUrl(settings.value)
    if (!spreadsheetId) {
      return { synced: false, error: '유효하지 않은 구글 시트 URL입니다.' }
    }

    // 헤더 확인 및 생성
    await ensureSheetHeaders(spreadsheetId)

    // 데이터 추가
    await appendSurveyToSheet(spreadsheetId, surveyData)

    // 동기화 상태 업데이트
    await supabase
      .from('satisfaction_surveys')
      .update({
        google_sheet_synced: true,
        google_sheet_synced_at: new Date().toISOString(),
        google_sheet_sync_error: null,
      })
      .eq('id', surveyId)

    return { synced: true }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류'
    console.error('Google Sheet sync error:', error)

    // 동기화 실패 상태 업데이트
    await supabase
      .from('satisfaction_surveys')
      .update({
        google_sheet_synced: false,
        google_sheet_sync_error: errorMessage,
      })
      .eq('id', surveyId)

    return { synced: false, error: errorMessage }
  }
}

// GET: 토큰으로 조사 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    // 조사 조회 (예약 정보 포함)
    const { data: survey, error } = await supabase
      .from('satisfaction_surveys')
      .select(`
        id,
        booking_id,
        submitted_at,
        expires_at,
        booking:bookings (
          applicant_name,
          organization,
          rental_date,
          time_slots,
          purpose,
          studio:studios (
            name
          )
        )
      `)
      .eq('token', token)
      .single()

    if (error || !survey) {
      return NextResponse.json(
        { error: '유효하지 않은 조사 링크입니다.' },
        { status: 404 }
      )
    }

    // 만료 체크
    if (new Date(survey.expires_at) < new Date()) {
      return NextResponse.json(
        { error: '만료된 조사 링크입니다.' },
        { status: 410 }
      )
    }

    // 예약 시작 시간 이전 접근 차단 (한국 시간 기준)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const booking = survey.booking as any
    if (booking?.rental_date && booking?.time_slots?.length > 0) {
      const startHour = Math.min(...booking.time_slots)
      // 한국 시간대(KST, UTC+9) 명시
      const bookingStartTime = new Date(`${booking.rental_date}T${String(startHour).padStart(2, '0')}:00:00+09:00`)
      const now = new Date()

      if (now < bookingStartTime) {
        return NextResponse.json({
          error: '아직 설문에 참여할 수 없습니다.',
          accessDenied: true,
          availableFrom: bookingStartTime.toISOString(),
          rentalDate: booking.rental_date,
          startHour: startHour,
        }, { status: 403 })
      }
    }

    return NextResponse.json({ survey })
  } catch (error) {
    console.error('Survey fetch error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// POST: 조사 제출
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = await request.json()

    const {
      overall_rating,
      category_ratings,
      comment,
      improvement_request,
      reuse_intention,
      nps_score,
    } = body

    // 조사 존재 여부 및 상태 확인 (예약 정보 포함)
    const { data: survey, error: fetchError } = await supabase
      .from('satisfaction_surveys')
      .select(`
        id,
        submitted_at,
        expires_at,
        booking:bookings (
          applicant_name,
          organization,
          rental_date,
          time_slots,
          studio:studios (name)
        )
      `)
      .eq('token', token)
      .single()

    if (fetchError || !survey) {
      return NextResponse.json(
        { error: '유효하지 않은 조사 링크입니다.' },
        { status: 404 }
      )
    }

    if (survey.submitted_at) {
      return NextResponse.json(
        { error: '이미 제출된 조사입니다.' },
        { status: 400 }
      )
    }

    if (new Date(survey.expires_at) < new Date()) {
      return NextResponse.json(
        { error: '만료된 조사 링크입니다.' },
        { status: 410 }
      )
    }

    // 필수 값 검증
    if (!overall_rating || overall_rating < 1 || overall_rating > 5) {
      return NextResponse.json(
        { error: '전체 만족도(1-5)를 선택해주세요.' },
        { status: 400 }
      )
    }

    // 제출 시각
    const submittedAt = new Date().toISOString()

    // 조사 업데이트
    const { error: updateError } = await supabase
      .from('satisfaction_surveys')
      .update({
        overall_rating,
        category_ratings: category_ratings || {},
        comment: comment || null,
        improvement_request: improvement_request || null,
        reuse_intention: reuse_intention || null,
        nps_score: nps_score >= 0 ? nps_score : null,
        submitted_at: submittedAt,
      })
      .eq('id', survey.id)

    if (updateError) {
      console.error('Survey update error:', updateError)
      return NextResponse.json(
        { error: '제출 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }

    // 구글 시트 동기화 (백그라운드에서 실행, 실패해도 응답에 영향 없음)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const booking = survey.booking as any
    if (booking) {
      // improvement_request에서 새 양식 필드 추출
      let overallReason = ''
      let equipmentImprovement = ''
      let costSmallStudio = ''
      let costLargeStudio = ''
      let recommendation = ''
      let recommendationReason = ''
      let reuseIntentionValue = ''
      try {
        const additionalData = JSON.parse(improvement_request || '{}')
        overallReason = additionalData.overall_reason || ''
        equipmentImprovement = additionalData.equipment_improvement || ''
        costSmallStudio = additionalData.cost_small_studio || ''
        costLargeStudio = additionalData.cost_large_studio || ''
        recommendation = additionalData.recommendation || ''
        recommendationReason = additionalData.recommendation_reason || ''
        reuseIntentionValue = additionalData.reuse_intention || ''
      } catch {
        // JSON 파싱 실패 시 무시
      }

      syncToGoogleSheet(survey.id, {
        submittedAt,
        studioName: booking.studio?.name || '',
        rentalDate: booking.rental_date,
        applicantName: booking.applicant_name,
        organization: booking.organization,
        categoryRatings: category_ratings || {},
        overallReason,
        equipmentImprovement,
        costSmallStudio,
        costLargeStudio,
        recommendation,
        recommendationReason,
        reuseIntention: reuseIntentionValue,
        comment: comment || null,
      }).catch(err => {
        console.error('Background Google Sheet sync failed:', err)
      })

      // 푸시 알림 발송: OO스튜디오 YYYY-MM-DD HH~HH시 예약 건에 대한 만족도 조사가 완료되었습니다.
      const studioName = booking.studio?.name || '스튜디오'
      const timeRange = formatTimeSlots(booking.time_slots)
      sendPushNotification(
        '만족도 조사 완료',
        `${studioName} ${booking.rental_date} ${timeRange} 예약 건에 대한 만족도 조사가 완료되었습니다.`
      ).catch(err => {
        console.error('Background push notification failed:', err)
      })

      // 카카오워크 알림 발송
      notifySurveyCompleted(studioName, booking.rental_date, timeRange).catch(err => {
        console.error('Background KakaoWork notification failed:', err)
      })
    }

    return NextResponse.json({
      success: true,
      message: '만족도 조사가 제출되었습니다.',
    })
  } catch (error) {
    console.error('Survey submit error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
