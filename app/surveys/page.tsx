'use client'

import { useState, useEffect, useCallback } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import GlassCard from '@/components/ui/GlassCard'
import Select from '@/components/ui/Select'
import { supabase } from '@/lib/supabase/client'
import { SURVEY_CATEGORIES, CATEGORY_LABELS, ALL_CATEGORY_KEYS } from '@/lib/survey/config'
import {
  Loader2,
  QrCode,
  RefreshCcw,
  ChevronDown,
  ChevronRight,
  Calendar,
  Users,
  TrendingUp,
  BarChart3,
  CheckCircle,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// 부분 채움 별점 컴포넌트
function PartialStar({ fill, size = 'md' }: { fill: number; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5'
  const fillPercent = Math.max(0, Math.min(100, fill * 100))

  return (
    <div className={cn('relative', sizeClass)}>
      {/* 빈 별 (배경) */}
      <svg className={cn(sizeClass, 'text-gray-600')} fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
      {/* 채워진 별 (클립) */}
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${fillPercent}%` }}>
        <svg className={cn(sizeClass, 'text-yellow-400')} fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      </div>
    </div>
  )
}

// 별점 렌더링 (부분 채움 지원)
function StarRating({ rating, size = 'md' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const fill = Math.max(0, Math.min(1, rating - (star - 1)))
        return <PartialStar key={star} fill={fill} size={size} />
      })}
    </div>
  )
}

interface SurveyResponse {
  id: string
  submitted_at: string | null
  overall_rating: number | null
  category_ratings: Record<string, number> | null
  comment: string | null
  improvement_request: string | null
  google_sheet_synced: boolean
  booking: {
    applicant_name: string
    organization: string | null
    rental_date: string
    studio: {
      name: string
    }
  }
}

// 예약 기반 목록 아이템 (미응답 포함)
interface BookingWithSurvey {
  booking_id: string
  applicant_name: string
  organization: string | null
  rental_date: string
  studio_name: string
  survey: SurveyResponse | null
}

interface SurveyStats {
  totalBookings: number      // 전체 예약 수
  completedSurveys: number   // 응답 완료 수
  responseRate: number       // 전체 예약 대비 응답률
  avgRating: number
  categoryAverages: Record<string, number>
  // 적정 비용 통계
  avgCostSmallStudio: number | null
  avgCostLargeStudio: number | null
  costResponseCount: number
}

export default function SurveysPage() {
  const [loading, setLoading] = useState(true)
  const [bookingsWithSurvey, setBookingsWithSurvey] = useState<BookingWithSurvey[]>([])
  const [stats, setStats] = useState<SurveyStats>({
    totalBookings: 0,
    completedSurveys: 0,
    responseRate: 0,
    avgRating: 0,
    categoryAverages: {},
    avgCostSmallStudio: null,
    avgCostLargeStudio: null,
    costResponseCount: 0,
  })

  // 필터
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null)
  const [showDetail, setShowDetail] = useState<string | null>(null)

  // 동기화 상태
  const [failedSyncCount, setFailedSyncCount] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null)

  // 연도 옵션
  const currentYear = new Date().getFullYear()
  const yearOptions = [
    { value: currentYear.toString(), label: `${currentYear}년` },
    { value: (currentYear - 1).toString(), label: `${currentYear - 1}년` },
  ]

  // 월 옵션
  const monthOptions = [
    { value: '', label: '전체' },
    ...Array.from({ length: 12 }, (_, i) => ({
      value: (i + 1).toString(),
      label: `${i + 1}월`,
    })),
  ]

  // 데이터 로드
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      // 날짜 필터 계산
      const startDate = selectedMonth
        ? `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`
        : `${selectedYear}-01-01`
      const endDate = selectedMonth
        ? new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0]
        : `${selectedYear}-12-31`

      // 1. 전체 예약 조회 (취소 제외)
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          applicant_name,
          organization,
          rental_date,
          studio:studios (name)
        `)
        .gte('rental_date', startDate)
        .lte('rental_date', endDate)
        .not('status', 'eq', 'CANCELLED')
        .order('rental_date', { ascending: false })

      if (bookingsError) {
        console.error('Bookings fetch error:', bookingsError)
        return
      }

      // 2. 설문 데이터 조회
      const { data: surveysData, error: surveysError } = await supabase
        .from('satisfaction_surveys')
        .select(`
          id,
          booking_id,
          submitted_at,
          overall_rating,
          category_ratings,
          comment,
          improvement_request,
          google_sheet_synced
        `)

      if (surveysError) {
        console.error('Surveys fetch error:', surveysError)
        return
      }

      // 3. 예약과 설문 조인
      const surveyMap = new Map<string, SurveyResponse>()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(surveysData || []).forEach((s: any) => {
        surveyMap.set(s.booking_id, s)
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const combined: BookingWithSurvey[] = (bookingsData || []).map((b: any) => {
        const survey = surveyMap.get(b.id)
        return {
          booking_id: b.id,
          applicant_name: b.applicant_name,
          organization: b.organization,
          rental_date: b.rental_date,
          studio_name: b.studio?.name || '알 수 없음',
          survey: survey ? {
            ...survey,
            booking: {
              applicant_name: b.applicant_name,
              organization: b.organization,
              rental_date: b.rental_date,
              studio: { name: b.studio?.name || '' }
            }
          } : null
        }
      })

      // 날짜 순서로 정렬 (빠른순)
      combined.sort((a, b) => a.rental_date.localeCompare(b.rental_date))

      setBookingsWithSurvey(combined)

      // 통계 계산 - 제출된 설문만
      const completedSurveys = combined.filter(item => item.survey?.submitted_at)

      // 카테고리별 평균 (새 항목 + 레거시 항목 모두)
      const categoryAverages: Record<string, number> = {}
      ALL_CATEGORY_KEYS.forEach(key => {
        const ratings = completedSurveys
          .filter(item => item.survey?.category_ratings && item.survey.category_ratings[key])
          .map(item => item.survey!.category_ratings![key])
        if (ratings.length > 0) {
          categoryAverages[key] = ratings.reduce((sum, r) => sum + r, 0) / ratings.length
        }
      })

      // 전체 평균 만족도 계산
      let avgRating = 0
      if (completedSurveys.length > 0) {
        let totalSum = 0
        let totalCount = 0
        completedSurveys.forEach(item => {
          if (item.survey?.category_ratings) {
            ALL_CATEGORY_KEYS.forEach(key => {
              if (item.survey!.category_ratings![key]) {
                totalSum += item.survey!.category_ratings![key]
                totalCount++
              }
            })
          }
        })
        avgRating = totalCount > 0 ? totalSum / totalCount : 0
      }

      // 응답률 = 제출된 설문 / 전체 예약
      const totalBookings = combined.length
      const responseRate = totalBookings > 0 ? (completedSurveys.length / totalBookings) * 100 : 0

      // 적정 비용 평균 계산
      const costSmallValues: number[] = []
      const costLargeValues: number[] = []

      completedSurveys.forEach(item => {
        if (item.survey?.improvement_request) {
          try {
            const additionalData = JSON.parse(item.survey.improvement_request)
            if (additionalData.cost_small_studio) {
              const value = Number(additionalData.cost_small_studio)
              if (!isNaN(value) && value > 0) costSmallValues.push(value)
            }
            if (additionalData.cost_large_studio) {
              const value = Number(additionalData.cost_large_studio)
              if (!isNaN(value) && value > 0) costLargeValues.push(value)
            }
          } catch {
            // JSON 파싱 실패 무시
          }
        }
      })

      const avgCostSmallStudio = costSmallValues.length > 0
        ? costSmallValues.reduce((sum, v) => sum + v, 0) / costSmallValues.length
        : null
      const avgCostLargeStudio = costLargeValues.length > 0
        ? costLargeValues.reduce((sum, v) => sum + v, 0) / costLargeValues.length
        : null
      const costResponseCount = Math.max(costSmallValues.length, costLargeValues.length)

      setStats({
        totalBookings,
        completedSurveys: completedSurveys.length,
        responseRate,
        avgRating,
        categoryAverages,
        avgCostSmallStudio,
        avgCostLargeStudio,
        costResponseCount,
      })

      // 동기화 실패 건수
      const failedCount = combined.filter(
        item => item.survey?.submitted_at && !item.survey.google_sheet_synced
      ).length
      setFailedSyncCount(failedCount)

    } catch (err) {
      console.error('Failed to load surveys:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedYear, selectedMonth])

  useEffect(() => {
    loadData()
  }, [loadData])

  // 동기화 재시도
  const handleRetrySync = async () => {
    setIsSyncing(true)
    setSyncResult(null)

    try {
      const response = await fetch('/api/survey/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const data = await response.json()

      if (data.success) {
        setSyncResult({ success: true, message: data.message })
        setFailedSyncCount(data.failed || 0)
        loadData()
      } else {
        setSyncResult({ success: false, message: data.error || '동기화 실패' })
      }
    } catch {
      setSyncResult({ success: false, message: '동기화 중 오류가 발생했습니다.' })
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <AdminLayout>
      <div className="h-full flex flex-col overflow-hidden">
        {/* Sticky Header */}
        <div className="flex-shrink-0 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-white">만족도조사</h1>
              <p className="text-sm text-gray-500">
                전체 예약 {stats.totalBookings}건 · 응답 {stats.completedSurveys}건
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={selectedYear.toString()}
                onChange={(v) => setSelectedYear(parseInt(v))}
                options={yearOptions}
                className="w-28"
              />
              <Select
                value={selectedMonth?.toString() || ''}
                onChange={(v) => setSelectedMonth(v ? parseInt(v) : null)}
                options={monthOptions}
                className="w-24"
              />
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
          </div>
        ) : (
          <>
            {/* 요약 카드 */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <GlassCard className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/20">
                    <Users className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.totalBookings}</p>
                    <p className="text-xs text-gray-500">전체 예약</p>
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/20">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.completedSurveys}</p>
                    <p className="text-xs text-gray-500">응답 완료</p>
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/20">
                    <TrendingUp className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.responseRate.toFixed(1)}%</p>
                    <p className="text-xs text-gray-500">응답률</p>
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-yellow-500/20">
                    <PartialStar fill={1} size="md" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-bold text-white">{stats.avgRating.toFixed(1)}</p>
                      <StarRating rating={stats.avgRating} size="sm" />
                    </div>
                    <p className="text-xs text-gray-500">평균 만족도</p>
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* 카테고리별 만족도 & QR 코드 */}
            <div className="grid lg:grid-cols-3 gap-4">
              {/* 카테고리별 만족도 */}
              <GlassCard className="lg:col-span-2">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="w-5 h-5 text-purple-400" />
                  <h3 className="text-lg font-semibold text-white">항목별 만족도</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {/* 데이터가 있는 항목만 표시 (새 항목 우선, 레거시 항목도 표시) */}
                  {Object.entries(stats.categoryAverages)
                    .filter(([, avg]) => avg > 0)
                    .sort(([a], [b]) => {
                      // 새 항목을 먼저, 레거시 항목을 나중에 정렬
                      const newKeys: string[] = SURVEY_CATEGORIES.map(c => c.key)
                      const aIsNew = newKeys.includes(a)
                      const bIsNew = newKeys.includes(b)
                      if (aIsNew && !bIsNew) return -1
                      if (!aIsNew && bIsNew) return 1
                      return 0
                    })
                    .map(([key, avg]) => {
                      const label = CATEGORY_LABELS[key] || key
                      return (
                        <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                          <span className="text-sm text-gray-400">{label}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-white">{avg.toFixed(1)}</span>
                            <StarRating rating={avg} size="sm" />
                          </div>
                        </div>
                      )
                    })}
                  {Object.keys(stats.categoryAverages).length === 0 && (
                    <p className="text-gray-500 text-sm text-center py-4 col-span-2">아직 응답 데이터가 없습니다.</p>
                  )}
                </div>

                {/* 적정 비용 통계 */}
                {(stats.avgCostSmallStudio || stats.avgCostLargeStudio) && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <p className="text-sm text-gray-500 mb-3">적정 비용 (응답 {stats.costResponseCount}건 기준)</p>
                    <div className="grid grid-cols-2 gap-4">
                      {stats.avgCostSmallStudio && (
                        <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                          <p className="text-xs text-gray-400 mb-1">1인 스튜디오 적정가</p>
                          <p className="text-lg font-bold text-purple-400">
                            {Math.round(stats.avgCostSmallStudio).toLocaleString()}원
                            <span className="text-xs text-gray-500 font-normal"> /시간</span>
                          </p>
                        </div>
                      )}
                      {stats.avgCostLargeStudio && (
                        <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                          <p className="text-xs text-gray-400 mb-1">대형 스튜디오 적정가</p>
                          <p className="text-lg font-bold text-purple-400">
                            {Math.round(stats.avgCostLargeStudio).toLocaleString()}원
                            <span className="text-xs text-gray-500 font-normal"> /시간</span>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </GlassCard>

              {/* QR 코드 안내 */}
              <GlassCard className="flex flex-col items-center justify-center">
                <div className="flex items-center gap-2 mb-3">
                  <QrCode className="w-5 h-5 text-green-400" />
                  <h3 className="text-lg font-semibold text-white">설문 QR 코드</h3>
                </div>
                <a
                  href="/surveys/today"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:opacity-80 transition-opacity"
                >
                  <img
                    src="/QR.png"
                    alt="만족도 조사 QR 코드"
                    className="w-36 h-36"
                  />
                </a>
              </GlassCard>
            </div>

            {/* 동기화 실패 알림 */}
            {failedSyncCount > 0 && (
              <GlassCard className="border-yellow-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-yellow-500/20">
                      <RefreshCcw className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">
                        구글 시트 동기화 실패 {failedSyncCount}건
                      </p>
                      <p className="text-sm text-gray-400">
                        설정에서 구글 시트 URL을 확인하고 재시도하세요.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleRetrySync}
                    disabled={isSyncing}
                    className="flex items-center gap-2 px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition-colors disabled:opacity-50"
                  >
                    {isSyncing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCcw className="w-4 h-4" />
                    )}
                    재시도
                  </button>
                </div>
                {syncResult && (
                  <div
                    className={cn(
                      'mt-3 p-3 rounded-lg text-sm',
                      syncResult.success
                        ? 'bg-green-500/10 text-green-400'
                        : 'bg-red-500/10 text-red-400'
                    )}
                  >
                    {syncResult.message}
                  </div>
                )}
              </GlassCard>
            )}

            {/* 예약 목록 (응답/미응답 포함) */}
            <GlassCard>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-400" />
                  <h3 className="text-lg font-semibold text-white">예약 목록</h3>
                </div>
                <span className="text-sm text-gray-500">
                  전체 {bookingsWithSurvey.length}건 · 응답 {stats.completedSurveys}건
                </span>
              </div>

              {bookingsWithSurvey.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">해당 기간의 예약이 없습니다.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                  {bookingsWithSurvey.map((item, index) => {
                    // 1개면 풀 너비, 홀수개면 마지막 아이템 풀 너비
                    const isLastOdd = bookingsWithSurvey.length % 2 === 1 && index === bookingsWithSurvey.length - 1
                    const isSingleItem = bookingsWithSurvey.length === 1
                    const shouldSpanFull = isSingleItem || isLastOdd
                    const survey = item.survey
                    const isSubmitted = !!survey?.submitted_at

                    return (
                    <div
                      key={item.booking_id}
                      className={cn(
                        "border rounded-xl overflow-hidden",
                        isSubmitted ? "border-white/10" : "border-gray-500/30 bg-gray-500/5",
                        shouldSpanFull && "lg:col-span-2"
                      )}
                    >
                      <button
                        onClick={() => isSubmitted && setShowDetail(showDetail === survey?.id ? null : survey?.id || null)}
                        className={cn(
                          "w-full p-4 flex items-center justify-between transition-colors",
                          isSubmitted ? "hover:bg-white/5 cursor-pointer" : "cursor-default"
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={cn(
                              'w-10 h-10 rounded-full flex items-center justify-center',
                              isSubmitted
                                ? 'bg-green-500/20'
                                : 'bg-gray-500/20'
                            )}
                          >
                            {isSubmitted ? (
                              <CheckCircle className="w-5 h-5 text-green-400" />
                            ) : (
                              <Clock className="w-5 h-5 text-gray-500" />
                            )}
                          </div>
                          <div className="text-left">
                            <p className={cn("font-medium", isSubmitted ? "text-white" : "text-gray-400")}>
                              {item.studio_name}
                            </p>
                            <p className="text-sm text-gray-400">
                              {item.organization || item.applicant_name}
                              {' · '}
                              {item.rental_date}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {isSubmitted && survey?.category_ratings && (
                            <div className="hidden sm:flex items-center gap-2">
                              {(() => {
                                const ratings = Object.values(survey.category_ratings).filter(r => r) as number[]
                                const avg = ratings.length > 0
                                  ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
                                  : 0
                                return (
                                  <>
                                    <StarRating rating={avg} size="sm" />
                                    <span className="text-sm text-white">{avg.toFixed(1)}</span>
                                  </>
                                )
                              })()}
                            </div>
                          )}
                          {isSubmitted ? (
                            <span className="text-xs text-gray-500">
                              {new Date(survey!.submitted_at!).toLocaleDateString('ko-KR')}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-xs bg-gray-500/20 text-gray-400">미응답</span>
                          )}
                          {isSubmitted && (
                            showDetail === survey?.id ? (
                              <ChevronDown className="w-5 h-5 text-gray-400" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-gray-400" />
                            )
                          )}
                        </div>
                      </button>

                      {/* 상세 정보 (응답 완료된 경우만) */}
                      {isSubmitted && showDetail === survey?.id && (
                        <div className="px-4 pb-4 border-t border-white/10 bg-white/5 space-y-3">
                          {/* 항목별 점수 */}
                          {survey?.category_ratings && (
                            <div className="flex flex-wrap gap-x-6 gap-y-1 pt-3">
                              {Object.entries(survey.category_ratings)
                                .filter(([, value]) => value)
                                .map(([key, value]) => (
                                  <div key={key} className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500">{CATEGORY_LABELS[key] || key}</span>
                                    <span className="text-sm font-semibold text-white">{value}</span>
                                    <StarRating rating={value} size="sm" />
                                  </div>
                                ))}
                            </div>
                          )}

                          {/* 추가 응답 데이터 */}
                          {(() => {
                            try {
                              const additionalData = JSON.parse(survey?.improvement_request || '{}')
                              const hasAnyData = additionalData.recommendation || additionalData.reuse_intention ||
                                additionalData.cost_small_studio || additionalData.cost_large_studio ||
                                additionalData.overall_reason || additionalData.recommendation_reason ||
                                additionalData.equipment_improvement

                              if (!hasAnyData) return null

                              return (
                                <>
                                  {/* 의향(태그) + 적정비용 한 줄 */}
                                  {(additionalData.recommendation || additionalData.reuse_intention ||
                                    additionalData.cost_small_studio || additionalData.cost_large_studio) && (
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                                      {additionalData.recommendation && (
                                        <span className="flex items-center gap-1.5 text-gray-400">
                                          추천
                                          <span className={cn(
                                            "px-1.5 py-0.5 rounded text-xs font-medium",
                                            additionalData.recommendation === 'yes'
                                              ? 'bg-green-500/20 text-green-400'
                                              : 'bg-red-500/20 text-red-400'
                                          )}>
                                            {additionalData.recommendation === 'yes' ? 'Y' : 'N'}
                                          </span>
                                        </span>
                                      )}
                                      {additionalData.reuse_intention && (
                                        <span className="flex items-center gap-1.5 text-gray-400">
                                          재이용
                                          <span className={cn(
                                            "px-1.5 py-0.5 rounded text-xs font-medium",
                                            additionalData.reuse_intention === 'yes'
                                              ? 'bg-green-500/20 text-green-400'
                                              : 'bg-red-500/20 text-red-400'
                                          )}>
                                            {additionalData.reuse_intention === 'yes' ? 'Y' : 'N'}
                                          </span>
                                        </span>
                                      )}
                                      {additionalData.cost_small_studio && (
                                        <span className="text-gray-400">
                                          1인 적정가 : <span className="text-purple-400">{Number(additionalData.cost_small_studio).toLocaleString()}원</span>
                                        </span>
                                      )}
                                      {additionalData.cost_large_studio && (
                                        <span className="text-gray-400">
                                          대형 적정가 : <span className="text-purple-400">{Number(additionalData.cost_large_studio).toLocaleString()}원</span>
                                        </span>
                                      )}
                                    </div>
                                  )}

                                  {/* 텍스트 응답들 */}
                                  {(additionalData.overall_reason || additionalData.recommendation_reason || additionalData.equipment_improvement) && (
                                    <div className="space-y-1 text-sm">
                                      {additionalData.overall_reason && (
                                        <p><span className="text-gray-500">만족도 이유 :</span> <span className="text-gray-300">{additionalData.overall_reason}</span></p>
                                      )}
                                      {additionalData.recommendation_reason && (
                                        <p><span className="text-gray-500">추천 이유 :</span> <span className="text-gray-300">{additionalData.recommendation_reason}</span></p>
                                      )}
                                      {additionalData.equipment_improvement && (
                                        <p><span className="text-gray-500">시설/장비 보완 :</span> <span className="text-gray-300">{additionalData.equipment_improvement}</span></p>
                                      )}
                                    </div>
                                  )}
                                </>
                              )
                            } catch {
                              return null
                            }
                          })()}

                          {/* 기타 의견 + 동기화 상태 */}
                          <div className="flex items-end justify-between pt-1">
                            <div className="flex-1">
                              {survey?.comment && (
                                <p className="text-sm"><span className="text-gray-500">기타 :</span> <span className="text-gray-300">{survey.comment}</span></p>
                              )}
                            </div>
                            {/* 동기화 상태 태그 - 우하단 */}
                            <span className={cn(
                              "px-2 py-1 rounded text-xs font-medium flex items-center gap-1 flex-shrink-0",
                              survey?.google_sheet_synced
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-yellow-500/20 text-yellow-400'
                            )}>
                              {survey?.google_sheet_synced ? (
                                <><CheckCircle className="w-3 h-3" /> 동기화</>
                              ) : (
                                <><Clock className="w-3 h-3" /> 대기</>
                              )}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )})}
                </div>
              )}
            </GlassCard>
          </>
        )}
        </div>
      </div>
    </AdminLayout>
  )
}
