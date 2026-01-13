'use client'

import { useState, useMemo } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import GlassCard from '@/components/ui/GlassCard'
import StudioBadge from '@/components/ui/StudioBadge'
import { allBookings } from '@/lib/data'
import { STUDIOS, VALID_TIME_SLOTS } from '@/lib/constants'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

// 요일 이름
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

// 달력 데이터 생성
function generateCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startDayOfWeek = firstDay.getDay()

  const days: (number | null)[] = []

  // 이전 달의 빈 칸
  for (let i = 0; i < startDayOfWeek; i++) {
    days.push(null)
  }

  // 현재 달의 날짜
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i)
  }

  return days
}

// 날짜 문자열 생성
function formatDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export default function CalendarPage() {
  const today = new Date()
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedStudio, setSelectedStudio] = useState<number | null>(null)

  // 달력 날짜 배열
  const calendarDays = useMemo(
    () => generateCalendarDays(currentYear, currentMonth),
    [currentYear, currentMonth]
  )

  // 날짜별 예약 카운트 맵
  const bookingCountMap = useMemo(() => {
    const map: Record<string, number> = {}
    allBookings
      .filter((b) => b.statusCode !== 'CANCELLED')
      .filter((b) => !selectedStudio || b.studioId === selectedStudio)
      .forEach((booking) => {
        map[booking.rentalDate] = (map[booking.rentalDate] || 0) + 1
      })
    return map
  }, [selectedStudio])

  // 선택된 날짜의 예약 목록
  const selectedDateBookings = useMemo(() => {
    if (!selectedDate) return []
    return allBookings
      .filter((b) => b.rentalDate === selectedDate)
      .filter((b) => !selectedStudio || b.studioId === selectedStudio)
      .sort((a, b) => a.startHour - b.startHour)
  }, [selectedDate, selectedStudio])

  // 이전/다음 달 이동
  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentYear(currentYear - 1)
      setCurrentMonth(11)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
  }

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentYear(currentYear + 1)
      setCurrentMonth(0)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
  }

  // 오늘로 이동
  const goToToday = () => {
    setCurrentYear(today.getFullYear())
    setCurrentMonth(today.getMonth())
    setSelectedDate(formatDateStr(today.getFullYear(), today.getMonth(), today.getDate()))
  }

  // 오늘 날짜 문자열
  const todayStr = formatDateStr(today.getFullYear(), today.getMonth(), today.getDate())

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-white mb-1">캘린더</h1>
          <p className="text-sm text-gray-500">날짜별 예약 현황을 확인하세요</p>
        </div>

        {/* Studio Filter */}
        <select
          value={selectedStudio || ''}
          onChange={(e) => setSelectedStudio(e.target.value ? Number(e.target.value) : null)}
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-colors"
        >
          <option value="">전체 스튜디오</option>
          {STUDIOS.map((studio) => (
            <option key={studio.id} value={studio.id}>
              {studio.alias}
            </option>
          ))}
        </select>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <GlassCard className="lg:col-span-2">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={goToPrevMonth}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-white">
                {currentYear}년 {currentMonth + 1}월
              </h2>
              <button
                onClick={goToToday}
                className="px-2 py-1 text-xs text-purple-400 hover:text-purple-300 border border-purple-500/30 rounded-md transition-colors"
              >
                오늘
              </button>
            </div>
            <button
              onClick={goToNextMonth}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {WEEKDAYS.map((day, idx) => (
              <div
                key={day}
                className={cn(
                  'text-center text-xs font-medium py-2',
                  idx === 0 ? 'text-red-400' : idx === 6 ? 'text-blue-400' : 'text-gray-500'
                )}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} className="aspect-square" />
              }

              const dateStr = formatDateStr(currentYear, currentMonth, day)
              const bookingCount = bookingCountMap[dateStr] || 0
              const isToday = dateStr === todayStr
              const isSelected = dateStr === selectedDate
              const dayOfWeek = idx % 7

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  className={cn(
                    'aspect-square p-1 rounded-lg transition-all relative',
                    'hover:bg-white/5',
                    isSelected && 'bg-purple-500/20 border border-purple-500/30',
                    isToday && !isSelected && 'bg-white/5'
                  )}
                >
                  <span
                    className={cn(
                      'text-sm',
                      isToday && 'font-bold text-purple-400',
                      !isToday && dayOfWeek === 0 && 'text-red-400',
                      !isToday && dayOfWeek === 6 && 'text-blue-400',
                      !isToday && dayOfWeek !== 0 && dayOfWeek !== 6 && 'text-gray-300'
                    )}
                  >
                    {day}
                  </span>
                  {bookingCount > 0 && (
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                      {bookingCount <= 3 ? (
                        Array.from({ length: bookingCount }).map((_, i) => (
                          <div
                            key={i}
                            className="w-1 h-1 rounded-full bg-purple-400"
                          />
                        ))
                      ) : (
                        <span className="text-[10px] text-purple-400 font-medium">
                          {bookingCount}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </GlassCard>

        {/* Selected Date Detail */}
        <GlassCard>
          <h3 className="text-lg font-semibold text-white mb-4">
            {selectedDate
              ? new Date(selectedDate).toLocaleDateString('ko-KR', {
                  month: 'long',
                  day: 'numeric',
                  weekday: 'long',
                })
              : '날짜를 선택하세요'}
          </h3>

          {selectedDate ? (
            selectedDateBookings.length > 0 ? (
              <div className="space-y-3 max-h-[500px] overflow-y-auto scrollbar-thin">
                {selectedDateBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className={cn(
                      'p-3 rounded-xl bg-white/[0.03] border-l-2',
                      booking.statusCode === 'CONFIRMED' && 'border-green-500',
                      booking.statusCode === 'PENDING' && 'border-yellow-500',
                      booking.statusCode === 'APPLIED' && 'border-blue-500',
                      booking.statusCode === 'CANCELLED' && 'border-red-500',
                      booking.statusCode === 'DONE' && 'border-gray-500'
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <StudioBadge studioId={booking.studioId} />
                      <span className="text-xs text-gray-500">{booking.timeDisplay}</span>
                    </div>
                    <p className="text-sm text-white">{booking.applicantName}</p>
                    {booking.organization && (
                      <p className="text-xs text-gray-500">{booking.organization}</p>
                    )}
                    {booking.eventName && (
                      <p className="text-xs text-gray-400 mt-1 truncate">
                        {booking.eventName}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">예약이 없습니다</p>
            )
          ) : (
            <p className="text-center text-gray-500 py-8">
              캘린더에서 날짜를 선택하면
              <br />
              해당 날짜의 예약을 확인할 수 있습니다
            </p>
          )}
        </GlassCard>
      </div>

      {/* Timeline View for Selected Date */}
      {selectedDate && selectedDateBookings.length > 0 && (
        <GlassCard className="mt-6">
          <h3 className="text-lg font-semibold text-white mb-4">타임라인 뷰</h3>
          <div className="overflow-x-auto scrollbar-thin">
            <div className="min-w-[600px]">
              {/* Time Header */}
              <div className="flex border-b border-white/5 pb-2 mb-2">
                <div className="w-24 flex-shrink-0" />
                {VALID_TIME_SLOTS.map((hour) => (
                  <div
                    key={hour}
                    className="flex-1 text-center text-xs text-gray-500"
                  >
                    {hour}시
                  </div>
                ))}
              </div>

              {/* Studio Rows */}
              {STUDIOS.filter(
                (studio) => !selectedStudio || studio.id === selectedStudio
              ).map((studio) => {
                const studioBookings = selectedDateBookings.filter(
                  (b) => b.studioId === studio.id
                )

                return (
                  <div
                    key={studio.id}
                    className="flex items-center py-2 border-b border-white/5 last:border-0"
                  >
                    <div className="w-24 flex-shrink-0 pr-2">
                      <StudioBadge studioId={studio.id} name={studio.alias} />
                    </div>
                    <div className="flex-1 flex relative h-10">
                      {/* Time Slots Background */}
                      {VALID_TIME_SLOTS.map((hour) => (
                        <div
                          key={hour}
                          className="flex-1 border-r border-white/5 last:border-0"
                        />
                      ))}

                      {/* Bookings */}
                      {studioBookings.map((booking) => {
                        const startIdx = VALID_TIME_SLOTS.indexOf(booking.startHour)
                        const duration = booking.endHour - booking.startHour
                        const widthPercent =
                          (duration / VALID_TIME_SLOTS.length) * 100
                        const leftPercent =
                          (startIdx / VALID_TIME_SLOTS.length) * 100

                        if (startIdx === -1) return null

                        return (
                          <div
                            key={booking.id}
                            className={cn(
                              'absolute top-1 bottom-1 rounded-md px-2 flex items-center',
                              'bg-gradient-to-r from-purple-500/30 to-pink-500/30 border border-purple-500/20',
                              'text-xs text-white truncate'
                            )}
                            style={{
                              left: `${leftPercent}%`,
                              width: `${widthPercent}%`,
                            }}
                            title={`${booking.applicantName} - ${booking.eventName || '예약'}`}
                          >
                            <span className="truncate">{booking.applicantName}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </GlassCard>
      )}
    </AdminLayout>
  )
}
