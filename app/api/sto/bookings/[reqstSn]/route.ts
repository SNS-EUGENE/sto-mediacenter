// STO 예약 상세 조회 API
import { NextRequest, NextResponse } from 'next/server'
import { fetchBookingDetail, isSessionValid } from '@/lib/sto/client'

// 예약 상세 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reqstSn: string }> }
) {
  try {
    // 세션 체크
    if (!isSessionValid()) {
      return NextResponse.json(
        { success: false, error: 'STO 로그인이 필요합니다.' },
        { status: 401 }
      )
    }

    const { reqstSn } = await params

    if (!reqstSn) {
      return NextResponse.json(
        { success: false, error: '예약 번호가 필요합니다.' },
        { status: 400 }
      )
    }

    const result = await fetchBookingDetail(reqstSn)

    return NextResponse.json({
      success: result.success,
      detail: result.detail,
      error: result.error,
    })
  } catch (error) {
    console.error('[API] STO 예약 상세 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
