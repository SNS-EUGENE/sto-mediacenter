// STO 세션 Keep-alive API
// 5분마다 호출하여 세션 유지

import { NextResponse } from 'next/server'
import { fetchBookingListPage, getCurrentSession, setSession, isSessionValid } from '@/lib/sto/client'
import { loadSessionFromDB, saveSessionToDB, extendSessionExpiry, isBusinessHours } from '@/lib/sto/session-store'

export async function POST() {
  try {
    // 메모리에 세션이 없으면 DB에서 로드
    if (!isSessionValid()) {
      const storedSession = await loadSessionFromDB()
      if (storedSession) {
        setSession(storedSession)
      } else {
        return NextResponse.json({
          success: false,
          message: '활성 세션이 없습니다. 로그인이 필요합니다.',
          needsLogin: true,
        })
      }
    }

    // STO 목록 페이지 요청으로 세션 유지
    const result = await fetchBookingListPage(1)

    if (!result.success) {
      return NextResponse.json({
        success: false,
        message: result.error || '세션 유지 실패',
        needsLogin: true,
      })
    }

    // 세션 만료 시간 갱신
    const session = getCurrentSession()
    if (session) {
      // 메모리 세션 만료 시간 갱신
      session.expiresAt = new Date(Date.now() + 30 * 60 * 1000)
      // DB 만료 시간 갱신
      await extendSessionExpiry()
      // DB에 세션 저장
      await saveSessionToDB(session)
    }

    return NextResponse.json({
      success: true,
      message: '세션 유지 성공',
      expiresAt: session?.expiresAt?.toISOString(),
    })
  } catch (error) {
    console.error('[Keep-alive] 오류:', error)
    return NextResponse.json({
      success: false,
      message: `오류: ${error}`,
    }, { status: 500 })
  }
}

// GET은 상태 확인용
export async function GET() {
  try {
    const isValid = isSessionValid()
    const session = getCurrentSession()
    const inBusinessHours = isBusinessHours()

    // 메모리에 없으면 DB 확인
    let dbSession = null
    if (!isValid) {
      dbSession = await loadSessionFromDB()
    }

    return NextResponse.json({
      memorySession: {
        valid: isValid,
        expiresAt: session?.expiresAt?.toISOString() || null,
      },
      dbSession: dbSession ? {
        valid: true,
        expiresAt: dbSession.expiresAt.toISOString(),
      } : null,
      isBusinessHours: inBusinessHours,
    })
  } catch (error) {
    return NextResponse.json({
      error: `${error}`,
    }, { status: 500 })
  }
}
