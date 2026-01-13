// Excel 데이터 파싱 및 변환 유틸리티
import { STUDIOS } from '@/lib/constants'

export interface RawBookingData {
  순번: string
  예약구분: string
  대관구분: string
  예약일: string
  예약시간: string
  신청시설: string
  신청자명: string
  행사명: string
  행사규모: string
  소속: string
  대관료: string
  예약상태: string
  취소일시: string | null
  등록일: string
}

export interface ParsedBooking {
  id: string
  studioId: number
  studioName: string
  rentalDate: string // YYYY-MM-DD
  startHour: number
  endHour: number
  timeDisplay: string
  applicantName: string
  eventName: string
  participantsCount: number
  organization: string
  fee: number
  status: string
  statusCode: string
  cancelledAt: string | null
  createdAt: string
}

// 예약 상태 한글 -> 영문 코드 변환
const STATUS_MAP: Record<string, string> = {
  '예약신청': 'APPLIED',
  '승인대기': 'PENDING',
  '대관확정': 'CONFIRMED',
  '사용중': 'IN_USE',
  '완료': 'DONE',
  '예약취소': 'CANCELLED',
}

// 스튜디오 이름 -> ID 변환
function getStudioId(name: string): number {
  const studio = STUDIOS.find(
    (s) =>
      s.name === name ||
      s.alias === name ||
      name.includes(s.name) ||
      s.name.includes(name)
  )
  return studio?.id || 1
}

// 날짜 변환 (2026.03.03 -> 2026-03-03)
function parseDate(dateStr: string): string {
  if (!dateStr) return ''
  return dateStr.replace(/\./g, '-')
}

// 시간 파싱 (14:00~15:00, 15:00~16:00, 16:00~17:00 -> { start: 14, end: 17 })
function parseTimeRange(timeStr: string): { start: number; end: number } {
  if (!timeStr) return { start: 9, end: 10 }

  // 모든 시간대 매칭
  const matches = timeStr.matchAll(/(\d{1,2}):\d*~(\d{1,2}):\d*/g)
  const ranges = Array.from(matches)

  if (ranges.length === 0) return { start: 9, end: 10 }

  // 첫 시간대의 시작, 마지막 시간대의 종료
  const start = parseInt(ranges[0][1], 10)
  const end = parseInt(ranges[ranges.length - 1][2], 10)

  return { start, end }
}

// 인원수 파싱 (2명 -> 2)
function parseParticipants(str: string): number {
  if (!str) return 1
  const match = str.match(/(\d+)/)
  return match ? parseInt(match[1], 10) : 1
}

// 금액 파싱 (0원 -> 0)
function parseFee(str: string): number {
  if (!str) return 0
  const cleaned = str.replace(/[^0-9]/g, '')
  return parseInt(cleaned, 10) || 0
}

export function parseBookingData(raw: RawBookingData): ParsedBooking {
  const time = parseTimeRange(raw.예약시간)
  const studioId = getStudioId(raw.신청시설)
  const studio = STUDIOS.find((s) => s.id === studioId)

  return {
    id: raw.순번,
    studioId,
    studioName: studio?.alias || raw.신청시설,
    rentalDate: parseDate(raw.예약일),
    startHour: time.start,
    endHour: time.end,
    timeDisplay: `${time.start}~${time.end}시`,
    applicantName: raw.신청자명,
    eventName: raw.행사명,
    participantsCount: parseParticipants(raw.행사규모),
    organization: raw.소속,
    fee: parseFee(raw.대관료),
    status: raw.예약상태,
    statusCode: STATUS_MAP[raw.예약상태] || 'APPLIED',
    cancelledAt: raw.취소일시,
    createdAt: parseDate(raw.등록일),
  }
}

export function parseAllBookings(data: RawBookingData[]): ParsedBooking[] {
  return data.map(parseBookingData)
}

// 날짜별 예약 필터링
export function filterBookingsByDate(
  bookings: ParsedBooking[],
  date: string
): ParsedBooking[] {
  return bookings.filter((b) => b.rentalDate === date)
}

// 날짜 범위 내 예약 필터링
export function filterBookingsByDateRange(
  bookings: ParsedBooking[],
  startDate: string,
  endDate: string
): ParsedBooking[] {
  return bookings.filter(
    (b) => b.rentalDate >= startDate && b.rentalDate <= endDate
  )
}

// 스튜디오별 통계 계산
export function calculateStudioStats(
  bookings: ParsedBooking[],
  startDate: string,
  endDate: string
) {
  const filtered = filterBookingsByDateRange(bookings, startDate, endDate).filter(
    (b) => b.statusCode !== 'CANCELLED'
  )

  // 기간 내 총 일수 계산
  const start = new Date(startDate)
  const end = new Date(endDate)
  const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1

  return STUDIOS.map((studio) => {
    const studioBookings = filtered.filter((b) => b.studioId === studio.id)
    const totalHours = studioBookings.reduce(
      (sum, b) => sum + (b.endHour - b.startHour),
      0
    )
    // 하루 9시간 운영 기준 가동률
    const maxHours = daysDiff * 9
    const utilizationRate = maxHours > 0 ? (totalHours / maxHours) * 100 : 0

    return {
      studioId: studio.id,
      studioName: studio.alias,
      totalBookings: studioBookings.length,
      totalHours,
      utilizationRate,
    }
  })
}
