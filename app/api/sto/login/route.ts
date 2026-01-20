// STO 로그인 API
import { NextRequest, NextResponse } from 'next/server'
import { loginToSTO, autoLoginToSTO } from '@/lib/sto/client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, verificationCode, autoLogin } = body

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: '아이디와 비밀번호를 입력하세요.' },
        { status: 400 }
      )
    }

    // 자동 로그인 모드 (Gmail에서 인증코드 자동 추출)
    if (autoLogin) {
      console.log('[API] STO 자동 로그인 시작')
      const result = await autoLoginToSTO({ email, password })

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 401 }
        )
      }

      return NextResponse.json({
        success: true,
        message: '자동 로그인 성공',
        expiresAt: result.session?.expiresAt,
      })
    }

    // 기존 수동 로그인 모드
    const result = await loginToSTO({ email, password }, verificationCode)

    if (result.needsVerification) {
      return NextResponse.json({
        success: false,
        needsVerification: true,
        message: '이메일로 발송된 인증코드를 입력하세요.',
      })
    }

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 401 }
      )
    }

    // 세션 정보 반환 (쿠키는 서버에서 관리)
    return NextResponse.json({
      success: true,
      message: '로그인 성공',
      expiresAt: result.session?.expiresAt,
    })
  } catch (error) {
    console.error('[API] STO 로그인 오류:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 세션 상태 확인
export async function GET() {
  const { isSessionValid, getCurrentSession } = await import('@/lib/sto/client')

  const valid = isSessionValid()
  const session = getCurrentSession()

  return NextResponse.json({
    isValid: valid,
    expiresAt: session?.expiresAt || null,
  })
}
