'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import { getBookingsByDate, getBookingsByDateRange, getEquipmentStats, getTodayRevenue, getYesterdayRevenue, getDashboardAlerts } from '@/lib/supabase/queries'
import { STUDIOS } from '@/lib/constants'
import { Loader2 } from 'lucide-react'
import { timeSlotsToString, getStudioName } from '@/lib/utils'
import type { BookingWithStudio } from '@/types/supabase'

export default function DashboardPage() {
  const [todayBookings, setTodayBookings] = useState<BookingWithStudio[]>([])
  const [monthBookings, setMonthBookings] = useState<BookingWithStudio[]>([])
  const [equipmentCount, setEquipmentCount] = useState(0)
  const [todayRevenue, setTodayRevenue] = useState(0)
  const [revenueChange, setRevenueChange] = useState<number | null>(null)
  const [alerts, setAlerts] = useState<{ type: 'warning' | 'info' | 'error'; title: string; description: string }[]>([])
  const [loading, setLoading] = useState(true)

  // 날짜 문자열은 한 번만 계산
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const year = today.getFullYear()
  const month = today.getMonth()
  const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const lastDay = new Date(year, month + 1, 0).getDate()
  const monthEnd = `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}`

  // 데이터 로드
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [todayData, monthData, equipStats, todayRev, yesterdayRev, alertsData] = await Promise.all([
        getBookingsByDate(todayStr),
        getBookingsByDateRange(monthStart, monthEnd),
        getEquipmentStats(),
        getTodayRevenue(),
        getYesterdayRevenue(),
        getDashboardAlerts(),
      ])
      setTodayBookings(todayData)
      setMonthBookings(monthData)
      setEquipmentCount(equipStats.equipmentCount)
      setTodayRevenue(todayRev)
      setAlerts(alertsData)

      // 전일 대비 증감률 계산
      if (yesterdayRev > 0) {
        const change = ((todayRev - yesterdayRev) / yesterdayRev) * 100
        setRevenueChange(Math.round(change))
      } else if (todayRev > 0) {
        setRevenueChange(100) // 어제 0원, 오늘 매출 있으면 +100%
      } else {
        setRevenueChange(null) // 둘 다 0원
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }, [todayStr, monthStart, monthEnd])

  useEffect(() => {
    loadData()
  }, [loadData])

  // 통계 계산
  const stats = useMemo(() => {
    const todayConfirmed = todayBookings.filter(b => b.status !== 'CANCELLED').length
    const monthConfirmed = monthBookings.filter(b => b.status === 'CONFIRMED').length
    return {
      today: { bookings: todayConfirmed },
      month: { confirmed: monthConfirmed },
    }
  }, [todayBookings, monthBookings])

  // 스튜디오별 가동률 계산
  const studioStats = useMemo(() => {
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
    const hoursPerDay = 9
    const maxHours = daysInMonth * hoursPerDay

    return STUDIOS.map((studio) => {
      const studioBookings = monthBookings.filter(
        (b) => b.studio_id === studio.id && b.status !== 'CANCELLED'
      )
      const totalHours = studioBookings.reduce((sum, b) => sum + (b.time_slots?.length || 0), 0)
      const utilizationRate = (totalHours / maxHours) * 100

      return {
        totalBookings: studioBookings.length,
        utilizationRate,
      }
    })
  }, [monthBookings, today])

  // 최근 예약 (날짜 빠른 순서 - 오늘 이후)
  const recentBookings = useMemo(() => {
    return [...monthBookings]
      .filter(b => b.status !== 'CANCELLED' && b.rental_date >= todayStr)
      .sort((a, b) => a.rental_date.localeCompare(b.rental_date))
      .slice(0, 4)
  }, [monthBookings, todayStr])

  return (
    <AdminLayout>
      <div className="h-full flex flex-col overflow-hidden">
        {/* Welcome Section - Sticky Header */}
        <div className="flex-shrink-0 mb-6">
          <h1 className="text-2xl lg:text-3xl font-bold gradient-text mb-2">안녕하세요, 관리자님</h1>
          <p className="text-white/50">오늘도 좋은 하루 되세요. 현재 시설 현황을 확인해보세요.</p>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-2">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Today's Revenue */}
            <div className="glass-card p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="icon-bg icon-bg-violet">
                  <svg className="w-6 h-6 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                {revenueChange !== null && (
                  <span className={`status-badge px-2 py-1 text-xs rounded-full flex items-center gap-1 ${
                    revenueChange >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                  }`}>
                    <svg className={`w-3 h-3 ${revenueChange < 0 ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18"/>
                    </svg>
                    {revenueChange >= 0 ? '+' : ''}{revenueChange}%
                  </span>
                )}
              </div>
              <p className="text-2xl lg:text-3xl font-bold mb-1">₩{todayRevenue.toLocaleString()}</p>
              <p className="text-sm text-white/40">오늘의 매출</p>
            </div>

            {/* Today's Bookings */}
            <div className="glass-card p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="icon-bg icon-bg-cyan">
                  <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                </div>
                <span className="status-badge px-2 py-1 bg-cyan-500/20 text-cyan-400 text-xs rounded-full">오늘</span>
              </div>
              <p className="text-2xl lg:text-3xl font-bold mb-1">{stats.today.bookings}건</p>
              <p className="text-sm text-white/40">오늘의 예약</p>
            </div>

            {/* In Progress */}
            <div className="glass-card p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="icon-bg icon-bg-amber">
                  <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <span className="status-badge px-2 py-1 bg-amber-500/20 text-amber-400 text-xs rounded-full animate-pulse">LIVE</span>
              </div>
              <p className="text-2xl lg:text-3xl font-bold mb-1">{stats.month.confirmed}건</p>
              <p className="text-sm text-white/40">확정된 예약</p>
            </div>

            {/* Equipment */}
            <div className="glass-card p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="icon-bg icon-bg-rose">
                  <svg className="w-6 h-6 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                  </svg>
                </div>
                <span className="status-badge px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">정상</span>
              </div>
              <p className="text-2xl lg:text-3xl font-bold mb-1">{equipmentCount}개</p>
              <p className="text-sm text-white/40">보유 장비</p>
            </div>
          </div>

          {/* Studio Status + Quick Actions Row */}
          <div className="grid lg:grid-cols-4 gap-4 mb-6">
            {/* Studio Cards - 3 columns */}
            <div className="lg:col-span-3 glass-card p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold">스튜디오 현황</h2>
                <a href="/calendar" className="text-xs text-violet-400 hover:text-violet-300 transition-colors">전체보기 →</a>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {/* 메인 스튜디오 */}
                <div className="p-3 rounded-xl studio-card-violet border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium">{STUDIOS[0].alias}</span>
                    <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] rounded-full">예약가능</span>
                  </div>
                  <div className="progress-soft h-1.5 mb-1.5">
                    <div className="bar h-full progress-bar-violet" style={{ width: `${studioStats[0]?.utilizationRate || 0}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-white/40">{studioStats[0]?.totalBookings || 0}건</span>
                    <span className="text-violet-400">{(studioStats[0]?.utilizationRate || 0).toFixed(0)}%</span>
                  </div>
                </div>

                {/* 1인 스튜디오 A */}
                <div className="p-3 rounded-xl studio-card-cyan border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium">{STUDIOS[1].alias}</span>
                    <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] rounded-full">예약가능</span>
                  </div>
                  <div className="progress-soft h-1.5 mb-1.5">
                    <div className="bar h-full progress-bar-cyan" style={{ width: `${studioStats[1]?.utilizationRate || 0}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-white/40">{studioStats[1]?.totalBookings || 0}건</span>
                    <span className="text-cyan-400">{(studioStats[1]?.utilizationRate || 0).toFixed(0)}%</span>
                  </div>
                </div>

                {/* 1인 스튜디오 B */}
                <div className="p-3 rounded-xl studio-card-rose border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium">{STUDIOS[2].alias}</span>
                    <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] rounded-full">예약가능</span>
                  </div>
                  <div className="progress-soft h-1.5 mb-1.5">
                    <div className="bar h-full progress-bar-rose" style={{ width: `${studioStats[2]?.utilizationRate || 0}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-white/40">{studioStats[2]?.totalBookings || 0}건</span>
                    <span className="text-rose-400">{(studioStats[2]?.utilizationRate || 0).toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions - 1 column, compact */}
            <div className="glass-card p-4">
              <h2 className="text-base font-semibold mb-3">빠른 실행</h2>
              <div className="grid grid-cols-4 gap-2">
                <a href="/bookings" className="quick-action quick-action-violet group p-2">
                  <div className="w-8 h-8 mx-auto mb-1 rounded-lg bg-violet-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                    </svg>
                  </div>
                  <span className="text-[10px]">새 예약</span>
                </a>
                <a href="/bookings" className="quick-action quick-action-cyan group p-2">
                  <div className="w-8 h-8 mx-auto mb-1 rounded-lg bg-cyan-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                    </svg>
                  </div>
                  <span className="text-[10px]">예약</span>
                </a>
                <a href="/equipments" className="quick-action quick-action-amber group p-2">
                  <div className="w-8 h-8 mx-auto mb-1 rounded-lg bg-amber-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                    </svg>
                  </div>
                  <span className="text-[10px]">장비</span>
                </a>
                <a href="/statistics" className="quick-action quick-action-rose group p-2">
                  <div className="w-8 h-8 mx-auto mb-1 rounded-lg bg-rose-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg className="w-4 h-4 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                  </div>
                  <span className="text-[10px]">통계</span>
                </a>
              </div>
            </div>
          </div>

          {/* Main Content: Today's Schedule + Notifications on top row */}
          <div className="grid lg:grid-cols-3 gap-6 mb-6">
            {/* Left - Today's Schedule */}
            <div className="lg:col-span-2 glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">오늘의 일정</h2>
                <span className="text-sm text-white/40">
                  {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
                </span>
              </div>

              <div className="space-y-3">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                  </div>
                ) : todayBookings.length > 0 ? (
                  todayBookings.slice(0, 4).map((booking, idx) => {
                    const barClass = ['schedule-bar-violet', 'schedule-bar-cyan', 'schedule-bar-amber', 'schedule-bar-rose'][idx % 4]
                    const badgeColors = [
                      'bg-violet-500/20 text-violet-300',
                      'bg-cyan-500/20 text-cyan-300',
                      'bg-amber-500/20 text-amber-300',
                      'bg-rose-500/20 text-rose-300'
                    ][idx % 4]

                    return (
                      <div key={booking.id} className="flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                        <div className={`w-1 h-12 rounded-full ${barClass}`} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{booking.event_name || '예약'}</span>
                            <span className={`px-2 py-0.5 ${badgeColors} text-xs rounded`}>{getStudioName(booking.studio_id)}</span>
                          </div>
                          <p className="text-sm text-white/40">{booking.applicant_name} | {timeSlotsToString(booking.time_slots || [])}</p>
                        </div>
                        <span className={`px-3 py-1 text-xs rounded-full ${booking.status === 'CONFIRMED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                          {booking.status === 'CONFIRMED' ? '확정' : '대기'}
                        </span>
                      </div>
                    )
                  })
                ) : (
                  <div className="text-center py-8 text-white/40">오늘 예약이 없습니다</div>
                )}
              </div>
            </div>

            {/* Right - Notifications (같은 행 높이) */}
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">알림</h2>
                {alerts.length > 0 && alerts[0].type !== 'info' && (
                  <span className="w-5 h-5 rounded-full bg-rose-500 text-xs flex items-center justify-center">{alerts.length}</span>
                )}
              </div>
              <div className="space-y-3">
                {alerts.length > 0 ? (
                  alerts.map((alert, idx) => {
                    const colorMap = { error: 'rose', warning: 'amber', info: 'cyan' } as const
                    const bgColorMap = { error: 'bg-rose-500', warning: 'bg-amber-500', info: 'bg-cyan-500' } as const
                    const color = colorMap[alert.type]
                    const bgColor = bgColorMap[alert.type]
                    return (
                      <div key={idx} className={`notification-item notification-${color}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`w-2 h-2 rounded-full ${bgColor}`} />
                          <span className="text-sm font-medium">{alert.title}</span>
                        </div>
                        <p className="text-xs text-white/40 pl-4">{alert.description}</p>
                      </div>
                    )
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
                      <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-sm text-white/60">처리할 알림이 없습니다</p>
                    <p className="text-xs text-white/30 mt-1">모든 항목이 정상입니다</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recent Bookings - Full width row */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">최근 예약</h2>
              <a href="/bookings" className="text-xs text-violet-400">더보기</a>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {recentBookings.slice(0, 4).map((booking) => (
                <div key={booking.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{booking.applicant_name}</p>
                    <p className="text-xs text-white/40">{getStudioName(booking.studio_id)}</p>
                  </div>
                  <span className="text-xs text-amber-400">{booking.rental_date}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
