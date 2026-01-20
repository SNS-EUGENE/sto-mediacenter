// STO 예약 동기화 API
import { NextRequest, NextResponse } from 'next/server'
import { syncSTOBookings, getLastSyncTime, isSyncInProgress, initializePreviousStatusMap } from '@/lib/sto/sync'
import { isSessionValid } from '@/lib/sto/client'

// 동기화 실행
export async function POST(request: NextRequest) {
  try {
    // 세션 체크
    if (!isSessionValid()) {
      return NextResponse.json(
        { success: false, error: 'STO 로그인이 필요합니다.' },
        { status: 401 }
      )
    }

    // 요청 body에서 옵션 추출
    let maxRecords = 10  // 기본: 1페이지 (10건)
    let fetchDetail = true
    try {
      const body = await request.json()
      if (body.maxRecords !== undefined) maxRecords = body.maxRecords
      if (body.fetchDetail !== undefined) fetchDetail = body.fetchDetail
    } catch {
      // body가 없는 경우 기본값 사용 (10건)
    }

    // 동기화 실행
    const result = await syncSTOBookings(maxRecords, fetchDetail)

    return NextResponse.json({
      success: result.success,
      totalCount: result.totalCount,
      newBookingsCount: result.newBookings.length,
      statusChangesCount: result.statusChanges.length,
      newBookings: result.newBookings.map(b => ({
        reqstSn: b.reqstSn,
        facilityName: b.facilityName,
        rentalDate: b.rentalDate,
        applicantName: b.applicantName,
        status: b.status,
      })),
      statusChanges: result.statusChanges,
      errors: result.errors,
      syncedAt: result.syncedAt,
    })
  } catch (error) {
    console.error('[API] STO 동기화 오류:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 동기화 상태 확인
export async function GET() {
  return NextResponse.json({
    lastSyncTime: getLastSyncTime(),
    isSyncing: isSyncInProgress(),
    isLoggedIn: isSessionValid(),
  })
}

// 이전 상태 맵 초기화 (서버 시작 시 호출)
export async function PUT() {
  try {
    await initializePreviousStatusMap()
    return NextResponse.json({ success: true, message: '상태 맵 초기화 완료' })
  } catch (error) {
    console.error('[API] 상태 맵 초기화 오류:', error)
    return NextResponse.json(
      { success: false, error: '초기화 실패' },
      { status: 500 }
    )
  }
}

// STO 연동 데이터 삭제
export async function DELETE() {
  try {
    const { supabase } = await import('@/lib/supabase/client')

    // sto_reqst_sn이 있는 예약만 삭제
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error, count } = await (supabase as any)
      .from('bookings')
      .delete({ count: 'exact' })
      .not('sto_reqst_sn', 'is', null)

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `STO 연동 데이터 ${count || 0}건 삭제 완료`
    })
  } catch (error) {
    console.error('[API] STO 데이터 삭제 오류:', error)
    return NextResponse.json(
      { success: false, error: '삭제 실패' },
      { status: 500 }
    )
  }
}
