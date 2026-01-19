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
 * @param maxRecords 최대 가져올 레코드 수 (기본 80개)
 * @param fetchDetail 상세 페이지에서 전체 정보 가져오기 (기본 true)
 */
export async function syncSTOBookings(
  maxRecords: number = 5,
  fetchDetail: boolean = true
): Promise<STOSyncResult> {
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
    // 최대 페이지 수 계산 (페이지당 10개)
    const maxPages = Math.ceil(maxRecords / 10)
    console.log(`[STO Sync] 최대 ${maxRecords}개 (${maxPages}페이지) 동기화 시작, 상세정보: ${fetchDetail ? 'O' : 'X'}`)

    // STO에서 예약 목록 가져오기 (제한된 페이지 수)
    const { bookings, totalCount, success, error } = await fetchAllBookings(maxPages)

    if (!success) {
      result.errors.push(error || '예약 목록 조회 실패')
      return result
    }

    result.totalCount = totalCount

    // maxRecords로 제한
    const limitedBookings = bookings.slice(0, maxRecords)
    console.log(`[STO Sync] 총 ${totalCount}건 중 ${limitedBookings.length}건 처리`)

    // 이전에 동기화한 reqstSn 목록 가져오기 (DB에서)
    const existingReqstSns = await getExistingStoBookingIds()

    for (const booking of limitedBookings) {
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

    // 새 예약을 DB에 저장 (상세 정보 포함)
    if (result.newBookings.length > 0) {
      console.log(`[STO Sync] 신규 ${result.newBookings.length}건 저장 시작 (상세정보: ${fetchDetail ? 'O' : 'X'})`)
      const saveErrors = await saveNewBookings(result.newBookings, fetchDetail)
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
 * 새 예약을 DB에 저장 (상세 정보 포함)
 */
async function saveNewBookings(bookings: STOBookingListItem[], fetchDetail: boolean = false): Promise<string[]> {
  const errors: string[] = []

  for (const booking of bookings) {
    try {
      // 상세 정보 가져오기 (옵션)
      let detail: import('./types').STOBookingDetail | null = null

      if (fetchDetail) {
        const { fetchBookingDetail } = await import('./client')
        const detailResult = await fetchBookingDetail(booking.reqstSn, booking)
        if (detailResult.success && detailResult.detail) {
          detail = detailResult.detail
          console.log(`[STO Sync] 상세 정보 가져옴: ${booking.reqstSn} - ${detail.fullName || booking.applicantName}`)
        }
        // 요청 간 딜레이 (서버 부하 방지)
        await new Promise(resolve => setTimeout(resolve, 300))
      }

      // 시설 ID 매핑
      const facilityName = detail?.facilityName || booking.facilityName
      const studioId = FACILITY_MAP[facilityName] || 1

      // 시간 슬롯 파싱 (09:00~10:00 → 9)
      const timeSlotsSrc = detail?.timeSlots || booking.timeSlots
      const timeSlots = timeSlotsSrc.map(slot => {
        const match = slot.match(/(\d{1,2}):/)
        return match ? parseInt(match[1], 10) : 9
      })

      // 상태 매핑
      let status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' = 'PENDING'
      const bookingStatus = detail?.status || booking.status
      if (bookingStatus === 'CONFIRMED') status = 'CONFIRMED'
      else if (bookingStatus === 'CANCELLED') status = 'CANCELLED'

      // 전체 필드 저장
      const purposeValue = detail?.purpose || null
      const insertData: Record<string, unknown> = {
        studio_id: studioId,
        rental_date: detail?.rentalDate || booking.rentalDate,
        time_slots: timeSlots,
        applicant_name: detail?.fullName || booking.applicantName,
        organization: detail?.organization || booking.organization || null,
        phone: detail?.fullPhone || booking.phone,
        email: detail?.email || null,
        event_name: purposeValue,  // 행사명 = 사용목적
        purpose: purposeValue,
        participants_count: detail?.participantsCount || booking.participantsCount,
        payment_confirmed: bookingStatus === 'CONFIRMED',
        status,
        fee: detail?.rentalFee !== undefined ? detail.rentalFee : null,  // 0도 유효한 값
        sto_reqst_sn: booking.reqstSn,
        created_at: booking.createdAt ? `${booking.createdAt}T00:00:00` : new Date().toISOString(),
        // 추가 상세 필드들
        special_note: detail?.specialNote || booking.specialNote || null,
        user_type: detail?.userType || null,
        discount_rate: detail?.discountRate !== undefined ? detail.discountRate : 0,  // 0도 유효
        company_phone: detail?.companyPhone || null,
        business_license: detail?.businessLicense || null,
        receipt_type: detail?.receiptType || null,
        business_number: detail?.businessNumber || null,
        has_no_show: detail?.hasNoShow || false,
        no_show_memo: detail?.noShowMemo || null,
        studio_usage_method: detail?.studioUsageMethod || null,
        file_delivery_method: detail?.fileDeliveryMethod || null,
        pre_meeting_contact: detail?.preMeetingContact || null,
        other_inquiry: detail?.otherInquiry || null,
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
