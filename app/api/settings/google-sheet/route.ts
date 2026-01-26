import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { extractSheetIdFromUrl, testSheetAccess } from '@/lib/google-sheets'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET: 구글 시트 설정 조회
export async function GET() {
  try {
    // URL 조회
    const { data: settings } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'survey_google_sheet_url')
      .single()

    // 동기화 실패 건수 조회
    const { count: failedCount } = await supabase
      .from('satisfaction_surveys')
      .select('id', { count: 'exact', head: true })
      .not('submitted_at', 'is', null)
      .eq('google_sheet_synced', false)

    return NextResponse.json({
      url: settings?.value || '',
      failedCount: failedCount || 0,
    })
  } catch (error) {
    console.error('Settings fetch error:', error)
    return NextResponse.json(
      { error: '설정 조회 실패' },
      { status: 500 }
    )
  }
}

// POST: 구글 시트 URL 저장
export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    // URL이 비어있으면 삭제
    if (!url) {
      await supabase
        .from('settings')
        .upsert({
          key: 'survey_google_sheet_url',
          value: null,
          description: '만족도조사 결과를 저장할 구글 시트 URL',
        }, { onConflict: 'key' })

      return NextResponse.json({ success: true })
    }

    // URL 유효성 검사
    const spreadsheetId = extractSheetIdFromUrl(url)
    if (!spreadsheetId) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 구글 시트 URL입니다.' },
        { status: 400 }
      )
    }

    // 시트 접근 권한 테스트
    const accessTest = await testSheetAccess(spreadsheetId)
    if (!accessTest.success) {
      return NextResponse.json(
        { success: false, error: accessTest.error },
        { status: 400 }
      )
    }

    // 설정 저장
    const { error } = await supabase
      .from('settings')
      .upsert({
        key: 'survey_google_sheet_url',
        value: url,
        description: '만족도조사 결과를 저장할 구글 시트 URL',
      }, { onConflict: 'key' })

    if (error) {
      console.error('Settings save error:', error)
      return NextResponse.json(
        { success: false, error: '설정 저장 실패' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Settings save error:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
