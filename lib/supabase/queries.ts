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
    .select('*, studio:studios(*)', { count: 'exact' })

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

  return {
    data: (data || []) as BookingWithStudio[],
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
