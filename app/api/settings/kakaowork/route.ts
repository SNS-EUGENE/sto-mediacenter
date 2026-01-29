import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET: 카카오워크 알림 수신자 목록 조회
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'kakaowork_recipients')
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    // 저장된 값이 없으면 기본값 반환
    const recipients = data?.value ? JSON.parse(data.value) : [
      'sns.mediacenter@gmail.com',
      'sns.lim02@gmail.com',
      'garlim@kakao.com',
      'h_eugene0626@naver.com',
    ]

    return NextResponse.json({ recipients })
  } catch (error) {
    console.error('카카오워크 설정 조회 실패:', error)
    return NextResponse.json(
      { error: '설정 조회 실패' },
      { status: 500 }
    )
  }
}

// POST: 카카오워크 알림 수신자 목록 저장
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { recipients } = body

    if (!Array.isArray(recipients)) {
      return NextResponse.json(
        { error: '잘못된 형식입니다.' },
        { status: 400 }
      )
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const validEmails = recipients.filter((email: string) =>
      typeof email === 'string' && emailRegex.test(email.trim())
    ).map((email: string) => email.trim())

    // upsert (있으면 업데이트, 없으면 삽입)
    const { error } = await supabase
      .from('settings')
      .upsert({
        key: 'kakaowork_recipients',
        value: JSON.stringify(validEmails),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'key',
      })

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: `${validEmails.length}명의 수신자가 저장되었습니다.`,
      recipients: validEmails,
    })
  } catch (error) {
    console.error('카카오워크 설정 저장 실패:', error)
    return NextResponse.json(
      { error: '설정 저장 실패' },
      { status: 500 }
    )
  }
}
