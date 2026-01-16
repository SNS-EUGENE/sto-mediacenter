// STO 예약 목록 조회 API
import { NextRequest, NextResponse } from 'next/server'
import { fetchAllBookings, fetchBookingDetail, isSessionValid } from '@/lib/sto/client'

// 예약 목록 조회
export async function GET(request: NextRequest) {
  try {
    // 세션 체크
    if (!isSessionValid()) {
      return NextResponse.json(
        { success: false, error: 'STO 로그인이 필요합니다.' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const maxPages = parseInt(searchParams.get('maxPages') || '10', 10)

    const result = await fetchAllBookings(maxPages)

    return NextResponse.json({
      success: result.success,
      totalCount: result.totalCount,
      bookings: result.bookings,
      error: result.error,
    })
  } catch (error) {
    console.error('[API] STO 예약 목록 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
