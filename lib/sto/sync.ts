// STO 예약 동기화 서비스
import { supabase } from '@/lib/supabase/client'
import { STOBooking, STOSyncResult, STOCredentials } from './types'
import {
  fetchSTOBookings,
  convertSTOBookingToInternal,
  refreshSession,
  isSessionValid,
} from './client'

// 마지막 동기화 시간
let lastSyncTime: Date | null = null

// 동기화 상태
let isSyncing = false

/**
 * STO 예약 데이터 동기화
 * - STO 시스템에서 예약 목록 조회
 * - 새 예약은 Supabase에 추가
 * - 변경된 예약은 업데이트
 */
export async function syncSTOBookings(
  credentials: STOCredentials,
  startDate?: string,
  endDate?: string
): Promise<STOSyncResult> {
  if (isSyncing) {
    console.log('[STO Sync] 이미 동기화 중입니다')
    return {
      success: false,
      newBookings: [],
      updatedBookings: [],
      errors: ['이미 동기화가 진행 중입니다'],
      syncedAt: new Date(),
    }
  }

  isSyncing = true
  const result: STOSyncResult = {
    success: false,
    newBookings: [],
    updatedBookings: [],
    errors: [],
    syncedAt: new Date(),
  }

  try {
    // 1. 세션 확인 및 갱신
    const sessionValid = await refreshSession(credentials)
    if (!sessionValid) {
      result.errors.push('STO 시스템 로그인 실패')
      return result
    }

    // 2. 날짜 범위 설정 (기본: 오늘부터 30일)
    const today = new Date()
    const defaultStart = startDate || formatDate(today)
    const defaultEnd = endDate || formatDate(new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000))

    // 3. STO 시스템에서 예약 목록 조회
    const stoBookings = await fetchSTOBookings(defaultStart, defaultEnd)
    console.log(`[STO Sync] ${stoBookings.length}개 예약 조회됨`)

    // 4. 각 예약 처리
    for (const stoBooking of stoBookings) {
      try {
        const processResult = await processSTOBooking(stoBooking)
        if (processResult.isNew) {
          result.newBookings.push(stoBooking)
        } else if (processResult.isUpdated) {
          result.updatedBookings.push(stoBooking)
        }
      } catch (error) {
        result.errors.push(`예약 ${stoBooking.id} 처리 실패: ${error}`)
      }
    }

    result.success = result.errors.length === 0
    lastSyncTime = new Date()
  } catch (error) {
    result.errors.push(`동기화 실패: ${error}`)
  } finally {
    isSyncing = false
  }

  return result
}

/**
 * 개별 STO 예약 처리
 */
async function processSTOBooking(
  stoBooking: STOBooking
): Promise<{ isNew: boolean; isUpdated: boolean }> {
  const internalBooking = convertSTOBookingToInternal(stoBooking)

  // 기존 예약 확인 (STO ID 기반 또는 날짜+시간+스튜디오 기반)
  const { data: existing } = await supabase
    .from('bookings')
    .select('id, updated_at')
    .eq('rental_date', internalBooking.rental_date)
    .eq('studio_id', internalBooking.studio_id)
    .contains('time_slots', internalBooking.time_slots)
    .single()

  if (!existing) {
    // 새 예약 추가
    // @ts-expect-error - Supabase 타입 추론 이슈
    const { error } = await supabase.from('bookings').insert(internalBooking)
    if (error) throw error
    return { isNew: true, isUpdated: false }
  } else {
    // 기존 예약 업데이트 (변경 사항 있는 경우)
    const existingData = existing as { id: string }
    const { error } = await supabase
      .from('bookings')
      // @ts-expect-error - Supabase 타입 추론 이슈
      .update({
        ...internalBooking,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingData.id)
    if (error) throw error
    return { isNew: false, isUpdated: true }
  }
}

/**
 * 날짜 포맷팅 (YYYY-MM-DD)
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * 마지막 동기화 시간 반환
 */
export function getLastSyncTime(): Date | null {
  return lastSyncTime
}

/**
 * 동기화 상태 반환
 */
export function isSyncInProgress(): boolean {
  return isSyncing
}

/**
 * 새 예약 감지 (마지막 동기화 이후)
 */
export async function detectNewBookings(
  credentials: STOCredentials
): Promise<STOBooking[]> {
  const sessionValid = await refreshSession(credentials)
  if (!sessionValid) return []

  const today = formatDate(new Date())
  const futureDate = formatDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))

  const stoBookings = await fetchSTOBookings(today, futureDate)

  // 마지막 동기화 이후 새로 생성된 예약 필터링
  if (lastSyncTime) {
    return stoBookings.filter((b) => new Date(b.createdAt) > lastSyncTime!)
  }

  return stoBookings
}
