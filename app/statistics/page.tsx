'use client'

import { useState, useMemo } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import GlassCard from '@/components/ui/GlassCard'
import { allBookings } from '@/lib/data'
import { calculateStudioStats } from '@/lib/data/bookingParser'
import { STUDIOS, BOOKING_STATUS_LABELS } from '@/lib/constants'
import { Calendar, TrendingUp, Clock, Users, BarChart3, Target, Award, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// KPI 목표 및 계산
const KPI_TARGETS = {
  studioBookings: { target: 250, label: '스튜디오 가동률', unit: '건', businessDays: 247 },
  membership: { target: 230, label: '크리에이티브 멤버십', unit: '명' },
  partnerships: { target: 2, label: '장기 이용자 확보', unit: '곳' },
}

// 연간 통계 계산
function getYearlyStats(bookings: typeof allBookings, year: number) {
  const startDate = `${year}-01-01`
  const endDate = `${year}-12-31`

  const yearBookings = bookings.filter(
    (b) => b.rentalDate >= startDate && b.rentalDate <= endDate && b.statusCode !== 'CANCELLED'
  )

  // 고유 예약자 수 (멤버십 근사치)
  const uniqueApplicants = new Set(yearBookings.map(b => b.applicantName)).size

  // 고유 기관 수 (협약 근사치)
  const organizations = yearBookings
    .filter(b => b.organization && !['개인', '프리랜서', '직장인', '학생', '무직'].includes(b.organization))
    .map(b => b.organization)
  const uniqueOrganizations = new Set(organizations).size

  return {
    totalBookings: yearBookings.length,
    uniqueApplicants,
    uniqueOrganizations,
  }
}

// 월별 통계 계산
function getMonthlyStats(bookings: typeof allBookings, year: number, month: number) {
  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const lastDay = new Date(year, month + 1, 0).getDate()
  const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}`

  const monthBookings = bookings.filter(
    (b) => b.rentalDate >= startDate && b.rentalDate <= endDate && b.statusCode !== 'CANCELLED'
  )

  const totalHours = monthBookings.reduce((sum, b) => sum + (b.endHour - b.startHour), 0)

  // 상태별 카운트
  const statusCounts: Record<string, number> = {}
  monthBookings.forEach((b) => {
    statusCounts[b.statusCode] = (statusCounts[b.statusCode] || 0) + 1
  })

  // 스튜디오별 카운트
  const studioCounts: Record<number, number> = {}
  monthBookings.forEach((b) => {
    studioCounts[b.studioId] = (studioCounts[b.studioId] || 0) + 1
  })

  return {
    total: monthBookings.length,
    totalHours,
    statusCounts,
    studioCounts,
    bookings: monthBookings,
  }
}

// 일별 예약 카운트 (히트맵용)
function getDailyBookingCounts(
  bookings: typeof allBookings,
  year: number,
  month: number
) {
  const counts: Record<string, number> = {}
  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const lastDay = new Date(year, month + 1, 0).getDate()
  const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}`

  bookings
    .filter(
      (b) =>
        b.rentalDate >= startDate &&
        b.rentalDate <= endDate &&
        b.statusCode !== 'CANCELLED'
    )
    .forEach((b) => {
      counts[b.rentalDate] = (counts[b.rentalDate] || 0) + 1
    })

  return counts
}

// 시간대별 예약 분포
function getHourlyDistribution(bookings: typeof allBookings) {
  const distribution: Record<number, number> = {}
  for (let h = 9; h <= 17; h++) {
    distribution[h] = 0
  }

  bookings
    .filter((b) => b.statusCode !== 'CANCELLED')
    .forEach((b) => {
      for (let h = b.startHour; h < b.endHour; h++) {
        if (distribution[h] !== undefined) {
          distribution[h]++
        }
      }
    })

  return distribution
}

// 소속별 예약 TOP 10
function getTopOrganizations(bookings: typeof allBookings, limit: number = 10) {
  const counts: Record<string, number> = {}

  bookings
    .filter((b) => b.statusCode !== 'CANCELLED' && b.organization)
    .forEach((b) => {
      const org = b.organization || '개인'
      counts[org] = (counts[org] || 0) + 1
    })

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }))
}

export default function StatisticsPage() {
  const today = new Date()
  const [selectedYear, setSelectedYear] = useState(today.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth())

  // 연간 KPI 통계
  const yearlyStats = useMemo(
    () => getYearlyStats(allBookings, selectedYear),
    [selectedYear]
  )

  // 전년도 통계 (비교용)
  const prevYearStats = useMemo(
    () => getYearlyStats(allBookings, selectedYear - 1),
    [selectedYear]
  )

  // 선택된 월의 통계
  const monthStats = useMemo(
    () => getMonthlyStats(allBookings, selectedYear, selectedMonth),
    [selectedYear, selectedMonth]
  )

  // 일별 카운트 (히트맵용)
  const dailyCounts = useMemo(
    () => getDailyBookingCounts(allBookings, selectedYear, selectedMonth),
    [selectedYear, selectedMonth]
  )

  // 스튜디오별 통계
  const studioStats = useMemo(() => {
    const startDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`
    const lastDay = new Date(selectedYear, selectedMonth + 1, 0).getDate()
    const endDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${lastDay}`
    return calculateStudioStats(allBookings, startDate, endDate)
  }, [selectedYear, selectedMonth])

  // 시간대별 분포
  const hourlyDist = useMemo(
    () => getHourlyDistribution(monthStats.bookings),
    [monthStats.bookings]
  )
  const maxHourlyCount = Math.max(...Object.values(hourlyDist), 1)

  // TOP 소속
  const topOrganizations = useMemo(
    () => getTopOrganizations(monthStats.bookings),
    [monthStats.bookings]
  )

  // 연도 옵션 (2024 ~ 현재년도+1)
  const yearOptions = Array.from(
    { length: today.getFullYear() - 2023 },
    (_, i) => 2024 + i
  )

  // 월 옵션
  const monthOptions = Array.from({ length: 12 }, (_, i) => i)

  // 히트맵 색상 계산
  const getHeatmapColor = (count: number) => {
    if (count === 0) return 'bg-white/5'
    if (count <= 2) return 'bg-purple-500/20'
    if (count <= 4) return 'bg-purple-500/40'
    if (count <= 6) return 'bg-purple-500/60'
    return 'bg-purple-500/80'
  }

  // 달력 데이터
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate()
  const firstDayOfWeek = new Date(selectedYear, selectedMonth, 1).getDay()

  return (
    <AdminLayout>
      <div className="h-full flex flex-col overflow-hidden">
        {/* Header - Sticky */}
        <div className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-white mb-1">통계</h1>
            <p className="text-sm text-gray-500">예약 현황 분석</p>
          </div>

          {/* Date Selector */}
          <div className="flex items-center gap-2">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500/50"
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}년
                </option>
              ))}
            </select>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500/50"
            >
              {monthOptions.map((month) => (
                <option key={month} value={month}>
                  {month + 1}월
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-2">
          {/* KPI Section */}
          <GlassCard className="mb-6 border-yellow-500/20">
        <div className="flex items-center gap-2 mb-6">
          <Target className="w-5 h-5 text-yellow-400" />
          <h2 className="text-lg font-semibold text-white">{selectedYear}년 KPI 현황</h2>
          <span className="text-xs text-gray-500 ml-auto">247일 영업일 기준 · 3개 스튜디오 합산</span>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          {/* 스튜디오 가동률 */}
          {(() => {
            const rate = Math.round((yearlyStats.totalBookings / KPI_TARGETS.studioBookings.target) * 100)
            const isAchieved = rate >= 100
            return (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-500/20 relative overflow-hidden">
                {/* 달성률 - 우상단에 크게 */}
                <div className="absolute top-3 right-3 text-right">
                  <span className={cn(
                    'text-2xl font-bold',
                    isAchieved ? 'text-emerald-400' : rate >= 80 ? 'text-violet-400' : 'text-white'
                  )}>
                    {rate}%
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 rounded-lg bg-violet-500/20">
                    <Calendar className="w-4 h-4 text-violet-400" />
                  </div>
                  <span className="text-sm font-medium text-white">스튜디오 가동률</span>
                </div>

                <div className="mb-3">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-white">{yearlyStats.totalBookings}</span>
                    <span className="text-lg text-gray-400">건</span>
                    <span className="text-sm text-gray-500 ml-1">/ {KPI_TARGETS.studioBookings.target}건</span>
                  </div>
                </div>

                <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-3">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      isAchieved ? 'bg-gradient-to-r from-emerald-500 to-green-500' : 'bg-gradient-to-r from-violet-500 to-purple-500'
                    )}
                    style={{ width: `${Math.min(rate, 100)}%` }}
                  />
                </div>

                {/* 뱃지 */}
                <div className="flex items-center gap-2">
                  {isAchieved ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      <Award className="w-3 h-3" /> 목표 달성
                    </span>
                  ) : rate >= 80 ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-violet-500/20 text-violet-400 border border-violet-500/30">
                      달성 임박
                    </span>
                  ) : (
                    <span className="text-xs text-gray-500">
                      {KPI_TARGETS.studioBookings.target - yearlyStats.totalBookings}건 남음
                    </span>
                  )}
                </div>
              </div>
            )
          })()}

          {/* 크리에이티브 멤버십 */}
          {(() => {
            const rate = Math.round((yearlyStats.uniqueApplicants / KPI_TARGETS.membership.target) * 100)
            const isAchieved = rate >= 100
            return (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 relative overflow-hidden">
                {/* 달성률 - 우상단에 크게 */}
                <div className="absolute top-3 right-3 text-right">
                  <span className={cn(
                    'text-2xl font-bold',
                    isAchieved ? 'text-emerald-400' : rate >= 80 ? 'text-cyan-400' : 'text-white'
                  )}>
                    {rate}%
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 rounded-lg bg-cyan-500/20">
                    <Award className="w-4 h-4 text-cyan-400" />
                  </div>
                  <span className="text-sm font-medium text-white">크리에이티브 멤버십</span>
                </div>

                <div className="mb-3">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-white">{yearlyStats.uniqueApplicants}</span>
                    <span className="text-lg text-gray-400">명</span>
                    <span className="text-sm text-gray-500 ml-1">/ {KPI_TARGETS.membership.target}명</span>
                  </div>
                </div>

                <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-3">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      isAchieved ? 'bg-gradient-to-r from-emerald-500 to-green-500' : 'bg-gradient-to-r from-cyan-500 to-blue-500'
                    )}
                    style={{ width: `${Math.min(rate, 100)}%` }}
                  />
                </div>

                {/* 뱃지 */}
                <div className="flex items-center gap-2">
                  {isAchieved ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      <Award className="w-3 h-3" /> 목표 달성
                    </span>
                  ) : rate >= 80 ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                      달성 임박
                    </span>
                  ) : (
                    <span className="text-xs text-gray-500">
                      {KPI_TARGETS.membership.target - yearlyStats.uniqueApplicants}명 남음
                    </span>
                  )}
                </div>
              </div>
            )
          })()}

          {/* 장기 이용자 확보 */}
          {(() => {
            const rate = Math.round((yearlyStats.uniqueOrganizations / KPI_TARGETS.partnerships.target) * 100)
            const isAchieved = rate >= 100
            return (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 relative overflow-hidden">
                {/* 달성률 - 우상단에 크게 */}
                <div className="absolute top-3 right-3 text-right">
                  <span className={cn(
                    'text-2xl font-bold',
                    isAchieved ? 'text-emerald-400' : rate >= 80 ? 'text-amber-400' : 'text-white'
                  )}>
                    {rate}%
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 rounded-lg bg-amber-500/20">
                    <Building2 className="w-4 h-4 text-amber-400" />
                  </div>
                  <span className="text-sm font-medium text-white">장기 이용자 확보</span>
                </div>

                <div className="mb-3">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-white">{yearlyStats.uniqueOrganizations}</span>
                    <span className="text-lg text-gray-400">곳</span>
                    <span className="text-sm text-gray-500 ml-1">/ {KPI_TARGETS.partnerships.target}곳</span>
                  </div>
                </div>

                <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-3">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      isAchieved ? 'bg-gradient-to-r from-emerald-500 to-green-500' : 'bg-gradient-to-r from-amber-500 to-orange-500'
                    )}
                    style={{ width: `${Math.min(rate, 100)}%` }}
                  />
                </div>

                {/* 뱃지 */}
                <div className="flex items-center gap-2">
                  {isAchieved ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      <Award className="w-3 h-3" /> 목표 달성
                    </span>
                  ) : (
                    <span className="text-xs text-gray-500">
                      교육기관·기업 협약
                    </span>
                  )}
                </div>
              </div>
            )
          })()}
        </div>
      </GlassCard>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        <GlassCard>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/20">
              <Calendar className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{monthStats.total}</p>
              <p className="text-xs text-gray-500">총 예약</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/20">
              <Clock className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{monthStats.totalHours}</p>
              <p className="text-xs text-gray-500">총 이용시간</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-green-500/20">
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {monthStats.statusCounts['CONFIRMED'] || 0}
              </p>
              <p className="text-xs text-gray-500">확정 예약</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-yellow-500/20">
              <Users className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {(monthStats.totalHours / Math.max(monthStats.total, 1)).toFixed(1)}
              </p>
              <p className="text-xs text-gray-500">평균 이용시간</p>
            </div>
          </div>
        </GlassCard>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Studio Utilization */}
        <GlassCard>
          <h3 className="text-lg font-semibold text-white mb-4">스튜디오별 가동률</h3>
          <div className="space-y-4">
            {studioStats.map((stat) => {
              const studio = STUDIOS.find((s) => s.id === stat.studioId)
              const gradientColors: Record<number, string> = {
                1: 'from-purple-500 to-purple-600',
                2: 'from-cyan-500 to-cyan-600',
                3: 'from-pink-500 to-pink-600',
              }

              return (
                <div key={stat.studioId} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">
                      {studio?.alias || stat.studioName}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500">
                        {stat.totalBookings}건 / {stat.totalHours}시간
                      </span>
                      <span className="text-sm font-semibold text-white">
                        {stat.utilizationRate.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full bg-gradient-to-r transition-all duration-500',
                        gradientColors[stat.studioId] || 'from-gray-500 to-gray-600'
                      )}
                      style={{ width: `${Math.min(stat.utilizationRate, 100)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </GlassCard>

        {/* Hourly Distribution */}
        <GlassCard>
          <h3 className="text-lg font-semibold text-white mb-4">시간대별 예약 분포</h3>
          <div className="flex items-end gap-1 h-32">
            {Object.entries(hourlyDist).map(([hour, count]) => (
              <div key={hour} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-gradient-to-t from-purple-500 to-pink-500 rounded-t transition-all"
                  style={{
                    height: `${(count / maxHourlyCount) * 100}%`,
                    minHeight: count > 0 ? '4px' : '0px',
                  }}
                />
                <span className="text-[10px] text-gray-500">{hour}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 text-center mt-2">시간 (9시 ~ 17시)</p>
        </GlassCard>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Heatmap Calendar */}
        <GlassCard>
          <h3 className="text-lg font-semibold text-white mb-4">일별 예약 현황</h3>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
              <div
                key={day}
                className={cn(
                  'text-center text-xs py-1',
                  idx === 0 ? 'text-red-400' : idx === 6 ? 'text-blue-400' : 'text-gray-500'
                )}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for first week */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}

            {/* Days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const count = dailyCounts[dateStr] || 0

              return (
                <div
                  key={day}
                  className={cn(
                    'aspect-square rounded-md flex items-center justify-center relative',
                    getHeatmapColor(count)
                  )}
                  title={`${dateStr}: ${count}건`}
                >
                  <span className="text-xs text-gray-300">{day}</span>
                  {count > 0 && (
                    <span className="absolute bottom-0.5 right-0.5 text-[8px] text-purple-300">
                      {count}
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-end gap-2 mt-4">
            <span className="text-xs text-gray-500">적음</span>
            <div className="flex gap-1">
              <div className="w-3 h-3 rounded bg-white/5" />
              <div className="w-3 h-3 rounded bg-purple-500/20" />
              <div className="w-3 h-3 rounded bg-purple-500/40" />
              <div className="w-3 h-3 rounded bg-purple-500/60" />
              <div className="w-3 h-3 rounded bg-purple-500/80" />
            </div>
            <span className="text-xs text-gray-500">많음</span>
          </div>
        </GlassCard>

        {/* Top Organizations */}
        <GlassCard>
          <h3 className="text-lg font-semibold text-white mb-4">소속별 예약 TOP 10</h3>
          {topOrganizations.length > 0 ? (
            <div className="space-y-3">
              {topOrganizations.map((org, idx) => {
                const maxCount = topOrganizations[0]?.count || 1
                const widthPercent = (org.count / maxCount) * 100

                return (
                  <div key={org.name} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium',
                            idx < 3
                              ? 'bg-purple-500/30 text-purple-300'
                              : 'bg-white/10 text-gray-400'
                          )}
                        >
                          {idx + 1}
                        </span>
                        <span className="text-sm text-white truncate max-w-[180px]">
                          {org.name}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-gray-400">
                        {org.count}건
                      </span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all"
                        style={{ width: `${widthPercent}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">데이터가 없습니다</p>
          )}
        </GlassCard>
        </div>
        </div>
      </div>
    </AdminLayout>
  )
}
