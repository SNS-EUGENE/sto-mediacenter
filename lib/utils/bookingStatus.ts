// 예약 상태 계산 유틸리티
// DB에는 CONFIRMED만 저장하고, 조회 시점에 IN_USE/DONE을 계산

import type { Booking, BookingWithStudio } from '@/types/supabase'

export type ComputedStatus = Booking['status']

/**
 * 현재 시간 기준으로 예약의 실제 상태를 계산
 * - CONFIRMED 상태인 예약만 IN_USE/DONE으로 변환
 * - 다른 상태(APPLIED, PENDING, CANCELLED)는 그대로 유지
 */
export function getComputedStatus(
  booking: Booking | BookingWithStudio,
  now: Date = new Date()
): ComputedStatus {
  // CONFIRMED가 아니면 원래 상태 유지
  if (booking.status !== 'CONFIRMED') {
    return booking.status
  }

  const rentalDate = new Date(booking.rental_date)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const bookingDay = new Date(rentalDate.getFullYear(), rentalDate.getMonth(), rentalDate.getDate())

  // 예약일이 오늘 이전이면 DONE
  if (bookingDay < today) {
    return 'DONE'
  }

  // 예약일이 오늘 이후면 CONFIRMED 유지
  if (bookingDay > today) {
    return 'CONFIRMED'
  }

  // 예약일이 오늘인 경우 - 시간대 확인
  const currentHour = now.getHours()
  const timeSlots = booking.time_slots || []

  if (timeSlots.length === 0) {
    return 'CONFIRMED'
  }

  const minSlot = Math.min(...timeSlots)
  const maxSlot = Math.max(...timeSlots)

  // 현재 시간이 예약 시간대 내에 있으면 IN_USE
  if (currentHour >= minSlot && currentHour <= maxSlot) {
    return 'IN_USE'
  }

  // 예약 시간이 이미 지났으면 DONE
  if (currentHour > maxSlot) {
    return 'DONE'
  }

  // 예약 시간 전이면 CONFIRMED 유지
  return 'CONFIRMED'
}

/**
 * 예약 목록에 계산된 상태 적용
 */
export function applyComputedStatus<T extends Booking | BookingWithStudio>(
  bookings: T[],
  now: Date = new Date()
): (T & { computedStatus: ComputedStatus })[] {
  return bookings.map((booking) => ({
    ...booking,
    computedStatus: getComputedStatus(booking, now),
  }))
}

/**
 * 상태별 필터링 (계산된 상태 기준)
 */
export function filterByComputedStatus<T extends Booking | BookingWithStudio>(
  bookings: T[],
  statuses: ComputedStatus[],
  now: Date = new Date()
): T[] {
  if (statuses.length === 0) return bookings

  return bookings.filter((booking) => {
    const computed = getComputedStatus(booking, now)
    return statuses.includes(computed)
  })
}
