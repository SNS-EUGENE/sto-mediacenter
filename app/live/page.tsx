'use client'

import { useState, useMemo, useEffect } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import GlassCard from '@/components/ui/GlassCard'
import StudioBadge from '@/components/ui/StudioBadge'
import { allBookings } from '@/lib/data'
import { STUDIOS, VALID_TIME_SLOTS } from '@/lib/constants'
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

// 날짜 문자열 생성
function formatDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export default function LiveStatusPage() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(formatDateStr(new Date()))
  const [hoveredBooking, setHoveredBooking] = useState<string | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  // 현재 시각 업데이트
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
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

  return (
    <AdminLayout>
      <div className="h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between pb-4">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-white mb-1">실시간 현황</h1>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              <span>{currentTime.toLocaleTimeString('ko-KR')}</span>
            </div>
          </div>

          {/* Date Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={goToPrevDay}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={goToToday}
              className={cn(
                'px-3 py-1.5 text-sm rounded-lg transition-colors',
                isToday
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              )}
            >
              오늘
            </button>
            <span className="px-3 py-1.5 text-white font-medium">
              {new Date(selectedDate).toLocaleDateString('ko-KR', {
                month: 'long',
                day: 'numeric',
                weekday: 'short',
              })}
            </span>
            <button
              onClick={goToNextDay}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Timeline */}
        <GlassCard className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Time Header */}
            <div className="flex border-b border-white/5">
              <div className="w-28 flex-shrink-0 p-3 text-xs text-gray-500 font-medium">
                스튜디오
              </div>
              <div className="flex-1 flex relative">
                {VALID_TIME_SLOTS.map((hour) => (
                  <div
                    key={hour}
                    className="flex-1 p-3 text-xs text-gray-500 font-medium border-l border-white/5 text-left"
                  >
                    {hour}시
                  </div>
                ))}
                {/* Current Time Indicator */}
                {currentTimePosition !== null && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                    style={{ left: `${currentTimePosition}%` }}
                  >
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-red-500" />
                  </div>
                )}
              </div>
            </div>

            {/* Studio Rows */}
            {STUDIOS.map((studio) => {
              const studioBookings = dayBookings.filter((b) => b.studioId === studio.id)

              return (
                <div
                  key={studio.id}
                  className="flex border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="w-28 flex-shrink-0 p-3 flex items-center">
                    <StudioBadge studioId={studio.id} name={studio.alias} />
                  </div>
                  <div className="flex-1 relative h-16">
                    {/* Time Grid Background */}
                    <div className="absolute inset-0 flex">
                      {VALID_TIME_SLOTS.map((hour) => (
                        <div
                          key={hour}
                          className="flex-1 border-l border-white/5"
                        />
                      ))}
                    </div>

                    {/* Current Time Line */}
                    {currentTimePosition !== null && (
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-red-500/50 z-10"
                        style={{ left: `${currentTimePosition}%` }}
                      />
                    )}

                    {/* Bookings */}
                    {studioBookings.map((booking) => {
                      const startIdx = VALID_TIME_SLOTS.indexOf(booking.startHour)
                      const duration = booking.endHour - booking.startHour
                      const widthPercent = (duration / VALID_TIME_SLOTS.length) * 100
                      const leftPercent = (startIdx / VALID_TIME_SLOTS.length) * 100

                      if (startIdx === -1) return null

                      // 현재 진행 중인지 확인
                      const isActive = isToday &&
                        currentHour >= booking.startHour &&
                        currentHour < booking.endHour

                      return (
                        <div
                          key={booking.id}
                          className={cn(
                            'absolute top-2 bottom-2 rounded-lg px-3 flex items-center cursor-pointer transition-all',
                            'border text-xs text-white truncate',
                            isActive
                              ? 'bg-gradient-to-r from-purple-500/40 to-pink-500/40 border-purple-500/50 animate-pulse'
                              : 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/20 hover:border-purple-500/40'
                          )}
                          style={{
                            left: `${leftPercent}%`,
                            width: `${widthPercent}%`,
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
                          <span className="truncate">{booking.applicantName}</span>
                          {isActive && (
                            <span className="ml-2 w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
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

        {/* Summary - Fixed at bottom */}
        <div className="flex-shrink-0 grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-white/5">
          {STUDIOS.map((studio) => {
            const studioBookings = dayBookings.filter((b) => b.studioId === studio.id)
            const totalHours = studioBookings.reduce((sum, b) => sum + (b.endHour - b.startHour), 0)

            return (
              <div key={studio.id} className="text-center p-3 rounded-xl bg-white/[0.03]">
                <StudioBadge studioId={studio.id} name={studio.alias} className="mb-2" />
                <p className="text-xl font-bold text-white">{studioBookings.length}건</p>
                <p className="text-xs text-gray-500">{totalHours}시간</p>
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
            left: mousePos.x + 16,
            top: mousePos.y + 16,
          }}
        >
          <div className="bg-[#1a1a24] border border-white/10 rounded-xl p-4 shadow-2xl min-w-[240px]">
            <div className="flex items-center justify-between mb-3">
              <StudioBadge studioId={hoveredBookingData.studioId} />
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
