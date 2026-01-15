'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { getBookingsByDate } from '@/lib/supabase/queries'
import { STUDIOS, VALID_TIME_SLOTS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { BookingWithStudio } from '@/types/supabase'

// 날짜 문자열 생성
function formatDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// 시간 슬롯 (9시~18시)
const TIME_MARKERS = [...VALID_TIME_SLOTS, 18]

// 스튜디오 색상
const studioColors: Record<number, { bg: string; border: string; text: string }> = {
  1: { bg: 'from-violet-500/30 to-purple-500/30', border: 'border-violet-500/40', text: 'text-violet-400' },
  3: { bg: 'from-cyan-500/30 to-blue-500/30', border: 'border-cyan-500/40', text: 'text-cyan-400' },
  4: { bg: 'from-pink-500/30 to-rose-500/30', border: 'border-pink-500/40', text: 'text-pink-400' },
}

export default function KioskPage() {
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const [dayBookings, setDayBookings] = useState<BookingWithStudio[]>([])
  const todayStr = formatDateStr(new Date())

  // 데이터 로드
  const loadBookings = useCallback(async () => {
    try {
      const data = await getBookingsByDate(todayStr)
      const filtered = data
        .filter((b) => b.status !== 'CANCELLED')
        .sort((a, b) => (a.time_slots?.[0] || 0) - (b.time_slots?.[0] || 0))
      setDayBookings(filtered)
    } catch (err) {
      console.error('Failed to load bookings:', err)
    }
  }, [todayStr])

  // 초기화 + Realtime 구독 + 폴링 폴백
  useEffect(() => {
    setCurrentTime(new Date())
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)

    // 초기 데이터 로드
    loadBookings()

    // 폴링 폴백 (1분마다) - Realtime이 작동하지 않을 경우 대비
    const pollInterval = setInterval(() => {
      loadBookings()
    }, 60000)

    // Supabase Realtime 구독 - bookings 테이블 변경 감지
    const channel = supabase
      .channel('kiosk-bookings')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE 모두
          schema: 'public',
          table: 'bookings',
          filter: `rental_date=eq.${todayStr}`,
        },
        (payload) => {
          // 변경 감지시 데이터 리로드
          console.log('Realtime 변경 감지:', payload)
          loadBookings()
        }
      )
      .subscribe((status, err) => {
        console.log('Realtime 구독 상태:', status)
        if (err) console.error('Realtime 에러:', err)
      })

    return () => {
      clearInterval(timer)
      clearInterval(pollInterval)
      supabase.removeChannel(channel)
    }
  }, [loadBookings, todayStr])

  // 현재 시각 위치 계산 (9시~18시 기준, 0~96% 범위)
  const currentHour = currentTime?.getHours() ?? 0
  const currentMinute = currentTime?.getMinutes() ?? 0
  const currentTimePosition = currentHour >= 9 && currentHour < 18
    ? ((currentHour - 9 + currentMinute / 60) / 9) * 100
    : null

  return (
    <div className="h-screen w-screen bg-[#0a0a12] text-white overflow-hidden flex flex-col">
      {/* Ambient Background - Animated Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-violet-500/40 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-500/40 blur-[120px] animate-pulse [animation-delay:1s]" />
        <div className="absolute top-[40%] right-[20%] w-[40%] h-[40%] rounded-full bg-pink-500/30 blur-[100px] animate-pulse [animation-delay:2s]" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex-shrink-0 flex items-center justify-between px-8 lg:px-12 py-6 lg:py-8">
        {/* Left: Date */}
        <span className="text-5xl lg:text-[58px] text-white font-bold">
          {currentTime?.toLocaleDateString('ko-KR', {
            month: 'long',
            day: 'numeric',
            weekday: 'short',
          }) ?? '--'}
        </span>

        {/* Right: Clock */}
        <div className="flex items-center">
          {currentTime ? (
            <div className="flex items-center">
              <span className="text-5xl lg:text-[58px] font-bold text-purple-400 tabular-nums tracking-tight">
                {String(currentTime.getHours()).padStart(2, '0')}
              </span>
              <span className="text-5xl lg:text-[58px] font-bold text-purple-400/50 mx-1 animate-pulse">:</span>
              <span className="text-5xl lg:text-[58px] font-bold text-purple-400 tabular-nums tracking-tight">
                {String(currentTime.getMinutes()).padStart(2, '0')}
              </span>
              <span className="text-5xl lg:text-[58px] font-bold text-purple-400/50 mx-1 animate-pulse">:</span>
              <span className="text-5xl lg:text-[58px] font-bold text-purple-300 tabular-nums tracking-tight">
                {String(currentTime.getSeconds()).padStart(2, '0')}
              </span>
            </div>
          ) : (
            <span className="text-5xl lg:text-[58px] font-bold text-purple-400/30 tabular-nums">--:--:--</span>
          )}
        </div>
      </header>

      {/* Timeline Card */}
      <main className="relative z-10 flex-1 min-h-0 px-8 lg:px-12 pb-8 lg:pb-12">
        <div className="h-full bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden flex flex-col">
          {/* Time Markers Row */}
          <div className="flex-shrink-0 flex h-12 lg:h-14 border-b border-white/5">
            <div className="w-44 lg:w-56 flex-shrink-0" />
            <div className="flex-1 relative">
              {TIME_MARKERS.map((hour, idx) => (
                <div
                  key={hour}
                  className="absolute top-0 bottom-0 flex items-center"
                  style={{ left: `${(idx / 9) * 96}%`, transform: 'translateX(-50%)' }}
                >
                  <span className="text-base lg:text-lg text-gray-400 font-medium">{hour}시</span>
                </div>
              ))}
            </div>
          </div>

          {/* Studio Rows */}
          <div className="flex-1 flex flex-col min-h-0">
            {STUDIOS.map((studio, index) => {
              const studioBookings = dayBookings.filter((b) => b.studio_id === studio.id)
              const colors = studioColors[studio.id] || studioColors[1]

              return (
                <div
                  key={studio.id}
                  className={cn(
                    'flex-1 flex min-h-[100px]',
                    index > 0 && 'border-t border-white/5'
                  )}
                >
                  {/* Studio Label */}
                  <div className="w-44 lg:w-56 flex-shrink-0 flex items-center justify-center px-4">
                    <span className={cn('text-2xl lg:text-3xl font-bold whitespace-nowrap text-center', colors.text)}>
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
                        className="absolute top-0 bottom-0 w-0.5 bg-red-500/50 z-0"
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
                      const isActive = slots.includes(currentHour)

                      return (
                        <div
                          key={booking.id}
                          className="absolute top-1/2 -translate-y-1/2 h-20 lg:h-24 rounded-xl cursor-pointer transition-all z-10"
                          style={{
                            left: `${startPercent * 0.96}%`,
                            width: `${widthPercent * 0.96}%`,
                          }}
                        >
                          <div
                            className={cn(
                              'h-full w-full rounded-xl px-5 py-3 flex flex-col justify-center',
                              'border border-white/10 text-white',
                              `bg-gradient-to-r ${colors.bg}`
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <span className="truncate text-lg lg:text-xl font-semibold">{booking.applicant_name}</span>
                              {isActive && (
                                <span className="px-2 py-0.5 rounded bg-red-500/80 text-white text-xs font-bold animate-pulse flex-shrink-0">
                                  ON-AIR
                                </span>
                              )}
                            </div>
                            {booking.organization && (
                              <span className="truncate text-base text-gray-400">{booking.organization}</span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}
