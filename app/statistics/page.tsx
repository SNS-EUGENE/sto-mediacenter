'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import GlassCard from '@/components/ui/GlassCard'
import Select from '@/components/ui/Select'
import { getBookingsByDateRange } from '@/lib/supabase/queries'
import { supabase } from '@/lib/supabase/client'
import { STUDIOS } from '@/lib/constants'
import { Calendar, TrendingUp, Clock, Users, Target, Award, Building2, Loader2, Presentation, Film, Gift, Handshake, Download, FileSpreadsheet, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BookingWithStudio } from '@/types/supabase'

// KPI 데이터 타입
interface KPIData {
  programCount: number
  contentCount: number
  goodsAchievementRate: number
}

// KPI 목표 및 계산 (2025년 목표)
const KPI_TARGETS = {
  programOperation: { target: 60, label: '프로그램 운영 활성화', unit: '회', icon: 'Presentation', color: 'rose' },
  contentProduction: { target: 60, label: '콘텐츠 기획 제작', unit: '건', icon: 'Film', color: 'orange' },
  goodsEvent: { target: 100, label: '굿즈 및 이벤트 운영', unit: '%', icon: 'Gift', color: 'emerald' },
  studioActivation: { target: 250, label: '스튜디오 활성화', unit: '건', icon: 'Building2', color: 'violet', businessDays: 247 },
  membershipStrength: { target: 230, label: '멤버십 운영 강화', unit: '명', icon: 'Users', color: 'cyan' },
  longTermUsers: { target: 2, label: '장기 이용자 확보', unit: '곳', icon: 'Handshake', color: 'amber' },
}

// 연간 통계 계산
function getYearlyStats(bookings: BookingWithStudio[]) {
  const yearBookings = bookings.filter((b) => b.status !== 'CANCELLED')

  // 고유 예약자 수 (멤버십 근사치)
  const uniqueApplicants = new Set(yearBookings.map(b => b.applicant_name)).size

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
function getMonthlyStats(bookings: BookingWithStudio[]) {
  const monthBookings = bookings.filter((b) => b.status !== 'CANCELLED')

  const totalHours = monthBookings.reduce((sum, b) => sum + (b.time_slots?.length || 0), 0)

  // 상태별 카운트
  const statusCounts: Record<string, number> = {}
  monthBookings.forEach((b) => {
    statusCounts[b.status] = (statusCounts[b.status] || 0) + 1
  })

  // 스튜디오별 카운트
  const studioCounts: Record<number, number> = {}
  monthBookings.forEach((b) => {
    studioCounts[b.studio_id] = (studioCounts[b.studio_id] || 0) + 1
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
function getDailyBookingCounts(bookings: BookingWithStudio[]) {
  const counts: Record<string, number> = {}

  bookings
    .filter((b) => b.status !== 'CANCELLED')
    .forEach((b) => {
      counts[b.rental_date] = (counts[b.rental_date] || 0) + 1
    })

  return counts
}

// 시간대별 예약 분포
function getHourlyDistribution(bookings: BookingWithStudio[]) {
  const distribution: Record<number, number> = {}
  for (let h = 9; h <= 17; h++) {
    distribution[h] = 0
  }

  bookings
    .filter((b) => b.status !== 'CANCELLED')
    .forEach((b) => {
      (b.time_slots || []).forEach((slot) => {
        if (distribution[slot] !== undefined) {
          distribution[slot]++
        }
      })
    })

  return distribution
}

// 소속별 예약 TOP 10
function getTopOrganizations(bookings: BookingWithStudio[], limit: number = 10) {
  const counts: Record<string, number> = {}

  bookings
    .filter((b) => b.status !== 'CANCELLED' && b.organization)
    .forEach((b) => {
      const org = b.organization || '개인'
      counts[org] = (counts[org] || 0) + 1
    })

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }))
}

// 스튜디오별 가동률 계산
function calculateStudioStats(bookings: BookingWithStudio[], year: number, month: number, customDays?: number) {
  const daysInPeriod = customDays || new Date(year, month + 1, 0).getDate()
  const hoursPerDay = 9 // 9시~18시 = 9시간
  const maxHoursPerStudio = daysInPeriod * hoursPerDay

  return STUDIOS.map((studio) => {
    const studioBookings = bookings.filter(
      (b) => b.studio_id === studio.id && b.status !== 'CANCELLED'
    )
    const totalHours = studioBookings.reduce((sum, b) => sum + (b.time_slots?.length || 0), 0)
    const utilizationRate = (totalHours / maxHoursPerStudio) * 100

    return {
      studioId: studio.id,
      studioName: studio.name,
      totalBookings: studioBookings.length,
      totalHours,
      utilizationRate,
    }
  })
}

export default function StatisticsPage() {
  const today = new Date()
  const [selectedYear, setSelectedYear] = useState(today.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<number | 'all'>('all') // 'all' = 연간 전체

  // Supabase 데이터 상태
  const [yearBookings, setYearBookings] = useState<BookingWithStudio[]>([])
  const [monthBookings, setMonthBookings] = useState<BookingWithStudio[]>([])
  const [loading, setLoading] = useState(true)

  // KPI 데이터 상태
  const [kpiData, setKpiData] = useState<KPIData>({
    programCount: 0,
    contentCount: 0,
    goodsAchievementRate: 0,
  })

  // 연간 및 월간 데이터 로드
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const yearStart = `${selectedYear}-01-01`
      const yearEnd = `${selectedYear}-12-31`

      // 연간 데이터는 항상 로드
      const yearData = await getBookingsByDateRange(yearStart, yearEnd)
      setYearBookings(yearData)

      // '전체' 선택 시 연간 데이터를 월간 데이터로도 사용
      if (selectedMonth === 'all') {
        setMonthBookings(yearData)
      } else {
        const monthStart = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`
        const lastDay = new Date(selectedYear, selectedMonth + 1, 0).getDate()
        const monthEnd = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${lastDay}`
        const monthData = await getBookingsByDateRange(monthStart, monthEnd)
        setMonthBookings(monthData)
      }

      // KPI 데이터 로드 (선택된 연도의 완료된 항목만)
      const [programsRes, contentsRes, goodsRes] = await Promise.all([
        supabase.from('programs')
          .select('id, status, event_date')
          .gte('event_date', yearStart)
          .lte('event_date', yearEnd)
          .eq('status', 'COMPLETED'),
        supabase.from('contents')
          .select('id, status, production_date')
          .gte('production_date', yearStart)
          .lte('production_date', yearEnd)
          .in('status', ['COMPLETED', 'PUBLISHED']),
        supabase.from('goods_events')
          .select('id, target_count, achieved_count, status')
          .eq('status', 'COMPLETED'),
      ])

      const programCount = programsRes.data?.length || 0
      const contentCount = contentsRes.data?.length || 0

      // 굿즈 달성률 계산: 완료된 굿즈/이벤트의 평균 달성률
      let goodsAchievementRate = 0
      if (goodsRes.data && goodsRes.data.length > 0) {
        const totalRate = goodsRes.data.reduce((sum: number, item: { target_count: number; achieved_count: number }) => {
          if (item.target_count > 0) {
            return sum + (item.achieved_count / item.target_count) * 100
          }
          return sum
        }, 0)
        goodsAchievementRate = Math.round(totalRate / goodsRes.data.length)
      }

      setKpiData({ programCount, contentCount, goodsAchievementRate })
    } catch (err) {
      console.error('Failed to load statistics:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedYear, selectedMonth])

  useEffect(() => {
    loadData()
  }, [loadData])

  // 연간 KPI 통계
  const yearlyStats = useMemo(
    () => getYearlyStats(yearBookings),
    [yearBookings]
  )

  // 선택된 월의 통계
  const monthStats = useMemo(
    () => getMonthlyStats(monthBookings),
    [monthBookings]
  )

  // 일별 카운트 (히트맵용)
  const dailyCounts = useMemo(
    () => getDailyBookingCounts(monthBookings),
    [monthBookings]
  )

  // 스튜디오별 통계
  const studioStats = useMemo(() => {
    // '전체' 선택 시 연간 기준으로 계산
    const month = selectedMonth === 'all' ? 0 : selectedMonth
    const daysToUse = selectedMonth === 'all' ? 365 : new Date(selectedYear, month + 1, 0).getDate()
    return calculateStudioStats(monthBookings, selectedYear, month, daysToUse)
  }, [monthBookings, selectedYear, selectedMonth])

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

  // 달력 데이터 ('전체' 선택 시 12월 기준으로 표시)
  const displayMonth = selectedMonth === 'all' ? 11 : selectedMonth
  const daysInMonth = new Date(selectedYear, displayMonth + 1, 0).getDate()
  const firstDayOfWeek = new Date(selectedYear, displayMonth, 1).getDay()

  // 월별 예약 집계 (연간 전체용)
  const monthlyBookingCounts = useMemo(() => {
    if (selectedMonth !== 'all') return []
    const counts: { month: number; count: number }[] = []
    for (let m = 0; m < 12; m++) {
      const monthBookingsCount = yearBookings.filter(b => {
        const bookingMonth = new Date(b.rental_date).getMonth()
        return bookingMonth === m && b.status !== 'CANCELLED'
      }).length
      counts.push({ month: m, count: monthBookingsCount })
    }
    return counts
  }, [yearBookings, selectedMonth])

  // Excel 내보내기 함수
  const exportReport = async (format: 'excel' | 'pdf') => {
    const periodLabel = selectedMonth === 'all'
      ? `${selectedYear}년 전체`
      : `${selectedYear}년 ${(selectedMonth as number) + 1}월`

    // CSV 형식으로 데이터 생성
    const headers = ['구분', '항목', '값', '단위']
    const rows = [
      ['KPI', '스튜디오 활성화', yearlyStats.totalBookings.toString(), '건'],
      ['KPI', '멤버십 운영 강화', yearlyStats.uniqueApplicants.toString(), '명'],
      ['KPI', '장기 이용자 확보', yearlyStats.uniqueOrganizations.toString(), '곳'],
      ['월간통계', '총 예약', monthStats.total.toString(), '건'],
      ['월간통계', '총 이용시간', monthStats.totalHours.toString(), '시간'],
      ['월간통계', '확정 예약', (monthStats.statusCounts['CONFIRMED'] || 0).toString(), '건'],
      ...studioStats.map(stat => [
        '스튜디오별', stat.studioName, stat.totalBookings.toString(), '건'
      ]),
      ...topOrganizations.map(org => [
        'TOP 소속', org.name, org.count.toString(), '건'
      ]),
    ]

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n')
    const BOM = '\uFEFF' // UTF-8 BOM for Excel
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `종로스튜디오_통계_${periodLabel.replace(/ /g, '_')}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

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
            <Select
              value={selectedYear.toString()}
              onChange={(val) => setSelectedYear(Number(val))}
              options={yearOptions.map((year) => ({
                value: year.toString(),
                label: `${year}년`,
              }))}
            />
            <Select
              value={selectedMonth === 'all' ? 'all' : selectedMonth.toString()}
              onChange={(val) => setSelectedMonth(val === 'all' ? 'all' : Number(val))}
              options={[
                { value: 'all', label: '전체 (연간)' },
                ...monthOptions.map((month) => ({
                  value: month.toString(),
                  label: `${month + 1}월`,
                })),
              ]}
            />
            {/* 보고서 다운로드 버튼 */}
            <button
              onClick={() => exportReport('excel')}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white hover:bg-white/[0.07] hover:border-white/15 transition-all"
              title="Excel 다운로드"
            >
              <FileSpreadsheet className="w-4 h-4 text-green-400" />
              <span className="hidden sm:inline">Excel</span>
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-2">
          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
              <span className="ml-2 text-gray-400">로딩 중...</span>
            </div>
          )}

          {/* KPI Section */}
          {!loading && (
            <>
              <GlassCard className="mb-6 border-yellow-500/20">
                <div className="flex items-center gap-2 mb-6">
                  <Target className="w-5 h-5 text-yellow-400" />
                  <h2 className="text-lg font-semibold text-white">{selectedYear}년 KPI 현황</h2>
                  <span className="text-xs text-gray-500 ml-auto">247일 영업일 기준</span>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* 1. 프로그램 운영 활성화 - 60회 */}
                  {(() => {
                    const current = kpiData.programCount
                    const rate = Math.round((current / KPI_TARGETS.programOperation.target) * 100)
                    const isAchieved = rate >= 100
                    return (
                      <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-500/10 to-pink-500/10 border border-rose-500/20 relative overflow-hidden">
                        <div className="absolute top-3 right-3 text-right">
                          <span className={cn('text-2xl font-bold', isAchieved ? 'text-emerald-400' : rate >= 80 ? 'text-rose-400' : 'text-white')}>
                            {rate}%
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="p-2 rounded-lg bg-rose-500/20">
                            <Presentation className="w-4 h-4 text-rose-400" />
                          </div>
                          <span className="text-sm font-medium text-white">프로그램 운영 활성화</span>
                        </div>
                        <div className="mb-3">
                          <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-bold text-white">{current}</span>
                            <span className="text-lg text-gray-400">회</span>
                            <span className="text-sm text-gray-500 ml-1">/ {KPI_TARGETS.programOperation.target}회</span>
                          </div>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-3">
                          <div className={cn('h-full rounded-full transition-all duration-500', isAchieved ? 'bg-gradient-to-r from-emerald-500 to-green-500' : 'bg-gradient-to-r from-rose-500 to-pink-500')} style={{ width: `${Math.min(rate, 100)}%` }} />
                        </div>
                        <div className="flex items-center gap-2">
                          {isAchieved ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              <Award className="w-3 h-3" /> 목표 달성
                            </span>
                          ) : current > 0 ? (
                            <span className="text-xs text-gray-500">{KPI_TARGETS.programOperation.target - current}회 남음</span>
                          ) : (
                            <span className="text-xs text-gray-500">KPI 페이지에서 등록</span>
                          )}
                        </div>
                      </div>
                    )
                  })()}

                  {/* 2. 콘텐츠 기획 제작 - 60건 */}
                  {(() => {
                    const current = kpiData.contentCount
                    const rate = Math.round((current / KPI_TARGETS.contentProduction.target) * 100)
                    const isAchieved = rate >= 100
                    return (
                      <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-500/10 to-amber-500/10 border border-orange-500/20 relative overflow-hidden">
                        <div className="absolute top-3 right-3 text-right">
                          <span className={cn('text-2xl font-bold', isAchieved ? 'text-emerald-400' : rate >= 80 ? 'text-orange-400' : 'text-white')}>
                            {rate}%
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="p-2 rounded-lg bg-orange-500/20">
                            <Film className="w-4 h-4 text-orange-400" />
                          </div>
                          <span className="text-sm font-medium text-white">콘텐츠 기획 제작</span>
                        </div>
                        <div className="mb-3">
                          <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-bold text-white">{current}</span>
                            <span className="text-lg text-gray-400">건</span>
                            <span className="text-sm text-gray-500 ml-1">/ {KPI_TARGETS.contentProduction.target}건</span>
                          </div>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-3">
                          <div className={cn('h-full rounded-full transition-all duration-500', isAchieved ? 'bg-gradient-to-r from-emerald-500 to-green-500' : 'bg-gradient-to-r from-orange-500 to-amber-500')} style={{ width: `${Math.min(rate, 100)}%` }} />
                        </div>
                        <div className="flex items-center gap-2">
                          {isAchieved ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              <Award className="w-3 h-3" /> 목표 달성
                            </span>
                          ) : current > 0 ? (
                            <span className="text-xs text-gray-500">{KPI_TARGETS.contentProduction.target - current}건 남음</span>
                          ) : (
                            <span className="text-xs text-gray-500">KPI 페이지에서 등록</span>
                          )}
                        </div>
                      </div>
                    )
                  })()}

                  {/* 3. 굿즈 및 이벤트 운영 - 100% */}
                  {(() => {
                    const current = kpiData.goodsAchievementRate
                    const rate = current
                    const isAchieved = rate >= 100
                    return (
                      <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 relative overflow-hidden">
                        <div className="absolute top-3 right-3 text-right">
                          <span className={cn('text-2xl font-bold', isAchieved ? 'text-emerald-400' : rate >= 80 ? 'text-emerald-400' : 'text-white')}>
                            {rate}%
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="p-2 rounded-lg bg-emerald-500/20">
                            <Gift className="w-4 h-4 text-emerald-400" />
                          </div>
                          <span className="text-sm font-medium text-white">굿즈 및 이벤트 운영</span>
                        </div>
                        <div className="mb-3">
                          <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-bold text-white">{current}</span>
                            <span className="text-lg text-gray-400">%</span>
                            <span className="text-sm text-gray-500 ml-1">/ {KPI_TARGETS.goodsEvent.target}%</span>
                          </div>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-3">
                          <div className={cn('h-full rounded-full transition-all duration-500', isAchieved ? 'bg-gradient-to-r from-emerald-500 to-green-500' : 'bg-gradient-to-r from-emerald-500 to-teal-500')} style={{ width: `${Math.min(rate, 100)}%` }} />
                        </div>
                        <div className="flex items-center gap-2">
                          {isAchieved ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              <Award className="w-3 h-3" /> 목표 달성
                            </span>
                          ) : current > 0 ? (
                            <span className="text-xs text-gray-500">{KPI_TARGETS.goodsEvent.target - current}% 남음</span>
                          ) : (
                            <span className="text-xs text-gray-500">KPI 페이지에서 등록</span>
                          )}
                        </div>
                      </div>
                    )
                  })()}

                  {/* 4. 스튜디오 활성화 - 250건 (자동 집계) */}
                  {(() => {
                    const rate = Math.round((yearlyStats.totalBookings / KPI_TARGETS.studioActivation.target) * 100)
                    const isAchieved = rate >= 100
                    return (
                      <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-500/20 relative overflow-hidden">
                        <div className="absolute top-3 right-3 text-right">
                          <span className={cn('text-2xl font-bold', isAchieved ? 'text-emerald-400' : rate >= 80 ? 'text-violet-400' : 'text-white')}>
                            {rate}%
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="p-2 rounded-lg bg-violet-500/20">
                            <Building2 className="w-4 h-4 text-violet-400" />
                          </div>
                          <span className="text-sm font-medium text-white">스튜디오 활성화</span>
                        </div>
                        <div className="mb-3">
                          <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-bold text-white">{yearlyStats.totalBookings}</span>
                            <span className="text-lg text-gray-400">건</span>
                            <span className="text-sm text-gray-500 ml-1">/ {KPI_TARGETS.studioActivation.target}건</span>
                          </div>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-3">
                          <div className={cn('h-full rounded-full transition-all duration-500', isAchieved ? 'bg-gradient-to-r from-emerald-500 to-green-500' : 'bg-gradient-to-r from-violet-500 to-purple-500')} style={{ width: `${Math.min(rate, 100)}%` }} />
                        </div>
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
                              {KPI_TARGETS.studioActivation.target - yearlyStats.totalBookings}건 남음
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })()}

                  {/* 5. 멤버십 운영 강화 - 230명 (자동 집계) */}
                  {(() => {
                    const rate = Math.round((yearlyStats.uniqueApplicants / KPI_TARGETS.membershipStrength.target) * 100)
                    const isAchieved = rate >= 100
                    return (
                      <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 relative overflow-hidden">
                        <div className="absolute top-3 right-3 text-right">
                          <span className={cn('text-2xl font-bold', isAchieved ? 'text-emerald-400' : rate >= 80 ? 'text-cyan-400' : 'text-white')}>
                            {rate}%
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="p-2 rounded-lg bg-cyan-500/20">
                            <Users className="w-4 h-4 text-cyan-400" />
                          </div>
                          <span className="text-sm font-medium text-white">멤버십 운영 강화</span>
                        </div>
                        <div className="mb-3">
                          <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-bold text-white">{yearlyStats.uniqueApplicants}</span>
                            <span className="text-lg text-gray-400">명</span>
                            <span className="text-sm text-gray-500 ml-1">/ {KPI_TARGETS.membershipStrength.target}명</span>
                          </div>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-3">
                          <div className={cn('h-full rounded-full transition-all duration-500', isAchieved ? 'bg-gradient-to-r from-emerald-500 to-green-500' : 'bg-gradient-to-r from-cyan-500 to-blue-500')} style={{ width: `${Math.min(rate, 100)}%` }} />
                        </div>
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
                              {KPI_TARGETS.membershipStrength.target - yearlyStats.uniqueApplicants}명 남음
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })()}

                  {/* 6. 장기 이용자 확보 - 2곳 (자동 집계) */}
                  {(() => {
                    const rate = Math.round((yearlyStats.uniqueOrganizations / KPI_TARGETS.longTermUsers.target) * 100)
                    const isAchieved = rate >= 100
                    return (
                      <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 to-yellow-500/10 border border-amber-500/20 relative overflow-hidden">
                        <div className="absolute top-3 right-3 text-right">
                          <span className={cn('text-2xl font-bold', isAchieved ? 'text-emerald-400' : rate >= 80 ? 'text-amber-400' : 'text-white')}>
                            {rate}%
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="p-2 rounded-lg bg-amber-500/20">
                            <Handshake className="w-4 h-4 text-amber-400" />
                          </div>
                          <span className="text-sm font-medium text-white">장기 이용자 확보</span>
                        </div>
                        <div className="mb-3">
                          <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-bold text-white">{yearlyStats.uniqueOrganizations}</span>
                            <span className="text-lg text-gray-400">곳</span>
                            <span className="text-sm text-gray-500 ml-1">/ {KPI_TARGETS.longTermUsers.target}곳</span>
                          </div>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-3">
                          <div className={cn('h-full rounded-full transition-all duration-500', isAchieved ? 'bg-gradient-to-r from-emerald-500 to-green-500' : 'bg-gradient-to-r from-amber-500 to-yellow-500')} style={{ width: `${Math.min(rate, 100)}%` }} />
                        </div>
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
        {/* Heatmap Calendar or Monthly Bar Chart */}
        <GlassCard>
          {selectedMonth === 'all' ? (
            <>
              <h3 className="text-lg font-semibold text-white mb-4">월별 예약 현황</h3>
              <div className="flex items-end gap-2 h-40">
                {monthlyBookingCounts.map(({ month, count }) => {
                  const maxCount = Math.max(...monthlyBookingCounts.map(m => m.count), 1)
                  return (
                    <div key={month} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full bg-gradient-to-t from-purple-500 to-pink-500 rounded-t transition-all"
                        style={{
                          height: `${(count / maxCount) * 100}%`,
                          minHeight: count > 0 ? '4px' : '0px',
                        }}
                      />
                      <span className="text-xs text-gray-400">{month + 1}월</span>
                      <span className="text-[10px] text-gray-500">{count}건</span>
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <>
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
                  const monthNum = selectedMonth as number
                  const dateStr = `${selectedYear}-${String(monthNum + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                  const count = dailyCounts[dateStr] || 0

                  return (
                    <div
                      key={day}
                      className={cn(
                        'aspect-square rounded-md p-1.5 relative',
                        getHeatmapColor(count)
                      )}
                      title={`${dateStr}: ${count}건`}
                    >
                      <span className="text-sm text-gray-300">{day}</span>
                      {count > 0 && (
                        <div className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                          <span className="text-[10px] font-medium text-white">{count}</span>
                        </div>
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
            </>
          )}
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
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
