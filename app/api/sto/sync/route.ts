// STO 예약 동기화 API
import { NextRequest, NextResponse } from 'next/server'
import { syncSTOBookings, getLastSyncTime, isSyncInProgress, initializePreviousStatusMap } from '@/lib/sto/sync'
import { isSessionValid } from '@/lib/sto/client'

// 동기화 실행
export async function POST() {
  try {
    // 세션 체크
    if (!isSessionValid()) {
      return NextResponse.json(
        { success: false, error: 'STO 로그인이 필요합니다.' },
        { status: 401 }
      )
    }

    // 동기화 실행
    const result = await syncSTOBookings()

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
