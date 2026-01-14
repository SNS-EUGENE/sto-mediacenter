'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { getBookingsByDate } from '@/lib/supabase/queries'
import { STUDIOS, VALID_TIME_SLOTS } from '@/lib/constants'
import { cn, timeSlotsToString } from '@/lib/utils'
import type { BookingWithStudio } from '@/types/supabase'

// 날짜 문자열 생성
function formatDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// 시간 슬롯 (9시~18시)
const TIME_MARKERS = [...VALID_TIME_SLOTS, 18]

// 스튜디오 색상 (ID 1, 3, 4 기준)
const studioColors: Record<number, { bg: string; border: string; text: string; gradient: string }> = {
  1: {
    bg: 'from-violet-500/40 to-purple-500/40',
    border: 'border-violet-500/50',
    text: 'text-violet-300',
    gradient: 'from-violet-600 to-purple-600'
  },
  3: {
    bg: 'from-cyan-500/40 to-blue-500/40',
    border: 'border-cyan-500/50',
    text: 'text-cyan-300',
    gradient: 'from-cyan-600 to-blue-600'
  },
  4: {
    bg: 'from-pink-500/40 to-rose-500/40',
    border: 'border-pink-500/50',
    text: 'text-pink-300',
    gradient: 'from-pink-600 to-rose-600'
  },
}

export default function KioskPage() {
  const [currentTime, setCurrentTime] = useState(new Date())
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

  // 1분마다 데이터 새로고침, 매초 시간 업데이트
  useEffect(() => {
    loadBookings() // 초기 로드

    const secondTimer = setInterval(() => setCurrentTime(new Date()), 1000)

    // 1분마다 데이터 갱신
    const refreshTimer = setInterval(() => {
      loadBookings()
    }, 60000)

    return () => {
      clearInterval(secondTimer)
      clearInterval(refreshTimer)
    }
  }, [loadBookings])

  // 현재 시각 위치 계산 (9시~18시 기준)
  const currentHour = currentTime.getHours()
  const currentMinute = currentTime.getMinutes()
  const currentTimePosition = currentHour >= 9 && currentHour < 18
    ? ((currentHour - 9 + currentMinute / 60) / 9) * 100
    : null

  // 통계
  const stats = useMemo(() => {
    const totalBookings = dayBookings.length
    const totalHours = dayBookings.reduce((sum, b) => sum + (b.time_slots?.length || 0), 0)
    const activeBookings = dayBookings.filter(b => {
      const slots = b.time_slots || []
      return slots.some(slot => slot === currentHour)
    }).length

    return { totalBookings, totalHours, activeBookings }
  }, [dayBookings, currentHour])

  return (
    <div className="h-screen w-screen bg-[#0a0a12] text-white overflow-hidden flex flex-col">
      {/* Ambient Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-violet-500/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="absolute top-[40%] right-[20%] w-[40%] h-[40%] rounded-full bg-pink-500/5 blur-[100px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex-shrink-0 px-8 py-6 flex items-center justify-between border-b border-white/5">
        {/* Left: Logo & Title */}
        <div className="flex items-center gap-6">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">종로 스튜디오</h1>
            <p className="text-lg text-white/40">오늘의 예약 현황</p>
          </div>
        </div>

        {/* Center: Date */}
        <div className="text-center">
          <p className="text-4xl font-bold text-white">
            {currentTime.toLocaleDateString('ko-KR', {
              month: 'long',
              day: 'numeric',
              weekday: 'long',
            })}
          </p>
        </div>

        {/* Right: Time */}
        <div className="text-right">
          <p className="text-5xl font-bold text-purple-400 tabular-nums tracking-wide">
            {currentTime.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
          <div className="flex items-center justify-end gap-4 mt-2 text-lg text-gray-400">
            <span>오늘 예약 <span className="text-white font-bold">{stats.totalBookings}</span>건</span>
            <span className="text-white/20">|</span>
            <span>총 <span className="text-white font-bold">{stats.totalHours}</span>시간</span>
            {stats.activeBookings > 0 && (
              <>
                <span className="text-white/20">|</span>
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-green-400 font-bold">{stats.activeBookings}</span>
                  <span>진행중</span>
                </span>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Timeline */}
      <main className="relative z-10 flex-1 flex flex-col min-h-0 px-8 py-6">
        <div className="flex-1 flex flex-col bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
          {/* Time Header */}
          <div className="flex-shrink-0 flex h-14 border-b border-white/10">
            <div className="w-48 flex-shrink-0" />
            <div className="flex-1 relative">
              {TIME_MARKERS.map((hour, idx) => (
                <div
                  key={hour}
                  className="absolute top-0 bottom-0 flex items-center"
                  style={{ left: `${(idx / 9) * 100}%`, transform: 'translateX(-50%)' }}
                >
                  <span className="text-xl font-bold text-gray-500">{hour}:00</span>
                </div>
              ))}
            </div>
          </div>

          {/* Studio Rows */}
          <div className="flex-1 flex flex-col min-h-0">
            {STUDIOS.map((studio) => {
              const studioBookings = dayBookings.filter((b) => b.studio_id === studio.id)
              const colors = studioColors[studio.id] || studioColors[1]
              const totalHours = studioBookings.reduce((sum, b) => sum + (b.time_slots?.length || 0), 0)
              const utilizationPercent = Math.round((totalHours / 9) * 100)

              return (
                <div
                  key={studio.id}
                  className="flex-1 flex border-t border-white/5 first:border-t-0 min-h-[120px]"
                >
                  {/* Studio Label */}
                  <div className="w-48 flex-shrink-0 flex flex-col items-center justify-center px-4 border-r border-white/5 bg-gradient-to-r from-white/[0.02] to-transparent">
                    <span className={cn('text-2xl font-bold', colors.text)}>
                      {studio.name}
                    </span>
                    <div className="mt-2 flex items-center gap-3 text-sm">
                      <span className="text-gray-500">{studioBookings.length}건</span>
                      <span className="text-gray-600">•</span>
                      <span className="text-gray-500">{utilizationPercent}%</span>
                    </div>
                  </div>

                  {/* Timeline Area */}
                  <div className="flex-1 relative">
                    {/* Vertical Grid Lines */}
                    {TIME_MARKERS.map((hour, idx) => (
                      <div
                        key={hour}
                        className="absolute top-0 bottom-0 w-px bg-white/5"
                        style={{ left: `${(idx / 9) * 100}%` }}
                      />
                    ))}

                    {/* Current Time Line */}
                    {currentTimePosition !== null && (
                      <div
                        className="absolute top-0 bottom-0 w-1 bg-red-500 z-20 shadow-lg shadow-red-500/50"
                        style={{ left: `${currentTimePosition}%` }}
                      >
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-4 h-4 bg-red-500 rounded-full" />
                      </div>
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
                          className={cn(
                            'absolute top-3 bottom-3 rounded-xl px-4 py-3 flex flex-col justify-center z-10 overflow-hidden',
                            'border-2 transition-all duration-300',
                            isActive
                              ? `bg-gradient-to-r ${colors.bg} ${colors.border} shadow-xl`
                              : `bg-gradient-to-r ${colors.bg} border-white/10`
                          )}
                          style={{
                            left: `calc(${startPercent}% + 4px)`,
                            width: `calc(${widthPercent}% - 8px)`,
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xl font-bold text-white truncate">
                              {booking.applicant_name}
                            </span>
                            {isActive && (
                              <span className="w-3 h-3 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
                            )}
                          </div>
                          {booking.organization && (
                            <span className="text-base text-white/60 truncate">
                              {booking.organization}
                            </span>
                          )}
                          <span className="text-sm text-white/40 mt-1">
                            {timeSlotsToString(slots)} · {booking.participants_count}명
                          </span>
                        </div>
                      )
                    })}

                    {/* Empty State */}
                    {studioBookings.length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <p className="text-gray-600 text-xl">예약 없음</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 flex-shrink-0 px-8 py-4 border-t border-white/5 bg-white/[0.02]">
        <div className="flex items-center justify-between">
          <p className="text-gray-500">종로 서울관광플라자 미디어센터</p>
          <p className="text-gray-600 text-sm">자동 갱신 (1분마다)</p>
        </div>
      </footer>
    </div>
  )
}
