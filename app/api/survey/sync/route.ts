import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { extractSheetIdFromUrl, appendSurveyToSheet, ensureSheetHeaders } from '@/lib/google-sheets'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST: 실패한 설문을 구글 시트에 재동기화
export async function POST(request: NextRequest) {
  try {
    const { surveyId } = await request.json()

    // 설정에서 구글 시트 URL 가져오기
    const { data: settings } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'survey_google_sheet_url')
      .single()

    if (!settings?.value) {
      return NextResponse.json(
        { error: '구글 시트 URL이 설정되지 않았습니다.' },
        { status: 400 }
      )
    }

    const spreadsheetId = extractSheetIdFromUrl(settings.value)
    if (!spreadsheetId) {
      return NextResponse.json(
        { error: '유효하지 않은 구글 시트 URL입니다.' },
        { status: 400 }
      )
    }

    // 단일 설문 재동기화
    if (surveyId) {
      const { data: survey, error } = await supabase
        .from('satisfaction_surveys')
        .select(`
          id,
          submitted_at,
          overall_rating,
          category_ratings,
          comment,
          improvement_request,
          booking:bookings (
            applicant_name,
            organization,
            rental_date,
            studio:studios (name)
          )
        `)
        .eq('id', surveyId)
        .single()

      if (error || !survey) {
        return NextResponse.json(
          { error: '설문을 찾을 수 없습니다.' },
          { status: 404 }
        )
      }

      if (!survey.submitted_at) {
        return NextResponse.json(
          { error: '아직 제출되지 않은 설문입니다.' },
          { status: 400 }
        )
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const booking = survey.booking as any

      // improvement_request에서 discovery_channel, benefits 추출
      let discoveryChannel = ''
      let benefits: string[] = []
      try {
        const additionalData = JSON.parse(survey.improvement_request || '{}')
        discoveryChannel = additionalData.discovery_channel || ''
        benefits = additionalData.benefits || []
      } catch {
        // JSON 파싱 실패 시 무시
      }

      try {
        await ensureSheetHeaders(spreadsheetId)
        await appendSurveyToSheet(spreadsheetId, {
          submittedAt: survey.submitted_at,
          studioName: booking?.studio?.name || '',
          rentalDate: booking?.rental_date || '',
          applicantName: booking?.applicant_name || '',
          organization: booking?.organization || null,
          overallRating: survey.overall_rating || 0,
          categoryRatings: survey.category_ratings || {},
          discoveryChannel,
          benefits,
          comment: survey.comment || null,
        })

        // 동기화 상태 업데이트
        await supabase
          .from('satisfaction_surveys')
          .update({
            google_sheet_synced: true,
            google_sheet_synced_at: new Date().toISOString(),
            google_sheet_sync_error: null,
          })
          .eq('id', surveyId)

        return NextResponse.json({ success: true })
      } catch (syncError: unknown) {
        const errorMessage = syncError instanceof Error ? syncError.message : '동기화 실패'

        await supabase
          .from('satisfaction_surveys')
          .update({
            google_sheet_sync_error: errorMessage,
          })
          .eq('id', surveyId)

        return NextResponse.json(
          { error: errorMessage },
          { status: 500 }
        )
      }
    }

    // 실패한 모든 설문 재동기화
    const { data: failedSurveys, error: fetchError } = await supabase
      .from('satisfaction_surveys')
      .select(`
        id,
        submitted_at,
        overall_rating,
        category_ratings,
        comment,
        improvement_request,
        booking:bookings (
          applicant_name,
          organization,
          rental_date,
          studio:studios (name)
        )
      `)
      .not('submitted_at', 'is', null)
      .eq('google_sheet_synced', false)
      .limit(50) // 한 번에 최대 50개

    if (fetchError) {
      return NextResponse.json(
        { error: '설문 목록 조회 실패' },
        { status: 500 }
      )
    }

    if (!failedSurveys || failedSurveys.length === 0) {
      return NextResponse.json({
        success: true,
        message: '동기화할 설문이 없습니다.',
        synced: 0,
        failed: 0,
      })
    }

    await ensureSheetHeaders(spreadsheetId)

    let synced = 0
    let failed = 0

    for (const survey of failedSurveys) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const booking = survey.booking as any

      // improvement_request에서 discovery_channel, benefits 추출
      let discoveryChannel = ''
      let benefits: string[] = []
      try {
        const additionalData = JSON.parse(survey.improvement_request || '{}')
        discoveryChannel = additionalData.discovery_channel || ''
        benefits = additionalData.benefits || []
      } catch {
        // JSON 파싱 실패 시 무시
      }

      try {
        await appendSurveyToSheet(spreadsheetId, {
          submittedAt: survey.submitted_at!,
          studioName: booking?.studio?.name || '',
          rentalDate: booking?.rental_date || '',
          applicantName: booking?.applicant_name || '',
          organization: booking?.organization || null,
          overallRating: survey.overall_rating || 0,
          categoryRatings: survey.category_ratings || {},
          discoveryChannel,
          benefits,
          comment: survey.comment || null,
        })

        await supabase
          .from('satisfaction_surveys')
          .update({
            google_sheet_synced: true,
            google_sheet_synced_at: new Date().toISOString(),
            google_sheet_sync_error: null,
          })
          .eq('id', survey.id)

        synced++
      } catch (syncError: unknown) {
        const errorMessage = syncError instanceof Error ? syncError.message : '동기화 실패'

        await supabase
          .from('satisfaction_surveys')
          .update({
            google_sheet_sync_error: errorMessage,
          })
          .eq('id', survey.id)

        failed++
      }
    }

    return NextResponse.json({
      success: true,
      message: `동기화 완료: ${synced}건 성공, ${failed}건 실패`,
      synced,
      failed,
    })
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
