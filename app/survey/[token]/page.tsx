'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import {
  SATISFACTION_LEVELS,
  SURVEY_CATEGORIES,
  CONDITIONAL_QUESTIONS,
  RECOMMENDATION_OPTIONS,
  REUSE_OPTIONS,
} from '@/lib/survey/config'

interface SurveyData {
  id: string
  booking_id: string
  submitted_at: string | null
  expires_at: string
  booking: {
    applicant_name: string
    organization: string | null
    rental_date: string
    purpose: string | null
    studio: {
      name: string
    }
  }
}

interface SurveyFormData {
  category_ratings: Record<string, number>
  // 조건부 질문 답변
  overall_reason: string
  equipment_improvement: string
  cost_small_studio: string
  cost_large_studio: string
  // 추천 의향
  recommendation: string
  recommendation_reason: string
  // 재이용 의향
  reuse_intention: string
  // 기타 의견
  comment: string
}

export default function SurveyPage() {
  const params = useParams()
  const token = params.token as string

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [survey, setSurvey] = useState<SurveyData | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const [formData, setFormData] = useState<SurveyFormData>({
    category_ratings: {},
    overall_reason: '',
    equipment_improvement: '',
    cost_small_studio: '',
    cost_large_studio: '',
    recommendation: '',
    recommendation_reason: '',
    reuse_intention: '',
    comment: '',
  })

  useEffect(() => {
    fetchSurvey()
  }, [token])

  const fetchSurvey = async () => {
    try {
      const res = await fetch(`/api/survey/${token}`)
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '조사를 불러올 수 없습니다.')
        return
      }

      setSurvey(data.survey)

      if (data.survey.submitted_at) {
        setSubmitted(true)
      }
    } catch {
      setError('서버 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 필수 항목 검증 - 만족도 질문
    const unanswered = SURVEY_CATEGORIES.filter(
      (cat) => !formData.category_ratings[cat.key]
    )
    if (unanswered.length > 0) {
      setError('모든 만족도 항목을 선택해주세요.')
      return
    }

    // 전반적 만족도 이유는 항상 필수
    if (!formData.overall_reason.trim()) {
      setError('전반적인 만족도를 선택한 이유를 작성해주세요.')
      return
    }

    // 추천 의향 필수
    if (!formData.recommendation) {
      setError('추천 의향을 선택해주세요.')
      return
    }

    // 추천 의향 이유 필수
    if (!formData.recommendation_reason.trim()) {
      setError('추천 의향에 대한 이유를 작성해주세요.')
      return
    }

    // 재이용 의향 필수
    if (!formData.reuse_intention) {
      setError('재이용 의향을 선택해주세요.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      // 전체 만족도는 category_ratings의 overall 값 사용
      const submitData = {
        overall_rating: formData.category_ratings['overall'] || 0,
        category_ratings: formData.category_ratings,
        comment: formData.comment,
        // 추가 데이터를 improvement_request 필드에 JSON으로 저장
        improvement_request: JSON.stringify({
          // 조건부 질문 답변
          overall_reason: formData.overall_reason,
          equipment_improvement: formData.equipment_improvement,
          cost_small_studio: formData.cost_small_studio,
          cost_large_studio: formData.cost_large_studio,
          // 추천/재이용 의향
          recommendation: formData.recommendation,
          recommendation_reason: formData.recommendation_reason,
          reuse_intention: formData.reuse_intention,
        }),
        // 재이용 의향 (yes=5, no=1로 매핑)
        reuse_intention: formData.reuse_intention === 'yes' ? 5 : 1,
        // NPS 점수 (추천 의향 yes=10, no=0으로 매핑)
        nps_score: formData.recommendation === 'yes' ? 10 : 0,
      }

      const res = await fetch(`/api/survey/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '제출 중 오류가 발생했습니다.')
        return
      }

      setSubmitted(true)
    } catch {
      setError('서버 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const setRating = (key: string, value: number) => {
    setFormData((prev) => ({
      ...prev,
      category_ratings: { ...prev.category_ratings, [key]: value },
    }))
  }

  // 조건부 질문 표시 여부 확인
  const shouldShowConditional = (categoryKey: string) => {
    const rating = formData.category_ratings[categoryKey]
    if (!rating) return false
    const config = CONDITIONAL_QUESTIONS[categoryKey as keyof typeof CONDITIONAL_QUESTIONS]
    if (!config) return false
    return config.condition(rating)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    )
  }

  if (error && !survey) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">접근 불가</h1>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-8 max-w-md w-full text-center">
          <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">감사합니다!</h1>
          <p className="text-gray-400 mb-6">
            소중한 의견이 접수되었습니다.
            <br />
            더 나은 서비스를 위해 노력하겠습니다.
          </p>
          <p className="text-sm text-gray-500">
            서울관광플라자 온라인미디어센터 스튜디오를 이용해 주셔서 감사합니다.
          </p>
        </div>
      </div>
    )
  }

  let questionNumber = 0

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">
            26년 온라인미디어센터 스튜디오 이용 만족도 조사
          </h1>
          <p className="text-gray-400 text-sm">
            본 조사는 서울관광플라자 온라인미디어센터 스튜디오 운영 개선 및 서비스 품질 향상을 위한 자료로 활용됩니다.
            <br />
            응답 내용은 통계 목적 외에는 사용되지 않습니다. 감사합니다.
          </p>
        </div>

        {/* 기본 정보 */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-xs text-purple-400">i</span>
            기본 정보
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">방문 일자</span>
              <p className="text-white font-medium">{survey?.booking.rental_date}</p>
            </div>
            <div>
              <span className="text-gray-500">업체명 / 이용자</span>
              <p className="text-white font-medium">
                {survey?.booking.organization || survey?.booking.applicant_name}
              </p>
            </div>
            <div className="col-span-2">
              <span className="text-gray-500">이용 스튜디오</span>
              <p className="text-white font-medium">{survey?.booking.studio.name}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Q2~Q5: 항목별 만족도 + 조건부 질문 */}
          {SURVEY_CATEGORIES.map((cat) => {
            questionNumber++
            const conditionalConfig = CONDITIONAL_QUESTIONS[cat.key as keyof typeof CONDITIONAL_QUESTIONS]

            return (
              <div
                key={cat.key}
                className="bg-white/5 border border-white/10 rounded-xl p-6"
              >
                <h2 className="text-white font-medium mb-4">
                  {questionNumber}. {cat.label} <span className="text-red-400">*</span>
                </h2>
                <div className="flex flex-wrap gap-2">
                  {SATISFACTION_LEVELS.map((level) => (
                    <button
                      key={level.value}
                      type="button"
                      onClick={() => setRating(cat.key, level.value)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                        formData.category_ratings[cat.key] === level.value
                          ? level.value >= 4
                            ? 'bg-green-500 text-white'
                            : level.value === 3
                            ? 'bg-yellow-500 text-black'
                            : 'bg-red-500 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {level.label}
                    </button>
                  ))}
                </div>

                {/* 조건부 질문 */}
                {conditionalConfig && shouldShowConditional(cat.key) && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    {'question' in conditionalConfig && (
                      <>
                        <p className="text-gray-300 text-sm mb-2">
                          {questionNumber}-A. {conditionalConfig.question}
                        </p>
                        {'placeholder' in conditionalConfig && (
                          <textarea
                            value={
                              cat.key === 'overall'
                                ? formData.overall_reason
                                : cat.key === 'equipment'
                                ? formData.equipment_improvement
                                : ''
                            }
                            onChange={(e) => {
                              const key = cat.key === 'overall' ? 'overall_reason' : 'equipment_improvement'
                              setFormData((prev) => ({ ...prev, [key]: e.target.value }))
                            }}
                            placeholder={conditionalConfig.placeholder}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                            rows={2}
                          />
                        )}
                      </>
                    )}
                    {'subQuestions' in conditionalConfig && (
                      <>
                        <p className="text-gray-300 text-sm mb-3">
                          {questionNumber}-A. {conditionalConfig.question}
                        </p>
                        <div className="space-y-3">
                          {conditionalConfig.subQuestions.map((sub) => (
                            <div key={sub.key}>
                              <label className="text-gray-400 text-xs mb-1 block">
                                {sub.label}
                              </label>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500 text-sm">시간당</span>
                                <input
                                  type="number"
                                  value={
                                    sub.key === 'cost_small_studio'
                                      ? formData.cost_small_studio
                                      : formData.cost_large_studio
                                  }
                                  onChange={(e) => {
                                    const key = sub.key === 'cost_small_studio' ? 'cost_small_studio' : 'cost_large_studio'
                                    setFormData((prev) => ({ ...prev, [key]: e.target.value }))
                                  }}
                                  placeholder={sub.placeholder}
                                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg p-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                                <span className="text-gray-500 text-sm">원</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {/* Q6: 추천 의향 */}
          {(() => {
            questionNumber++
            return (
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h2 className="text-white font-medium mb-4">
                  {questionNumber}. 서울관광플라자 스튜디오를 지인에게 추천할 의향이 있으십니까?{' '}
                  <span className="text-red-400">*</span>
                </h2>
                <div className="flex flex-wrap gap-2 mb-4">
                  {RECOMMENDATION_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          recommendation: option.value,
                        }))
                      }
                      className={`px-6 py-2 rounded-lg text-sm font-medium transition ${
                        formData.recommendation === option.value
                          ? option.value === 'yes'
                            ? 'bg-green-500 text-white'
                            : 'bg-red-500 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                {formData.recommendation && (
                  <div className="pt-4 border-t border-white/10">
                    <p className="text-gray-300 text-sm mb-2">
                      {questionNumber}-A. {formData.recommendation === 'yes' ? '있다' : '없다'}를 선택한 이유를 작성해주세요.{' '}
                      <span className="text-red-400">*</span>
                    </p>
                    <textarea
                      value={formData.recommendation_reason}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          recommendation_reason: e.target.value,
                        }))
                      }
                      placeholder="이유를 작성해주세요"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                      rows={2}
                    />
                  </div>
                )}
              </div>
            )
          })()}

          {/* Q7: 재이용 의향 */}
          {(() => {
            questionNumber++
            return (
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h2 className="text-white font-medium mb-4">
                  {questionNumber}. 다음에도 서울관광플라자 스튜디오를 이용할 의향이 있으십니까?{' '}
                  <span className="text-red-400">*</span>
                </h2>
                <div className="flex flex-wrap gap-2">
                  {REUSE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          reuse_intention: option.value,
                        }))
                      }
                      className={`px-6 py-2 rounded-lg text-sm font-medium transition ${
                        formData.reuse_intention === option.value
                          ? option.value === 'yes'
                            ? 'bg-green-500 text-white'
                            : 'bg-red-500 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Q8: 기타 의견 */}
          {(() => {
            questionNumber++
            return (
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h2 className="text-white font-medium mb-4">
                  {questionNumber}. 기타 바라는 점이나 개선이 필요한 사항이 있다면 자유롭게 작성해주세요.
                </h2>
                <textarea
                  value={formData.comment}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, comment: e.target.value }))
                  }
                  placeholder="개선사항, 건의사항 등 자유롭게 작성해주세요."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                  rows={4}
                />
              </div>
            )
          })()}

          {/* 에러 메시지 */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <span className="text-red-400">{error}</span>
            </div>
          )}

          {/* 제출 버튼 */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                제출 중...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                제출하기
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
