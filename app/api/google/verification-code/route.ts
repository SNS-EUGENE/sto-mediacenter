// STO 인증 코드 자동 조회 API
import { NextResponse } from 'next/server'
import { fetchSTOVerificationCode, waitForSTOVerificationCode } from '@/lib/google/gmail'

// 현재 인증 코드 조회
export async function GET() {
  try {
    const result = await fetchSTOVerificationCode()
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '조회 실패' },
      { status: 500 }
    )
  }
}

// 인증 코드 대기 (폴링)
export async function POST() {
  try {
    // 최대 60초 대기, 3초마다 체크
    const result = await waitForSTOVerificationCode(60000, 3000)
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '대기 실패' },
      { status: 500 }
    )
  }
}
