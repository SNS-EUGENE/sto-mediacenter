'use client'

import { useState, useMemo, useEffect } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import GlassCard from '@/components/ui/GlassCard'
import { allBookings } from '@/lib/data'
import { STUDIOS, VALID_TIME_SLOTS } from '@/lib/constants'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

// 날짜 문자열 생성
function formatDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// 시간 슬롯 (9시~18시, 18시는 종료선으로만 사용)
const TIME_MARKERS = [...VALID_TIME_SLOTS, 18]

export default function LiveStatusPage() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(formatDateStr(new Date()))
  const [hoveredBooking, setHoveredBooking] = useState<string | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [windowWidth, setWindowWidth] = useState(0)

  // 현재 시각 업데이트 + 윈도우 너비 추적
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)

    const handleResize = () => setWindowWidth(window.innerWidth)
    handleResize() // 초기값 설정
    window.addEventListener('resize', handleResize)

    return () => {
      clearInterval(timer)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  // 선택된 날짜의 예약 목록
  const dayBookings = useMemo(() => {
    return allBookings
      .filter((b) => b.rentalDate === selectedDate && b.statusCode !== 'CANCELLED')
      .sort((a, b) => a.startHour - b.startHour)
  }, [selectedDate])

  // 날짜 이동
  const goToPrevDay = () => {
    const date = new Date(selectedDate)
    date.setDate(date.getDate() - 1)
    setSelectedDate(formatDateStr(date))
  }

  const goToNextDay = () => {
    const date = new Date(selectedDate)
    date.setDate(date.getDate() + 1)
    setSelectedDate(formatDateStr(date))
  }

  const goToToday = () => {
    setSelectedDate(formatDateStr(new Date()))
  }

  // 현재 시각 위치 계산 (9시~18시 기준)
  const currentHour = currentTime.getHours()
  const currentMinute = currentTime.getMinutes()
  const isToday = selectedDate === formatDateStr(new Date())
  const currentTimePosition = isToday && currentHour >= 9 && currentHour < 18
    ? ((currentHour - 9 + currentMinute / 60) / 9) * 100
    : null

  // 호버된 예약 정보
  const hoveredBookingData = hoveredBooking
    ? dayBookings.find((b) => b.id === hoveredBooking)
    : null

  // 스튜디오 색상
  const studioColors: Record<number, { bg: string; border: string; text: string }> = {
    1: { bg: 'from-violet-500/30 to-purple-500/30', border: 'border-violet-500/40', text: 'text-violet-400' },
    2: { bg: 'from-cyan-500/30 to-blue-500/30', border: 'border-cyan-500/40', text: 'text-cyan-400' },
    3: { bg: 'from-pink-500/30 to-rose-500/30', border: 'border-pink-500/40', text: 'text-pink-400' },
  }

  return (
    <AdminLayout>
      <div className="h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
          {/* Left: Title + Date Navigation */}
          <div className="flex items-center gap-6">
            <h1 className="text-xl lg:text-2xl font-bold text-white">실시간 현황</h1>

            {/* Date Navigation */}
            <div className="flex items-center gap-1">
              <button
                onClick={goToPrevDay}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={goToToday}
                className={cn(
                  'px-2.5 py-1 text-sm rounded-lg transition-colors',
                  isToday
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                )}
              >
                오늘
              </button>
              <span className="px-2 py-1 text-white font-medium text-sm">
                {new Date(selectedDate).toLocaleDateString('ko-KR', {
                  month: 'long',
                  day: 'numeric',
                  weekday: 'short',
                })}
              </span>
              <button
                onClick={goToNextDay}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right: Current Time */}
          <div className="text-xl lg:text-2xl font-bold text-purple-400 tabular-nums">
            {currentTime.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
        </div>

        {/* Timeline Card */}
        <GlassCard className="flex-1 min-h-0 flex flex-col p-0 overflow-hidden">
          <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden">
            <div className="min-w-[700px] h-full flex flex-col">
              {/* Time Markers Row */}
              <div className="flex-shrink-0 flex h-8">
                {/* Empty space for studio labels */}
                <div className="w-28 flex-shrink-0" />
                {/* Time markers - positioned at the start of each hour */}
                <div className="flex-1 relative px-4">
                  {TIME_MARKERS.map((hour, idx) => (
                    <div
                      key={hour}
                      className="absolute top-0 bottom-0 flex items-center"
                      style={{ left: `calc(${(idx / 9) * 100}% * 0.92 + 2%)`, transform: 'translateX(-50%)' }}
                    >
                      <span className="text-xs text-gray-500 font-medium">{hour}시</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Studio Rows - Fill remaining space */}
              <div className="flex-1 flex flex-col min-h-0">
                {STUDIOS.map((studio) => {
                  const studioBookings = dayBookings.filter((b) => b.studioId === studio.id)
                  const colors = studioColors[studio.id] || studioColors[1]

                  return (
                    <div
                      key={studio.id}
                      className="flex-1 flex border-t border-white/5 first:border-t-0 min-h-[80px]"
                    >
                      {/* Studio Label */}
                      <div className="w-28 flex-shrink-0 flex items-center justify-center px-2 border-r border-white/5">
                        <span className={cn('text-sm font-bold whitespace-nowrap text-center', colors.text)}>
                          {studio.name}
                        </span>
                      </div>

                      {/* Timeline Area */}
                      <div className="flex-1 relative px-4">
                        {/* Vertical Grid Lines */}
                        {TIME_MARKERS.map((hour, idx) => (
                          <div
                            key={hour}
                            className="absolute top-0 bottom-0 w-px bg-white/5"
                            style={{ left: `calc(${(idx / 9) * 100}% * 0.92 + 2%)` }}
                          />
                        ))}

                        {/* Current Time Line */}
                        {currentTimePosition !== null && (
                          <div
                            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
                            style={{ left: `calc(${currentTimePosition}% * 0.92 + 2%)` }}
                          />
                        )}

                        {/* Bookings */}
                        {studioBookings.map((booking) => {
                          const startPercent = ((booking.startHour - 9) / 9) * 100
                          const duration = booking.endHour - booking.startHour
                          const widthPercent = (duration / 9) * 100

                          // 현재 진행 중인지 확인
                          const isActive = isToday &&
                            currentHour >= booking.startHour &&
                            currentHour < booking.endHour

                          return (
                            <div
                              key={booking.id}
                              className={cn(
                                'absolute top-1/2 -translate-y-1/2 h-14 rounded-lg px-3 py-1.5 flex flex-col justify-center cursor-pointer transition-all z-10',
                                'border text-white',
                                isActive
                                  ? `bg-gradient-to-r ${colors.bg} ${colors.border} shadow-lg`
                                  : `bg-gradient-to-r ${colors.bg} border-white/10 hover:${colors.border}`
                              )}
                              style={{
                                left: `calc(${startPercent}% * 0.92 + 2%)`,
                                width: `calc(${widthPercent}% * 0.92)`,
                              }}
                              onMouseEnter={(e) => {
                                setHoveredBooking(booking.id)
                                setMousePos({ x: e.clientX, y: e.clientY })
                              }}
                              onMouseMove={(e) => {
                                setMousePos({ x: e.clientX, y: e.clientY })
                              }}
                              onMouseLeave={() => setHoveredBooking(null)}
                            >
                              <div className="flex items-center gap-2">
                                <span className="truncate text-sm font-medium">{booking.applicantName}</span>
                                {isActive && (
                                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
                                )}
                              </div>
                              {booking.organization && (
                                <span className="truncate text-xs text-gray-400">{booking.organization}</span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Summary - Fill full width at bottom */}
          <div className="flex-shrink-0 grid grid-cols-3 border-t border-white/5">
            {STUDIOS.map((studio) => {
              const studioBookings = dayBookings.filter((b) => b.studioId === studio.id)
              const totalHours = studioBookings.reduce((sum, b) => sum + (b.endHour - b.startHour), 0)
              const colors = studioColors[studio.id] || studioColors[1]

              return (
                <div
                  key={studio.id}
                  className={cn(
                    'p-4 lg:p-6 text-center border-r border-white/5 last:border-r-0',
                    'bg-gradient-to-b from-white/[0.02] to-transparent'
                  )}
                >
                  <p className={cn('text-sm font-medium mb-1', colors.text)}>{studio.alias}</p>
                  <p className="text-2xl lg:text-3xl font-bold text-white">{studioBookings.length}건</p>
                  <p className="text-sm text-gray-500">{totalHours}시간</p>
                </div>
              )
            })}
          </div>
        </GlassCard>
      </div>

      {/* Hover Tooltip */}
      {hoveredBookingData && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: mousePos.x > windowWidth * 0.6 ? mousePos.x - 256 : mousePos.x + 16,
            top: mousePos.y + 16,
          }}
        >
          <div className="bg-[#1a1a24] border border-white/10 rounded-xl p-4 shadow-2xl min-w-[240px]">
            <div className="flex items-center justify-between mb-3">
              <span className={cn('text-sm font-medium', studioColors[hoveredBookingData.studioId]?.text)}>
                {STUDIOS.find(s => s.id === hoveredBookingData.studioId)?.alias}
              </span>
              <span className="text-sm text-purple-400 font-medium">
                {hoveredBookingData.timeDisplay}
              </span>
            </div>
            <p className="text-white font-medium mb-1">{hoveredBookingData.applicantName}</p>
            {hoveredBookingData.organization && (
              <p className="text-sm text-gray-400 mb-2">{hoveredBookingData.organization}</p>
            )}
            {hoveredBookingData.eventName && (
              <p className="text-sm text-gray-500 border-t border-white/5 pt-2 mt-2">
                {hoveredBookingData.eventName}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
              <span>{hoveredBookingData.participantsCount}명</span>
              <span>•</span>
              <span>{hoveredBookingData.status}</span>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
