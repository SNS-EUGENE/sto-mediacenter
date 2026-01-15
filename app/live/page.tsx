'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import GlassCard from '@/components/ui/GlassCard'
import { supabase } from '@/lib/supabase/client'
import { getBookingsByDate } from '@/lib/supabase/queries'
import { STUDIOS, VALID_TIME_SLOTS } from '@/lib/constants'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { cn, timeSlotsToString } from '@/lib/utils'
import type { BookingWithStudio } from '@/types/supabase'

// 날짜 문자열 생성
function formatDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// 시간 슬롯 (9시~18시, 18시는 종료선으로만 사용)
const TIME_MARKERS = [...VALID_TIME_SLOTS, 18]

export default function LiveStatusPage() {
  // Hydration 에러 방지: 초기값을 null로 설정하고 클라이언트에서만 설정
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const [selectedDate, setSelectedDate] = useState(() => formatDateStr(new Date()))
  const [hoveredBooking, setHoveredBooking] = useState<string | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [windowWidth, setWindowWidth] = useState(0)
  const [dayBookings, setDayBookings] = useState<BookingWithStudio[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // 데이터 로드
  const loadBookings = useCallback(async (dateStr: string) => {
    setIsLoading(true)
    try {
      const data = await getBookingsByDate(dateStr)
      const filtered = data
        .filter((b) => b.status !== 'CANCELLED')
        .sort((a, b) => (a.time_slots?.[0] || 0) - (b.time_slots?.[0] || 0))
      setDayBookings(filtered)
    } catch (err) {
      console.error('Failed to load bookings:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 현재 시각 업데이트 + 윈도우 너비 추적 + 초기 데이터 로드
  useEffect(() => {
    // 클라이언트에서만 시간 설정 (Hydration 에러 방지)
    setCurrentTime(new Date())
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)

    const handleResize = () => setWindowWidth(window.innerWidth)
    handleResize() // 초기값 설정
    window.addEventListener('resize', handleResize)

    return () => {
      clearInterval(timer)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  // 날짜 변경 시 데이터 로드 + Realtime 구독
  useEffect(() => {
    loadBookings(selectedDate)

    // Supabase Realtime 구독 - 선택된 날짜의 예약 변경 감지
    const channel = supabase
      .channel(`live-bookings-${selectedDate}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `rental_date=eq.${selectedDate}`,
        },
        (payload) => {
          console.log('Live Realtime 변경 감지:', payload)
          loadBookings(selectedDate)
        }
      )
      .subscribe((status, err) => {
        console.log('Live Realtime 구독 상태:', status)
        if (err) console.error('Live Realtime 에러:', err)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedDate, loadBookings])

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
  const currentHour = currentTime?.getHours() ?? 0
  const currentMinute = currentTime?.getMinutes() ?? 0
  const isToday = selectedDate === formatDateStr(new Date())
  const currentTimePosition = isToday && currentHour >= 9 && currentHour < 18
    ? ((currentHour - 9 + currentMinute / 60) / 9) * 100
    : null

  // 호버된 예약 정보
  const hoveredBookingData = hoveredBooking
    ? dayBookings.find((b) => b.id === hoveredBooking)
    : null

  // 스튜디오 색상 (ID: 1=메인, 3=1인A, 4=1인B)
  const studioColors: Record<number, { bg: string; border: string; text: string }> = {
    1: { bg: 'from-violet-500/30 to-purple-500/30', border: 'border-violet-500/40', text: 'text-violet-400' },
    3: { bg: 'from-cyan-500/30 to-blue-500/30', border: 'border-cyan-500/40', text: 'text-cyan-400' },
    4: { bg: 'from-pink-500/30 to-rose-500/30', border: 'border-pink-500/40', text: 'text-pink-400' },
  }

  return (
    <AdminLayout>
      <div className="h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6">
          {/* Left: Title */}
          <h1 className="text-2xl lg:text-3xl font-bold text-white">실시간 현황</h1>

          {/* Center: Date Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={goToPrevDay}
              className="p-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={goToToday}
              className={cn(
                'px-4 py-2 text-lg font-semibold rounded-lg transition-colors',
                isToday
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              )}
            >
              오늘
            </button>
            <span className="px-4 py-1 text-white font-bold text-xl lg:text-2xl">
              {new Date(selectedDate).toLocaleDateString('ko-KR', {
                month: 'long',
                day: 'numeric',
                weekday: 'short',
              })}
            </span>
            <button
              onClick={goToNextDay}
              className="p-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          {/* Right: Current Time - Digital Clock Style */}
          <div className="flex items-center gap-1">
            {currentTime ? (
              <>
                <div className="flex items-center">
                  <span className="text-4xl lg:text-5xl font-black text-purple-400 tabular-nums tracking-tight">
                    {String(currentTime.getHours()).padStart(2, '0')}
                  </span>
                  <span className="text-4xl lg:text-5xl font-black text-purple-400/50 mx-1 animate-pulse">:</span>
                  <span className="text-4xl lg:text-5xl font-black text-purple-400 tabular-nums tracking-tight">
                    {String(currentTime.getMinutes()).padStart(2, '0')}
                  </span>
                  <span className="text-4xl lg:text-5xl font-black text-purple-400/50 mx-1 animate-pulse">:</span>
                  <span className="text-4xl lg:text-5xl font-black text-purple-300 tabular-nums tracking-tight">
                    {String(currentTime.getSeconds()).padStart(2, '0')}
                  </span>
                </div>
              </>
            ) : (
              <span className="text-4xl lg:text-5xl font-black text-purple-400/30 tabular-nums">--:--:--</span>
            )}
          </div>
        </div>

        {/* Timeline Card */}
        <GlassCard className="flex-1 min-h-0 flex flex-col p-0 overflow-hidden">
          <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden">
            <div className="min-w-[700px] h-full flex flex-col">
              {/* Time Markers Row */}
              <div className="flex-shrink-0 flex h-10 border-b border-white/5">
                {/* Empty space for studio labels */}
                <div className="w-28 lg:w-32 flex-shrink-0" />
                {/* Time markers - positioned at the start of each hour */}
                <div className="flex-1 relative">
                  {TIME_MARKERS.map((hour, idx) => (
                    <div
                      key={hour}
                      className="absolute top-0 bottom-0 flex items-center"
                      style={{ left: `${(idx / 9) * 96}%`, transform: 'translateX(-50%)' }}
                    >
                      <span className="text-sm text-gray-400 font-medium">{hour}시</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Studio Rows - Fill remaining space */}
              <div className="flex-1 flex flex-col min-h-0">
                {isLoading ? (
                  <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                  </div>
                ) : (
                  STUDIOS.map((studio, index) => {
                    const studioBookings = dayBookings.filter((b) => b.studio_id === studio.id)
                    const colors = studioColors[studio.id] || studioColors[1]

                    return (
                      <div
                        key={studio.id}
                        className={cn(
                          'flex-1 flex min-h-[80px]',
                          index > 0 && 'border-t border-white/5'
                        )}
                      >
                        {/* Studio Label */}
                        <div className="w-28 lg:w-32 flex-shrink-0 flex items-center justify-center px-3">
                          <span className={cn('text-lg lg:text-xl font-bold whitespace-nowrap text-center', colors.text)}>
                            {studio.name}
                          </span>
                        </div>

                        {/* Timeline Area */}
                        <div className="flex-1 relative">
                          {/* Vertical Grid Lines */}
                          {TIME_MARKERS.map((hour, idx) => (
                            <div
                              key={hour}
                              className="absolute top-0 bottom-0 w-px bg-white/5"
                              style={{ left: `${(idx / 9) * 96}%` }}
                            />
                          ))}

                          {/* Current Time Line */}
                          {currentTimePosition !== null && (
                            <div
                              className="absolute top-0 bottom-0 w-0.5 bg-red-500/30 z-0"
                              style={{ left: `${currentTimePosition * 0.96}%` }}
                            />
                          )}

                          {/* Bookings */}
                          {studioBookings.map((booking) => {
                            const slots = booking.time_slots || []
                            if (slots.length === 0) return null
                            const startHour = Math.min(...slots)
                            const endHour = Math.max(...slots) + 1
                            const startPercent = ((startHour - 9) / 9) * 100
                            const duration = endHour - startHour
                            const widthPercent = (duration / 9) * 100

                            // 현재 진행 중인지 확인
                            const isActive = isToday && slots.includes(currentHour)

                            return (
                              <div
                                key={booking.id}
                                className={cn(
                                  'absolute top-1/2 -translate-y-1/2 h-14 rounded-lg cursor-pointer transition-all z-10',
                                  isActive && 'animate-glow-pulse'
                                )}
                                style={{
                                  left: `${startPercent * 0.96}%`,
                                  width: `${widthPercent * 0.96}%`,
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
                                <div
                                  className={cn(
                                    'h-full w-full rounded-lg px-3 py-1.5 flex flex-col justify-center',
                                    'border text-white',
                                    isActive
                                      ? `bg-gradient-to-r ${colors.bg} border-white/20`
                                      : `bg-gradient-to-r ${colors.bg} border-white/10 hover:${colors.border}`
                                  )}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="truncate text-sm font-medium">{booking.applicant_name}</span>
                                    {isActive && (
                                      <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
                                    )}
                                  </div>
                                  {booking.organization && (
                                    <span className="truncate text-xs text-gray-400">{booking.organization}</span>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          {/* Summary - Fill full width at bottom */}
          <div className="flex-shrink-0 grid grid-cols-3 border-t border-white/5">
            {STUDIOS.map((studio) => {
              const studioBookings = dayBookings.filter((b) => b.studio_id === studio.id)
              const totalHours = studioBookings.reduce((sum, b) => sum + (b.time_slots?.length || 0), 0)
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
              <span className={cn('text-sm font-medium', studioColors[hoveredBookingData.studio_id]?.text)}>
                {STUDIOS.find(s => s.id === hoveredBookingData.studio_id)?.alias}
              </span>
              <span className="text-sm text-purple-400 font-medium">
                {timeSlotsToString(hoveredBookingData.time_slots || [])}
              </span>
            </div>
            <p className="text-white font-medium mb-1">{hoveredBookingData.applicant_name}</p>
            {hoveredBookingData.organization && (
              <p className="text-sm text-gray-400 mb-2">{hoveredBookingData.organization}</p>
            )}
            {hoveredBookingData.event_name && (
              <p className="text-sm text-gray-500 border-t border-white/5 pt-2 mt-2">
                {hoveredBookingData.event_name}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
              <span>{hoveredBookingData.participants_count}명</span>
              <span>•</span>
              <span>{hoveredBookingData.status === 'CONFIRMED' ? '확정' : hoveredBookingData.status === 'PENDING' ? '대기' : '취소'}</span>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
