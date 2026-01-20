// STO 예약 동기화 및 알림 로직

import { supabase, createServerClient } from '@/lib/supabase/client'
import {
  STOBookingListItem,
  STOBookingStatus,
  STOStatusChange,
  STOSyncResult,
  FACILITY_MAP,
} from './types'
import { fetchAllBookings, isSessionValid, downloadSTOFile } from './client'

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
 * STO 예약 데이터 동기화 (빠른 동기화)
 * - 1페이지(최신 10건)만 조회
 * - DB에 없는 신규 예약 → 상세 정보 가져와서 추가
 * - 기존 예약 중 상태가 변경된 것만 → 상태 업데이트
 * @param maxRecords 최대 가져올 레코드 수 (기본 10 = 1페이지)
 * @param fetchDetail 신규 예약의 상세 정보 가져오기 (기본 true)
 */
export async function syncSTOBookings(
  maxRecords: number = 10,
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
    // 1페이지만 조회 (기본값)
    const maxPages = Math.max(1, Math.ceil(maxRecords / 10))
    console.log(`[STO Sync] ${maxPages}페이지 (최대 ${maxRecords}건) 빠른 동기화 시작`)

    // STO에서 예약 목록 가져오기
    const { bookings, totalCount, success, error } = await fetchAllBookings(maxPages)

    if (!success) {
      result.errors.push(error || '예약 목록 조회 실패')
      return result
    }

    result.totalCount = totalCount

    // 2025년 이후만 필터링 + 레코드 수 제한
    const filteredBookings = bookings
      .filter(b => b.rentalDate >= '2025-01-01')
      .slice(0, maxRecords)

    console.log(`[STO Sync] 총 ${totalCount}건 중 처리 대상 ${filteredBookings.length}건`)

    // DB에서 기존 예약 정보 가져오기 (ID + 상태)
    const existingBookings = await getExistingStoBookings()

    // 신규 예약과 상태 변경 분류
    const newBookings: STOBookingListItem[] = []
    const statusChanges: STOStatusChange[] = []

    for (const booking of filteredBookings) {
      const existingStatus = existingBookings.get(booking.reqstSn)

      if (!existingStatus) {
        // 신규 예약
        newBookings.push(booking)
        result.newBookings.push(booking)
      } else if (existingStatus !== booking.status) {
        // 상태 변경 감지 (DB 상태와 STO 상태가 다름)
        const change: STOStatusChange = {
          reqstSn: booking.reqstSn,
          applicantName: booking.applicantName,
          rentalDate: booking.rentalDate,
          facilityName: booking.facilityName,
          previousStatus: existingStatus as STOBookingStatus,
          newStatus: booking.status,
          changedAt: new Date(),
        }
        statusChanges.push(change)
        result.statusChanges.push(change)
        console.log(`[STO Sync] 상태 변경 감지: ${booking.reqstSn} (${existingStatus} → ${booking.status})`)
      }
      // 상태 동일하면 스킵
    }

    // 신규 예약 처리
    if (newBookings.length > 0) {
      if (fetchDetail) {
        console.log(`[STO Sync] 신규 ${newBookings.length}건 상세정보 가져오기...`)
        const saveErrors = await saveOrUpdateBookings(newBookings, new Set(existingBookings.keys()))
        result.errors.push(...saveErrors)
      } else {
        console.log(`[STO Sync] 신규 ${newBookings.length}건 저장 (상세정보 없음)`)
        const saveErrors = await saveNewBookings(newBookings, false)
        result.errors.push(...saveErrors)
      }
    }

    // 상태 변경 DB 반영
    if (statusChanges.length > 0) {
      console.log(`[STO Sync] 상태 변경 ${statusChanges.length}건 업데이트...`)
      const updateErrors = await updateBookingStatuses(statusChanges)
      result.errors.push(...updateErrors)
    }

    result.success = result.errors.length === 0
    lastSyncTime = new Date()

    console.log(`[STO Sync] 완료: 신규 ${newBookings.length}건, 상태변경 ${statusChanges.length}건`)

  } catch (error) {
    result.errors.push(`동기화 오류: ${error}`)
  } finally {
    isSyncing = false
  }

  return result
}

/**
 * DB에서 기존 STO 예약 정보 가져오기 (ID + 상태)
 */
async function getExistingStoBookings(): Promise<Map<string, string>> {
  const bookingMap = new Map<string, string>() // reqstSn -> status

  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('sto_reqst_sn, status')
      .not('sto_reqst_sn', 'is', null) as { data: BookingRow[] | null; error: Error | null }

    if (error) throw error

    data?.forEach(row => {
      if (row.sto_reqst_sn) {
        bookingMap.set(row.sto_reqst_sn, row.status)
      }
    })
  } catch (error) {
    console.error('[STO Sync] 기존 예약 조회 실패:', error)
  }

  return bookingMap
}


/**
 * 사업자등록증 파일을 Supabase Storage에 업로드
 * @param reqstSn 예약 고유번호
 * @param stoUrl STO 파일 다운로드 URL
 * @param fileName 원본 파일명
 * @returns 업로드된 파일의 공개 URL (실패 시 null)
 */
async function uploadBusinessLicenseToStorage(
  reqstSn: string,
  stoUrl: string,
  fileName: string
): Promise<string | null> {
  try {
    // STO에서 파일 다운로드
    const downloadResult = await downloadSTOFile(stoUrl)
    if (!downloadResult.success || !downloadResult.blob) {
      console.error(`[STO Sync] 파일 다운로드 실패 (${reqstSn}):`, downloadResult.error)
      return null
    }

    // 파일 확장자 추출
    const ext = fileName.split('.').pop()?.toLowerCase() || 'pdf'
    // 저장 경로: business-licenses/{reqstSn}_{timestamp}.{ext}
    const storagePath = `business-licenses/${reqstSn}_${Date.now()}.${ext}`

    // Service Role 키를 사용하는 클라이언트로 업로드 (권한 문제 해결)
    const serverClient = createServerClient()

    // Supabase Storage에 업로드
    const { error: uploadError } = await serverClient.storage
      .from('attachments')
      .upload(storagePath, downloadResult.blob, {
        contentType: downloadResult.contentType,
        upsert: false,
      })

    if (uploadError) {
      console.error(`[STO Sync] Storage 업로드 실패 (${reqstSn}):`, uploadError.message)
      return null
    }

    // 공개 URL 생성
    const { data: publicUrlData } = serverClient.storage
      .from('attachments')
      .getPublicUrl(storagePath)

    return publicUrlData.publicUrl
  } catch (error) {
    console.error(`[STO Sync] 파일 업로드 오류 (${reqstSn}):`, error)
    return null
  }
}

/**
 * 모든 예약의 상세 정보를 가져와서 저장 또는 업데이트
 */
async function saveOrUpdateBookings(
  bookings: STOBookingListItem[],
  existingReqstSns: Set<string>
): Promise<string[]> {
  const errors: string[] = []
  let consecutiveFailures = 0
  const MAX_CONSECUTIVE_FAILURES = 3

  for (let i = 0; i < bookings.length; i++) {
    const booking = bookings[i]

    // 연속 실패가 많으면 세션 문제로 판단하고 중단
    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      console.error(`[STO Sync] 연속 ${MAX_CONSECUTIVE_FAILURES}회 실패, 세션 문제로 판단하여 중단`)
      errors.push(`세션 만료로 인해 ${bookings.length - i}건 처리 실패`)
      break
    }

    try {
      // 상세 정보 가져오기
      const { fetchBookingDetail } = await import('./client')
      const detailResult = await fetchBookingDetail(booking.reqstSn, booking)

      if (!detailResult.success || !detailResult.detail) {
        console.warn(`[STO Sync] 상세 정보 가져오기 실패: ${booking.reqstSn} - ${detailResult.error || '알 수 없는 오류'}`)
        consecutiveFailures++

        // 기존에 없는 예약이면 목록 데이터라도 저장
        if (!existingReqstSns.has(booking.reqstSn)) {
          await saveNewBookings([booking], false)
        }

        // 실패 시 더 긴 딜레이
        await new Promise(resolve => setTimeout(resolve, 2000))
        continue
      }

      // 성공하면 연속 실패 카운터 리셋
      consecutiveFailures = 0

      const detail = detailResult.detail
      console.log(`[STO Sync] 상세 정보 가져옴: ${booking.reqstSn} - ${detail.fullName || booking.applicantName}`)
      console.log(`[STO Sync] 사업자등록증: 파일명="${detail.businessLicense}", URL="${detail.businessLicenseUrl}"`)

      // 사업자등록증 파일명이 비정상적이면 정리
      if (detail.businessLicense && (detail.businessLicense.includes('${') || detail.businessLicense.length < 3)) {
        console.warn(`[STO Sync] 비정상 파일명 감지, 초기화: ${detail.businessLicense}`)
        detail.businessLicense = ''
      }

      // 사업자등록증 파일 다운로드 및 Supabase Storage 업로드
      if (detail.businessLicenseUrl && detail.businessLicenseUrl.includes('sto.or.kr')) {
        // URL이 '#'으로 끝나면 실제 파일 없음
        if (detail.businessLicenseUrl.endsWith('#')) {
          detail.businessLicenseUrl = ''
        } else if (detail.businessLicense) {
          // 파일 다운로드 시도
          console.log(`[STO Sync] 사업자등록증 다운로드 시도: ${booking.reqstSn}`)
          const storageUrl = await uploadBusinessLicenseToStorage(
            booking.reqstSn,
            detail.businessLicenseUrl,
            detail.businessLicense
          )
          if (storageUrl) {
            detail.businessLicenseUrl = storageUrl
            console.log(`[STO Sync] 사업자등록증 업로드 완료: ${storageUrl}`)
          } else {
            // 다운로드 실패 시 URL 비움 (STO URL은 로그인 필요해서 의미없음)
            console.warn(`[STO Sync] 사업자등록증 다운로드 실패, URL 비움`)
            detail.businessLicenseUrl = ''
          }
          // 파일 다운로드 후 추가 딜레이 (세션 보호)
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }

      // 데이터 준비
      const facilityName = detail.facilityName || booking.facilityName
      const studioId = FACILITY_MAP[facilityName] || 1

      const timeSlotsSrc = detail.timeSlots || booking.timeSlots
      const timeSlots = timeSlotsSrc.map(slot => {
        const match = slot.match(/(\d{1,2}):/)
        return match ? parseInt(match[1], 10) : 9
      })

      let status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' = 'PENDING'
      const bookingStatus = detail.status || booking.status
      if (bookingStatus === 'CONFIRMED') status = 'CONFIRMED'
      else if (bookingStatus === 'CANCELLED') status = 'CANCELLED'

      const purposeValue = detail.purpose || null
      const bookingData: Record<string, unknown> = {
        studio_id: studioId,
        rental_date: detail.rentalDate || booking.rentalDate,
        time_slots: timeSlots,
        applicant_name: detail.fullName || booking.applicantName,
        organization: detail.organization || booking.organization || null,
        phone: detail.fullPhone || booking.phone,
        email: detail.email || null,
        event_name: purposeValue,
        purpose: purposeValue,
        participants_count: detail.participantsCount || booking.participantsCount,
        payment_confirmed: bookingStatus === 'CONFIRMED',
        status,
        fee: detail.rentalFee !== undefined ? detail.rentalFee : null,
        sto_reqst_sn: booking.reqstSn,
        special_note: detail.specialNote || booking.specialNote || null,
        user_type: detail.userType || null,
        discount_rate: detail.discountRate !== undefined ? detail.discountRate : 0,
        company_phone: detail.companyPhone || null,
        business_license: detail.businessLicense || null,
        business_license_url: detail.businessLicenseUrl || null,
        receipt_type: detail.receiptType || null,
        business_number: detail.businessNumber || null,
        has_no_show: detail.hasNoShow || false,
        no_show_memo: detail.noShowMemo || null,
        studio_usage_method: detail.studioUsageMethod || null,
        file_delivery_method: detail.fileDeliveryMethod || null,
        pre_meeting_contact: detail.preMeetingContact || null,
        other_inquiry: detail.otherInquiry || null,
      }

      if (existingReqstSns.has(booking.reqstSn)) {
        // 기존 예약 업데이트
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('bookings') as any)
          .update(bookingData)
          .eq('sto_reqst_sn', booking.reqstSn)

        if (error) {
          errors.push(`예약 ${booking.reqstSn} 업데이트 실패: ${error.message}`)
        } else {
          console.log(`[STO Sync] 예약 업데이트 완료: ${booking.reqstSn}`)
        }
      } else {
        // 새 예약 저장
        bookingData.created_at = booking.createdAt ? `${booking.createdAt}T00:00:00` : new Date().toISOString()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await supabase.from('bookings').insert(bookingData as any)

        if (error) {
          errors.push(`예약 ${booking.reqstSn} 저장 실패: ${error.message}`)
        } else {
          console.log(`[STO Sync] 새 예약 저장 완료: ${booking.reqstSn}`)
        }
      }

      // 요청 간 딜레이 (서버 부하 방지 - STO가 빠른 요청에 세션 끊음)
      await new Promise(resolve => setTimeout(resolve, 1500))

    } catch (error) {
      errors.push(`예약 ${booking.reqstSn} 처리 오류: ${error}`)
    }
  }

  return errors
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

          // 사업자등록증 파일이 있으면 Supabase Storage에 백업
          if (detail.businessLicenseUrl) {
            const uploadedUrl = await uploadBusinessLicenseToStorage(
              booking.reqstSn,
              detail.businessLicenseUrl,
              detail.businessLicense
            )
            if (uploadedUrl) {
              detail.businessLicenseUrl = uploadedUrl
              console.log(`[STO Sync] 사업자등록증 백업 완료: ${uploadedUrl}`)
            }
          }
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
        business_license_url: detail?.businessLicenseUrl || null,
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
