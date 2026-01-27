// Supabase 쿼리 함수들
// 현재는 JSON 데이터를 사용하고 있으며, Supabase 연동 시 이 파일을 사용합니다.

import { supabase } from './client'
import type { Booking, BookingInsert, BookingWithStudio, Equipment, Studio } from '@/types/supabase'
import type { BookingFilters, PaginatedResponse, PaginationParams } from '@/types'
import { getComputedStatus } from '@/lib/utils/bookingStatus'

// =============================================
// Studios
// =============================================

export async function getStudios(): Promise<Studio[]> {
  const { data, error } = await supabase
    .from('studios')
    .select('*')
    .order('id')

  if (error) throw error
  return (data || []) as Studio[]
}

// =============================================
// Bookings
// =============================================

export async function getBookings(
  filters?: BookingFilters,
  pagination?: PaginationParams
): Promise<PaginatedResponse<BookingWithStudio>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from('bookings')
    .select(`
      *,
      studio:studios(*),
      survey:satisfaction_surveys(id, submitted_at)
    `, { count: 'exact' })

  // Apply filters
  if (filters?.studioId) {
    query = query.eq('studio_id', filters.studioId)
  }

  if (filters?.status && filters.status.length > 0) {
    query = query.in('status', filters.status)
  }

  if (filters?.dateFrom) {
    query = query.gte('rental_date', filters.dateFrom)
  }

  if (filters?.dateTo) {
    query = query.lte('rental_date', filters.dateTo)
  }

  if (filters?.searchTerm) {
    query = query.or(
      `applicant_name.ilike.%${filters.searchTerm}%,organization.ilike.%${filters.searchTerm}%,event_name.ilike.%${filters.searchTerm}%`
    )
  }

  // Apply pagination
  const page = pagination?.page || 1
  const pageSize = pagination?.pageSize || 20
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  query = query
    .order('rental_date', { ascending: false })
    .order('time_slots', { ascending: true })
    .range(from, to)

  const { data, error, count } = await query

  if (error) throw error

  // survey 데이터가 배열로 올 수 있으므로 정규화
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const normalizedData = (data || []).map((booking: any) => ({
    ...booking,
    survey: Array.isArray(booking.survey) ? booking.survey : booking.survey ? [booking.survey] : null,
  }))

  return {
    data: normalizedData as BookingWithStudio[],
    pagination: {
      page,
      pageSize,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / pageSize),
    },
  }
}

export async function getBookingsByDate(date: string): Promise<BookingWithStudio[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, studio:studios(*)')
    .eq('rental_date', date)
    .order('time_slots', { ascending: true })

  if (error) throw error
  return (data || []) as BookingWithStudio[]
}

export async function getBookingsByDateRange(
  startDate: string,
  endDate: string
): Promise<BookingWithStudio[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, studio:studios(*)')
    .gte('rental_date', startDate)
    .lte('rental_date', endDate)
    .order('rental_date', { ascending: true })
    .order('time_slots', { ascending: true })

  if (error) throw error
  return (data || []) as BookingWithStudio[]
}

export async function getBookingById(id: string): Promise<BookingWithStudio | null> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, studio:studios(*)')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as BookingWithStudio
}

export async function updateBookingStatus(
  id: string,
  status: Booking['status']
): Promise<Booking> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('bookings')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Booking
}

// 예약 생성
export async function createBooking(
  bookingData: BookingInsert
): Promise<Booking> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('bookings')
    .insert(bookingData)
    .select()
    .single()

  if (error) throw error
  return data as Booking
}

// 예약 수정
export async function updateBooking(
  id: string,
  updates: Partial<Omit<Booking, 'id' | 'created_at' | 'updated_at'>>
): Promise<Booking> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('bookings')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Booking
}

// 예약 삭제
export async function deleteBooking(id: string): Promise<void> {
  const { error } = await supabase.from('bookings').delete().eq('id', id)

  if (error) throw error
}

// 예약 취소 (soft delete)
export async function cancelBooking(id: string): Promise<Booking> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('bookings')
    .update({
      status: 'CANCELLED',
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Booking
}

// 예약 충돌 확인
export async function checkBookingConflict(
  studioId: number,
  rentalDate: string,
  timeSlots: number[],
  excludeBookingId?: string
): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from('bookings')
    .select('id, time_slots')
    .eq('studio_id', studioId)
    .eq('rental_date', rentalDate)
    .not('status', 'eq', 'CANCELLED')

  if (excludeBookingId) {
    query = query.neq('id', excludeBookingId)
  }

  const { data, error } = await query

  if (error) throw error

  // 시간 충돌 검사
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hasConflict = (data || []).some((booking: any) => {
    const existingSlots = booking.time_slots || []
    return timeSlots.some((slot) => existingSlots.includes(slot))
  })

  return hasConflict
}

// =============================================
// Equipments
// =============================================

export interface EquipmentFilters {
  location?: string
  category?: string
  status?: string
  isMaterial?: boolean
  searchTerm?: string
}

export async function getEquipments(filters?: EquipmentFilters): Promise<Equipment[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from('equipments')
    .select('*')

  // Apply filters
  if (filters?.location) {
    query = query.eq('location', filters.location)
  }

  if (filters?.category) {
    query = query.eq('category', filters.category)
  }

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  if (filters?.isMaterial !== undefined) {
    query = query.eq('is_material', filters.isMaterial)
  }

  if (filters?.searchTerm) {
    query = query.or(
      `name.ilike.%${filters.searchTerm}%,id.ilike.%${filters.searchTerm}%,category.ilike.%${filters.searchTerm}%`
    )
  }

  query = query.order('id')

  const { data, error } = await query

  if (error) throw error
  return (data || []) as Equipment[]
}

export async function getEquipmentById(id: string): Promise<Equipment | null> {
  const { data, error } = await supabase
    .from('equipments')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as Equipment
}

export async function updateEquipmentStatus(
  id: string,
  status: Equipment['status'],
  notes?: string
): Promise<Equipment> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('equipments')
    .update({ status, notes })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Equipment
}

// 장비 생성
export async function createEquipment(
  id: string,
  equipmentData: Omit<Equipment, 'id' | 'created_at' | 'updated_at'>
): Promise<Equipment> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('equipments')
    .insert({ id, ...equipmentData })
    .select()
    .single()

  if (error) throw error
  return data as Equipment
}

// 장비 수정
export async function updateEquipment(
  id: string,
  updates: Partial<Omit<Equipment, 'id' | 'created_at' | 'updated_at'>>
): Promise<Equipment> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('equipments')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Equipment
}

// 장비 삭제
export async function deleteEquipment(id: string): Promise<void> {
  const { error } = await supabase.from('equipments').delete().eq('id', id)

  if (error) throw error
}

export async function getEquipmentStats() {
  const { data, error } = await supabase
    .from('equipments')
    .select('status, location, is_material')

  if (error) throw error

  const stats = {
    total: data?.length || 0,
    byStatus: {} as Record<string, number>,
    byLocation: {} as Record<string, number>,
    equipmentCount: 0,
    materialCount: 0,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(data as any[])?.forEach((item) => {
    // Count by status
    stats.byStatus[item.status] = (stats.byStatus[item.status] || 0) + 1

    // Count by location
    stats.byLocation[item.location] = (stats.byLocation[item.location] || 0) + 1

    // Count equipment vs materials
    if (item.is_material) {
      stats.materialCount++
    } else {
      stats.equipmentCount++
    }
  })

  return stats
}

// =============================================
// Statistics
// =============================================

export async function getBookingStats(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('bookings')
    .select('studio_id, status, time_slots, rental_date')
    .gte('rental_date', startDate)
    .lte('rental_date', endDate)

  if (error) throw error
  return data || []
}

// 오늘 매출 조회
export async function getTodayRevenue(): Promise<number> {
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('bookings')
    .select('fee')
    .eq('rental_date', today)
    .not('status', 'eq', 'CANCELLED')

  if (error) throw error

  // fee 합계 계산
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalRevenue = ((data || []) as any[]).reduce((sum, booking) => {
    return sum + (booking.fee || 0)
  }, 0)

  return totalRevenue
}

// 어제 매출 조회 (증감률 계산용)
export async function getYesterdayRevenue(): Promise<number> {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('bookings')
    .select('fee')
    .eq('rental_date', yesterdayStr)
    .not('status', 'eq', 'CANCELLED')

  if (error) throw error

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalRevenue = ((data || []) as any[]).reduce((sum, booking) => {
    return sum + (booking.fee || 0)
  }, 0)

  return totalRevenue
}

// 대시보드 알림용 데이터 조회
export async function getDashboardAlerts() {
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const tomorrowStr = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  // 병렬로 조회
  const [pendingBookings, needsRepairEquipments] = await Promise.all([
    // 대기 중인 예약 (내일까지)
    supabase
      .from('bookings')
      .select('id, applicant_name, rental_date, studio_id, time_slots')
      .in('status', ['PENDING', 'TENTATIVE'])
      .lte('rental_date', tomorrowStr)
      .gte('rental_date', todayStr)
      .order('rental_date')
      .limit(5),
    // 점검 필요한 장비
    supabase
      .from('equipments')
      .select('id, name, status, notes')
      .in('status', ['REPAIR_NEEDED', 'BROKEN'])
      .limit(5),
  ])

  const alerts: { type: 'warning' | 'info' | 'error'; title: string; description: string }[] = []

  // 점검 필요 장비 알림
  if (needsRepairEquipments.data && needsRepairEquipments.data.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(needsRepairEquipments.data as any[]).forEach((equip) => {
      alerts.push({
        type: 'error',
        title: '장비 점검 필요',
        description: `${equip.name} - ${equip.notes || '점검 필요'}`,
      })
    })
  }

  // 대기 중인 예약 알림
  if (pendingBookings.data && pendingBookings.data.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(pendingBookings.data as any[]).forEach((booking) => {
      const isToday = booking.rental_date === todayStr
      alerts.push({
        type: 'warning',
        title: '예약 확정 대기',
        description: `${isToday ? '오늘' : '내일'} ${booking.applicant_name}님 예약`,
      })
    })
  }

  // 알림이 없으면 기본 메시지
  if (alerts.length === 0) {
    alerts.push({
      type: 'info',
      title: '알림 없음',
      description: '현재 처리할 알림이 없습니다.',
    })
  }

  return alerts.slice(0, 3) // 최대 3개
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getTodayStats(): Promise<{ bookings: any[]; stats: any }> {
  const today = new Date().toISOString().split('T')[0]
  const now = new Date()

  const { data: todayBookings, error } = await supabase
    .from('bookings')
    .select('*, studio:studios(*)')
    .eq('rental_date', today)
    .not('status', 'eq', 'CANCELLED')

  if (error) throw error

  const stats = {
    totalBookings: todayBookings?.length || 0,
    byStudio: {} as Record<number, number>,
    byStatus: {} as Record<string, number>,
    totalHours: 0,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  todayBookings?.forEach((booking: any) => {
    // Count by studio
    stats.byStudio[booking.studio_id] = (stats.byStudio[booking.studio_id] || 0) + 1

    // 계산된 상태로 집계 (IN_USE, DONE 반영)
    const computedStatus = getComputedStatus(booking, now)
    stats.byStatus[computedStatus] = (stats.byStatus[computedStatus] || 0) + 1

    // Total hours
    stats.totalHours += booking.time_slots?.length || 0
  })

  return { bookings: todayBookings || [], stats }
}

// =============================================
// 장기 이용자 통계
// =============================================

export interface LongTermUser {
  name: string              // 기관명 또는 이름
  isOrganization: boolean   // 기관 여부
  bookingCount: number      // 총 예약 횟수
  totalHours: number        // 총 이용 시간
  totalRevenue: number      // 총 매출
  firstBookingDate: string  // 첫 예약일
  lastBookingDate: string   // 마지막 예약일
  activeMonths: number      // 활동 개월 수
}

export interface LongTermUserStats {
  totalLongTermUsers: number     // 장기 이용자 수
  longTermUsers: LongTermUser[]  // 장기 이용자 목록
  criteria: {
    minBookings: number           // 최소 예약 횟수
    periodMonths: number          // 기간 (개월)
  }
}

/**
 * 장기 이용자 통계 조회
 * 장기 이용자 정의: 지정된 기간 내 일정 횟수 이상 예약한 기관/개인
 *
 * @param periodMonths 집계 기간 (개월), 기본 12개월
 * @param minBookings 최소 예약 횟수, 기본 3회
 */
export async function getLongTermUsers(
  periodMonths: number = 12,
  minBookings: number = 3
): Promise<LongTermUserStats> {
  // 기간 계산
  const endDate = new Date()
  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - periodMonths)

  const startDateStr = startDate.toISOString().split('T')[0]
  const endDateStr = endDate.toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('bookings')
    .select('applicant_name, organization, rental_date, time_slots, fee, status')
    .gte('rental_date', startDateStr)
    .lte('rental_date', endDateStr)
    .not('status', 'eq', 'CANCELLED')

  if (error) throw error

  // 기관별/개인별 집계
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userMap = new Map<string, {
    name: string
    isOrganization: boolean
    bookings: { date: string; hours: number; fee: number }[]
  }>()

  // 개인 카테고리 (기관으로 분류하지 않음)
  const personalCategories = ['개인', '프리랜서', '직장인', '학생', '무직', '']

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(data as any[] || []).forEach((booking) => {
    const org = booking.organization?.trim() || ''
    const isOrganization = org && !personalCategories.includes(org)
    const key = isOrganization ? org : booking.applicant_name

    if (!userMap.has(key)) {
      userMap.set(key, {
        name: key,
        isOrganization,
        bookings: [],
      })
    }

    userMap.get(key)!.bookings.push({
      date: booking.rental_date,
      hours: booking.time_slots?.length || 0,
      fee: booking.fee || 0,
    })
  })

  // 장기 이용자 필터링 및 정렬
  const longTermUsers: LongTermUser[] = []

  userMap.forEach((user) => {
    if (user.bookings.length >= minBookings) {
      const dates = user.bookings.map(b => b.date).sort()
      const months = new Set(dates.map(d => d.substring(0, 7)))

      longTermUsers.push({
        name: user.name,
        isOrganization: user.isOrganization,
        bookingCount: user.bookings.length,
        totalHours: user.bookings.reduce((sum, b) => sum + b.hours, 0),
        totalRevenue: user.bookings.reduce((sum, b) => sum + b.fee, 0),
        firstBookingDate: dates[0],
        lastBookingDate: dates[dates.length - 1],
        activeMonths: months.size,
      })
    }
  })

  // 예약 횟수 기준 내림차순 정렬
  longTermUsers.sort((a, b) => b.bookingCount - a.bookingCount)

  return {
    totalLongTermUsers: longTermUsers.length,
    longTermUsers,
    criteria: {
      minBookings,
      periodMonths,
    },
  }
}

/**
 * 장기 이용자 수 조회 (KPI용 간단 버전)
 * 기관 단위로만 카운트 (개인 제외)
 */
export async function getLongTermUserCount(
  periodMonths: number = 12,
  minBookings: number = 3
): Promise<number> {
  const stats = await getLongTermUsers(periodMonths, minBookings)
  // 기관만 카운트
  return stats.longTermUsers.filter(u => u.isOrganization).length
}

/**
 * 연도 기준 장기 이용자 통계 조회
 * 해당 연도 내 일정 횟수 이상 예약한 기관/개인
 *
 * @param year 집계 연도
 * @param minBookings 최소 예약 횟수, 기본 3회
 */
export async function getLongTermUsersByYear(
  year: number,
  minBookings: number = 3
): Promise<LongTermUserStats> {
  // 해당 연도 기간 계산
  const startDateStr = `${year}-01-01`
  const endDateStr = `${year}-12-31`

  const { data, error } = await supabase
    .from('bookings')
    .select('applicant_name, organization, rental_date, time_slots, fee, status')
    .gte('rental_date', startDateStr)
    .lte('rental_date', endDateStr)
    .not('status', 'eq', 'CANCELLED')

  if (error) throw error

  // 기관별/개인별 집계
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userMap = new Map<string, {
    name: string
    isOrganization: boolean
    bookings: { date: string; hours: number; fee: number }[]
  }>()

  // 개인 카테고리 (기관으로 분류하지 않음)
  const personalCategories = ['개인', '프리랜서', '직장인', '학생', '무직', '']

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(data as any[] || []).forEach((booking) => {
    const org = booking.organization?.trim() || ''
    const isOrganization = org && !personalCategories.includes(org)
    const key = isOrganization ? org : booking.applicant_name

    if (!userMap.has(key)) {
      userMap.set(key, {
        name: key,
        isOrganization,
        bookings: [],
      })
    }

    userMap.get(key)!.bookings.push({
      date: booking.rental_date,
      hours: booking.time_slots?.length || 0,
      fee: booking.fee || 0,
    })
  })

  // 장기 이용자 필터링 및 정렬
  const longTermUsers: LongTermUser[] = []

  userMap.forEach((user) => {
    if (user.bookings.length >= minBookings) {
      const dates = user.bookings.map(b => b.date).sort()
      const months = new Set(dates.map(d => d.substring(0, 7)))

      longTermUsers.push({
        name: user.name,
        isOrganization: user.isOrganization,
        bookingCount: user.bookings.length,
        totalHours: user.bookings.reduce((sum, b) => sum + b.hours, 0),
        totalRevenue: user.bookings.reduce((sum, b) => sum + b.fee, 0),
        firstBookingDate: dates[0],
        lastBookingDate: dates[dates.length - 1],
        activeMonths: months.size,
      })
    }
  })

  // 예약 횟수 기준 내림차순 정렬
  longTermUsers.sort((a, b) => b.bookingCount - a.bookingCount)

  return {
    totalLongTermUsers: longTermUsers.length,
    longTermUsers,
    criteria: {
      minBookings,
      periodMonths: 12, // 연도 기준이므로 12로 고정
    },
  }
}
