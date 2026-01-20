// Google OAuth 인증 API
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUrl, exchangeCodeForTokens } from '@/lib/google/gmail'

// OAuth URL 가져오기
export async function GET() {
  try {
    const authUrl = getAuthUrl()
    return NextResponse.json({ authUrl })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '인증 URL 생성 실패' },
      { status: 500 }
    )
  }
}

// 인증 코드로 토큰 교환
export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()

    if (!code) {
      return NextResponse.json({ error: '인증 코드가 필요합니다' }, { status: 400 })
    }

    const tokens = await exchangeCodeForTokens(code)

    return NextResponse.json({
      success: true,
      refreshToken: tokens.refresh_token,
      message: 'refresh_token을 .env.local의 GOOGLE_REFRESH_TOKEN에 저장하세요',
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '토큰 교환 실패' },
      { status: 500 }
    )
  }
}
