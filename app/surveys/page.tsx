'use client'

import { useState, useEffect, useCallback } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import GlassCard from '@/components/ui/GlassCard'
import Select from '@/components/ui/Select'
import { supabase } from '@/lib/supabase/client'
import { SURVEY_CATEGORIES, CATEGORY_LABELS, ALL_CATEGORY_KEYS } from '@/lib/survey/config'
import {
  ClipboardCheck,
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
  ExternalLink,
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

interface SurveyStats {
  totalSurveys: number
  completedSurveys: number
  responseRate: number
  avgRating: number
  categoryAverages: Record<string, number>
}

export default function SurveysPage() {
  const [loading, setLoading] = useState(true)
  const [surveys, setSurveys] = useState<SurveyResponse[]>([])
  const [stats, setStats] = useState<SurveyStats>({
    totalSurveys: 0,
    completedSurveys: 0,
    responseRate: 0,
    avgRating: 0,
    categoryAverages: {},
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
      // 설문 데이터 조회
      let query = supabase
        .from('satisfaction_surveys')
        .select(`
          id,
          submitted_at,
          overall_rating,
          category_ratings,
          comment,
          improvement_request,
          google_sheet_synced,
          booking:bookings (
            applicant_name,
            organization,
            rental_date,
            studio:studios (name)
          )
        `)
        .order('submitted_at', { ascending: false, nullsFirst: false })

      // 날짜 필터
      const startDate = selectedMonth
        ? `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`
        : `${selectedYear}-01-01`
      const endDate = selectedMonth
        ? new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0]
        : `${selectedYear}-12-31`

      query = query
        .gte('created_at', startDate)
        .lte('created_at', endDate + 'T23:59:59')

      const { data, error } = await query

      if (error) {
        console.error('Survey fetch error:', error)
        return
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const formattedSurveys = (data || []).map((s: any) => ({
        ...s,
        booking: Array.isArray(s.booking) ? s.booking[0] : s.booking,
      }))

      setSurveys(formattedSurveys)

      // 통계 계산
      const completedSurveys = formattedSurveys.filter((s: SurveyResponse) => s.submitted_at)

      // 카테고리별 평균 (새 항목 + 레거시 항목 모두)
      const categoryAverages: Record<string, number> = {}
      ALL_CATEGORY_KEYS.forEach(key => {
        const ratings = completedSurveys
          .filter((s: SurveyResponse) => s.category_ratings && s.category_ratings[key])
          .map((s: SurveyResponse) => s.category_ratings![key])
        if (ratings.length > 0) {
          categoryAverages[key] = ratings.reduce((sum, r) => sum + r, 0) / ratings.length
        }
      })

      // 전체 평균 만족도 계산 - category_ratings 값들의 전체 평균 (모든 유효한 키)
      let avgRating = 0
      if (completedSurveys.length > 0) {
        let totalSum = 0
        let totalCount = 0
        completedSurveys.forEach((s: SurveyResponse) => {
          if (s.category_ratings) {
            ALL_CATEGORY_KEYS.forEach(key => {
              if (s.category_ratings![key]) {
                totalSum += s.category_ratings![key]
                totalCount++
              }
            })
          }
        })
        avgRating = totalCount > 0 ? totalSum / totalCount : 0
      }

      setStats({
        totalSurveys: formattedSurveys.length,
        completedSurveys: completedSurveys.length,
        responseRate: formattedSurveys.length > 0 ? (completedSurveys.length / formattedSurveys.length) * 100 : 0,
        avgRating,
        categoryAverages,
      })

      // 동기화 실패 건수
      const failedCount = formattedSurveys.filter(
        (s: SurveyResponse) => s.submitted_at && !s.google_sheet_synced
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
      <div className="h-full overflow-y-auto p-4 lg:p-6 space-y-6">
        {/* 헤더 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-yellow-500/20">
              <ClipboardCheck className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-white">만족도조사</h1>
              <p className="text-sm text-gray-400">설문 응답 현황 및 통계</p>
            </div>
          </div>

          {/* 필터 */}
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
                    <p className="text-2xl font-bold text-white">{stats.totalSurveys}</p>
                    <p className="text-xs text-gray-500">총 발송</p>
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
            <div className="grid lg:grid-cols-3 gap-6">
              {/* 카테고리별 만족도 */}
              <GlassCard className="lg:col-span-2">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="w-5 h-5 text-purple-400" />
                  <h3 className="text-lg font-semibold text-white">항목별 만족도</h3>
                </div>
                <div className="space-y-4">
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
                      const percent = (avg / 5) * 100
                      const label = CATEGORY_LABELS[key] || key
                      return (
                        <div key={key}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-gray-400">{label}</span>
                            <div className="flex items-center gap-2">
                              <StarRating rating={avg} size="sm" />
                              <span className="text-sm font-medium text-white">{avg.toFixed(1)}</span>
                            </div>
                          </div>
                          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all',
                                avg >= 4 ? 'bg-green-500' : avg >= 3 ? 'bg-yellow-500' : 'bg-red-500'
                              )}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  {Object.keys(stats.categoryAverages).length === 0 && (
                    <p className="text-gray-500 text-sm text-center py-4">아직 응답 데이터가 없습니다.</p>
                  )}
                </div>
              </GlassCard>

              {/* QR 코드 안내 */}
              <GlassCard>
                <div className="flex items-center gap-2 mb-4">
                  <QrCode className="w-5 h-5 text-green-400" />
                  <h3 className="text-lg font-semibold text-white">설문 QR 코드</h3>
                </div>
                <div className="text-center py-4">
                  <div className="inline-block p-4 bg-white rounded-xl mb-4">
                    <QrCode className="w-32 h-32 text-gray-900" />
                  </div>
                  <p className="text-sm text-gray-400 mb-4">
                    아래 URL로 접속하면 오늘의 예약 목록에서<br />
                    본인 예약을 선택하여 설문에 참여할 수 있습니다.
                  </p>
                  <a
                    href="/surveys/today"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    /surveys/today
                  </a>
                </div>
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

            {/* 응답 목록 */}
            <GlassCard>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-400" />
                  <h3 className="text-lg font-semibold text-white">응답 목록</h3>
                </div>
                <span className="text-sm text-gray-500">{surveys.length}건</span>
              </div>

              {surveys.length === 0 ? (
                <div className="text-center py-12">
                  <ClipboardCheck className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">해당 기간의 설문 데이터가 없습니다.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {surveys.map((survey) => (
                    <div
                      key={survey.id}
                      className="border border-white/10 rounded-xl overflow-hidden"
                    >
                      <button
                        onClick={() => setShowDetail(showDetail === survey.id ? null : survey.id)}
                        className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={cn(
                              'w-10 h-10 rounded-full flex items-center justify-center',
                              survey.submitted_at
                                ? 'bg-green-500/20'
                                : 'bg-gray-500/20'
                            )}
                          >
                            {survey.submitted_at ? (
                              <CheckCircle className="w-5 h-5 text-green-400" />
                            ) : (
                              <Clock className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                          <div className="text-left">
                            <p className="text-white font-medium">
                              {survey.booking?.studio?.name || '알 수 없음'}
                            </p>
                            <p className="text-sm text-gray-400">
                              {survey.booking?.organization || survey.booking?.applicant_name || '-'}
                              {' · '}
                              {survey.booking?.rental_date || '-'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {survey.submitted_at && survey.category_ratings && (
                            <div className="hidden sm:flex items-center gap-2">
                              {(() => {
                                // 모든 유효한 키에서 값이 있는 것만 추출
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
                          {survey.submitted_at ? (
                            <span className="text-xs text-gray-500">
                              {new Date(survey.submitted_at).toLocaleDateString('ko-KR')}
                            </span>
                          ) : (
                            <span className="text-xs text-yellow-400">응답 대기</span>
                          )}
                          {showDetail === survey.id ? (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                      </button>

                      {/* 상세 정보 */}
                      {showDetail === survey.id && survey.submitted_at && (
                        <div className="p-4 border-t border-white/10 bg-white/5">
                          {/* 항목별 점수 - 데이터가 있는 항목만 표시 */}
                          {survey.category_ratings && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                              {Object.entries(survey.category_ratings)
                                .filter(([, value]) => value)
                                .map(([key, value]) => (
                                  <div key={key} className="p-3 rounded-lg bg-white/5">
                                    <p className="text-xs text-gray-500 mb-1">
                                      {CATEGORY_LABELS[key] || key}
                                    </p>
                                    <div className="flex items-center gap-2">
                                      <span className="text-lg font-bold text-white">{value}</span>
                                      <StarRating rating={value} size="sm" />
                                    </div>
                                  </div>
                                ))}
                            </div>
                          )}

                          {/* 코멘트 */}
                          {survey.comment && (
                            <div className="p-3 rounded-lg bg-white/5">
                              <p className="text-xs text-gray-500 mb-1">기타 의견</p>
                              <p className="text-sm text-white">{survey.comment}</p>
                            </div>
                          )}

                          {/* 동기화 상태 */}
                          <div className="mt-3 flex items-center gap-2 text-xs">
                            {survey.google_sheet_synced ? (
                              <span className="flex items-center gap-1 text-green-400">
                                <CheckCircle className="w-3 h-3" />
                                구글 시트 동기화 완료
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-yellow-400">
                                <Clock className="w-3 h-3" />
                                구글 시트 동기화 대기
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          </>
        )}
      </div>
    </AdminLayout>
  )
}
