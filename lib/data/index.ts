// 데이터 로딩 유틸리티
import bookingDataJson from '@/booking_data.json'
import {
  parseAllBookings,
  filterBookingsByDate,
  filterBookingsByDateRange,
  calculateStudioStats,
  type ParsedBooking,
  type RawBookingData,
} from './bookingParser'

// JSON 데이터를 파싱된 예약 데이터로 변환
const rawData = bookingDataJson as RawBookingData[]
export const allBookings = parseAllBookings(rawData)

// 오늘 날짜 (YYYY-MM-DD)
export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0]
}

// 이번 달 시작/끝 날짜
export function getMonthRange(date: Date = new Date()): { start: string; end: string } {
  const year = date.getFullYear()
  const month = date.getMonth()
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 0)

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  }
}

// 오늘의 예약 조회
export function getTodayBookings(): ParsedBooking[] {
  const today = getTodayDate()
  return filterBookingsByDate(allBookings, today)
}

// 특정 날짜의 예약 조회
export function getBookingsByDate(date: string): ParsedBooking[] {
  return filterBookingsByDate(allBookings, date)
}

// 날짜 범위 내 예약 조회
export function getBookingsInRange(startDate: string, endDate: string): ParsedBooking[] {
  return filterBookingsByDateRange(allBookings, startDate, endDate)
}

// 최근 예약 조회 (최신순)
export function getRecentBookings(limit: number = 10): ParsedBooking[] {
  return [...allBookings]
    .sort((a, b) => {
      // 먼저 등록일 기준 정렬
      if (a.createdAt !== b.createdAt) {
        return b.createdAt.localeCompare(a.createdAt)
      }
      // 같은 등록일이면 예약일 기준
      return b.rentalDate.localeCompare(a.rentalDate)
    })
    .slice(0, limit)
}

// 이번 달 스튜디오 통계
export function getMonthlyStudioStats(date: Date = new Date()) {
  const { start, end } = getMonthRange(date)
  return calculateStudioStats(allBookings, start, end)
}

// 전체 통계 요약
export function getDashboardStats() {
  const today = getTodayDate()
  const { start: monthStart, end: monthEnd } = getMonthRange()

  const todayBookings = filterBookingsByDate(allBookings, today).filter(
    (b) => b.statusCode !== 'CANCELLED'
  )
  const monthBookings = filterBookingsByDateRange(allBookings, monthStart, monthEnd).filter(
    (b) => b.statusCode !== 'CANCELLED'
  )

  const todayHours = todayBookings.reduce(
    (sum, b) => sum + (b.endHour - b.startHour),
    0
  )
  const monthHours = monthBookings.reduce(
    (sum, b) => sum + (b.endHour - b.startHour),
    0
  )

  // 상태별 카운트
  const statusCounts = monthBookings.reduce(
    (acc, b) => {
      acc[b.statusCode] = (acc[b.statusCode] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  return {
    today: {
      bookings: todayBookings.length,
      hours: todayHours,
    },
    month: {
      bookings: monthBookings.length,
      hours: monthHours,
      confirmed: statusCounts['CONFIRMED'] || 0,
      pending: statusCounts['PENDING'] || 0,
      applied: statusCounts['APPLIED'] || 0,
    },
    total: {
      bookings: allBookings.filter((b) => b.statusCode !== 'CANCELLED').length,
    },
  }
}

// 예약 상태별 필터링
export function getBookingsByStatus(status: string): ParsedBooking[] {
  return allBookings.filter((b) => b.statusCode === status)
}

// 스튜디오별 예약 조회
export function getBookingsByStudio(studioId: number): ParsedBooking[] {
  return allBookings.filter((b) => b.studioId === studioId)
}
