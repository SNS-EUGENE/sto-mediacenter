// STO 백그라운드 동기화 Cron API
// Vercel Cron 또는 외부 스케줄러에서 호출
// 업무 시간(09:00~18:00) 동안 10분마다 실행

import { NextRequest, NextResponse } from 'next/server'
import { isSessionValid, setSession } from '@/lib/sto/client'
import { syncSTOBookings } from '@/lib/sto/sync'
import {
  loadSessionFromDB,
  saveSessionToDB,
  updateLastSyncTime,
  isBusinessHours,
  shouldSync,
  extendSessionExpiry,
} from '@/lib/sto/session-store'

// Vercel Cron 설정 (vercel.json에서도 설정 필요)
export const runtime = 'nodejs'
export const maxDuration = 60 // 최대 60초

export async function GET(request: NextRequest) {
  // Cron 인증 (Vercel Cron은 CRON_SECRET 헤더로 인증)
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  // CRON_SECRET이 설정되어 있으면 인증 체크
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // 1. 업무 시간 체크
    if (!isBusinessHours()) {
      return NextResponse.json({
        success: false,
        message: '업무 시간(09:00~18:00)이 아닙니다.',
        skipped: true,
      })
    }

    // 2. 동기화 필요 여부 체크 (10분 간격)
    const needsSync = await shouldSync(10)
    if (!needsSync) {
      return NextResponse.json({
        success: true,
        message: '아직 동기화 간격이 아닙니다.',
        skipped: true,
      })
    }

    // 3. 세션 로드 (메모리 → DB)
    if (!isSessionValid()) {
      const storedSession = await loadSessionFromDB()
      if (storedSession) {
        setSession(storedSession)
        console.log('[Cron] DB에서 세션 로드 완료')
      } else {
        return NextResponse.json({
          success: false,
          message: '활성 세션 없음. 수동 로그인 필요.',
          needsLogin: true,
        })
      }
    }

    // 4. 동기화 실행
    console.log('[Cron] 동기화 시작...')
    const syncResult = await syncSTOBookings()

    // 5. 동기화 시간 업데이트
    await updateLastSyncTime()

    // 6. 세션 만료 시간 갱신
    await extendSessionExpiry()

    // 7. 결과 반환
    return NextResponse.json({
      success: syncResult.success,
      totalCount: syncResult.totalCount,
      newBookings: syncResult.newBookings.length,
      statusChanges: syncResult.statusChanges.length,
      errors: syncResult.errors,
      syncedAt: syncResult.syncedAt,
    })
  } catch (error) {
    console.error('[Cron] 오류:', error)
    return NextResponse.json({
      success: false,
      message: `오류: ${error}`,
    }, { status: 500 })
  }
}

// POST도 동일하게 처리 (수동 트리거용)
export async function POST(request: NextRequest) {
  return GET(request)
}
