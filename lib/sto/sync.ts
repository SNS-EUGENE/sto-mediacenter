// STO 예약 동기화 및 알림 로직

import { supabase } from '@/lib/supabase/client'
import {
  STOBookingListItem,
  STOBookingStatus,
  STOStatusChange,
  STOSyncResult,
  FACILITY_MAP,
} from './types'
import { fetchAllBookings, isSessionValid } from './client'

// Supabase 쿼리용 타입 (타입 단언 회피)
interface BookingRow {
  sto_reqst_sn: string | null
  status: string
}

interface BookingInsertData {
  studio_id: number
  rental_date: string
  time_slots: number[]
  applicant_name: string
  organization: string | null
  phone: string
  event_name: string | null
  purpose: string | null
  participants_count: number
  payment_confirmed: boolean
  status: string
  sto_reqst_sn: string
  created_at: string
}

// 이전 동기화된 예약 상태 저장 (메모리)
// 키: reqstSn, 값: status
const previousStatusMap: Map<string, STOBookingStatus> = new Map()

// 동기화 상태
let isSyncing = false
let lastSyncTime: Date | null = null

/**
 * STO 예약 데이터 동기화
 * - 새 예약 감지
 * - 상태 변경 감지 (입금대기 → 대관확정 등)
 */
export async function syncSTOBookings(): Promise<STOSyncResult> {
  const result: STOSyncResult = {
    success: false,
    totalCount: 0,
    newBookings: [],
    statusChanges: [],
    errors: [],
    syncedAt: new Date(),
  }

  if (isSyncing) {
    result.errors.push('이미 동기화가 진행 중입니다.')
    return result
  }

  if (!isSessionValid()) {
    result.errors.push('STO 세션이 유효하지 않습니다. 먼저 로그인하세요.')
    return result
  }

  isSyncing = true

  try {
    // STO에서 전체 예약 목록 가져오기
    const { bookings, totalCount, success, error } = await fetchAllBookings(50)

    if (!success) {
      result.errors.push(error || '예약 목록 조회 실패')
      return result
    }

    result.totalCount = totalCount

    // 이전에 동기화한 reqstSn 목록 가져오기 (DB에서)
    const existingReqstSns = await getExistingStoBookingIds()

    for (const booking of bookings) {
      // 새 예약 감지
      if (!existingReqstSns.has(booking.reqstSn)) {
        result.newBookings.push(booking)
      }

      // 상태 변경 감지
      const previousStatus = previousStatusMap.get(booking.reqstSn)
      if (previousStatus && previousStatus !== booking.status) {
        result.statusChanges.push({
          reqstSn: booking.reqstSn,
          applicantName: booking.applicantName,
          rentalDate: booking.rentalDate,
          facilityName: booking.facilityName,
          previousStatus,
          newStatus: booking.status,
          changedAt: new Date(),
        })
      }

      // 상태 업데이트
      previousStatusMap.set(booking.reqstSn, booking.status)
    }

    // 새 예약을 DB에 저장
    if (result.newBookings.length > 0) {
      const saveErrors = await saveNewBookings(result.newBookings)
      result.errors.push(...saveErrors)
    }

    // 상태 변경을 DB에 반영
    if (result.statusChanges.length > 0) {
      const updateErrors = await updateBookingStatuses(result.statusChanges)
      result.errors.push(...updateErrors)
    }

    result.success = result.errors.length === 0
    lastSyncTime = new Date()

    console.log(`[STO Sync] 완료: 신규 ${result.newBookings.length}건, 상태변경 ${result.statusChanges.length}건`)

  } catch (error) {
    result.errors.push(`동기화 오류: ${error}`)
  } finally {
    isSyncing = false
  }

  return result
}

/**
 * DB에서 기존 STO 예약 ID 목록 가져오기
 */
async function getExistingStoBookingIds(): Promise<Set<string>> {
  const ids = new Set<string>()

  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('sto_reqst_sn')
      .not('sto_reqst_sn', 'is', null) as { data: { sto_reqst_sn: string | null }[] | null; error: Error | null }

    if (error) throw error

    data?.forEach(row => {
      if (row.sto_reqst_sn) {
        ids.add(row.sto_reqst_sn)
      }
    })
  } catch (error) {
    console.error('[STO Sync] 기존 예약 ID 조회 실패:', error)
  }

  return ids
}

/**
 * 새 예약을 DB에 저장
 */
async function saveNewBookings(bookings: STOBookingListItem[]): Promise<string[]> {
  const errors: string[] = []

  for (const booking of bookings) {
    try {
      // 시설 ID 매핑
      const studioId = FACILITY_MAP[booking.facilityName] || 1

      // 시간 슬롯 파싱 (09:00~10:00 → 9)
      const timeSlots = booking.timeSlots.map(slot => {
        const match = slot.match(/(\d{1,2}):/)
        return match ? parseInt(match[1], 10) : 9
      })

      // 상태 매핑
      let status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' = 'PENDING'
      if (booking.status === 'CONFIRMED') status = 'CONFIRMED'
      else if (booking.status === 'CANCELLED') status = 'CANCELLED'

      const insertData: BookingInsertData = {
        studio_id: studioId,
        rental_date: booking.rentalDate,
        time_slots: timeSlots,
        applicant_name: booking.applicantName,
        organization: booking.organization || null,
        phone: booking.phone,
        event_name: null,
        purpose: null,
        participants_count: booking.participantsCount,
        payment_confirmed: booking.status === 'CONFIRMED',
        status,
        sto_reqst_sn: booking.reqstSn,
        created_at: booking.createdAt ? `${booking.createdAt}T00:00:00` : new Date().toISOString(),
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase.from('bookings').insert(insertData as any)

      if (error) {
        errors.push(`예약 ${booking.reqstSn} 저장 실패: ${error.message}`)
      }
    } catch (error) {
      errors.push(`예약 ${booking.reqstSn} 저장 오류: ${error}`)
    }
  }

  return errors
}

/**
 * 예약 상태 변경을 DB에 반영
 */
async function updateBookingStatuses(statusChanges: STOStatusChange[]): Promise<string[]> {
  const errors: string[] = []

  for (const change of statusChanges) {
    try {
      // 상태 매핑
      let status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' = 'PENDING'
      if (change.newStatus === 'CONFIRMED') status = 'CONFIRMED'
      else if (change.newStatus === 'CANCELLED') status = 'CANCELLED'

      const updateData = {
        status,
        payment_confirmed: change.newStatus === 'CONFIRMED',
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('bookings') as any)
        .update(updateData)
        .eq('sto_reqst_sn', change.reqstSn)

      if (error) {
        errors.push(`예약 ${change.reqstSn} 상태 업데이트 실패: ${error.message}`)
      }
    } catch (error) {
      errors.push(`예약 ${change.reqstSn} 상태 업데이트 오류: ${error}`)
    }
  }

  return errors
}

/**
 * 단일 예약 상세 정보로 DB 업데이트
 */
export async function updateBookingFromDetail(
  reqstSn: string,
  detail: {
    fullName?: string
    fullPhone?: string
    email?: string
    purpose?: string
    rentalFee?: number
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: Record<string, unknown> = {}

    if (detail.fullName) updateData.applicant_name = detail.fullName
    if (detail.fullPhone) updateData.phone = detail.fullPhone
    if (detail.email) updateData.email = detail.email
    if (detail.purpose) updateData.purpose = detail.purpose
    if (detail.rentalFee !== undefined) updateData.fee = detail.rentalFee

    if (Object.keys(updateData).length === 0) {
      return { success: true }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('bookings') as any)
      .update(updateData)
      .eq('sto_reqst_sn', reqstSn)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: `${error}` }
  }
}

/**
 * 이전 상태 맵 초기화 (서버 재시작 시 DB에서 로드)
 */
export async function initializePreviousStatusMap(): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('sto_reqst_sn, status')
      .not('sto_reqst_sn', 'is', null) as { data: BookingRow[] | null; error: Error | null }

    if (error) throw error

    previousStatusMap.clear()
    data?.forEach(row => {
      if (row.sto_reqst_sn) {
        // DB 상태를 STO 상태로 매핑
        let stoStatus: STOBookingStatus = 'PENDING'
        if (row.status === 'CONFIRMED') stoStatus = 'CONFIRMED'
        else if (row.status === 'CANCELLED') stoStatus = 'CANCELLED'

        previousStatusMap.set(row.sto_reqst_sn, stoStatus)
      }
    })

    console.log(`[STO Sync] 이전 상태 맵 초기화: ${previousStatusMap.size}건`)
  } catch (error) {
    console.error('[STO Sync] 이전 상태 맵 초기화 실패:', error)
  }
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
