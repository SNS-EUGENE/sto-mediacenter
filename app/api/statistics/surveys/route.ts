import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    // 1. 전체 통계 계산
    const { data: allSurveys, error: surveysError } = await supabase
      .from('satisfaction_surveys')
      .select('*')

    if (surveysError) {
      console.error('Surveys fetch error:', surveysError)
      return NextResponse.json({ error: 'Failed to fetch surveys' }, { status: 500 })
    }

    const totalSurveys = allSurveys?.length || 0
    const completedSurveys = allSurveys?.filter(s => s.submitted_at) || []
    const completedCount = completedSurveys.length

    const avgOverallRating = completedCount > 0
      ? completedSurveys.reduce((sum, s) => sum + (s.overall_rating || 0), 0) / completedCount
      : 0

    const avgReuseIntention = completedCount > 0
      ? completedSurveys.filter(s => s.reuse_intention).reduce((sum, s) => sum + s.reuse_intention, 0) /
        completedSurveys.filter(s => s.reuse_intention).length || 0
      : 0

    const npsScores = completedSurveys.filter(s => s.nps_score !== null)
    const avgNpsScore = npsScores.length > 0
      ? npsScores.reduce((sum, s) => sum + s.nps_score, 0) / npsScores.length
      : 0

    // NPS 계산: (추천자% - 비추천자%)
    const promoters = npsScores.filter(s => s.nps_score >= 9).length
    const detractors = npsScores.filter(s => s.nps_score <= 6).length
    const nps = npsScores.length > 0
      ? ((promoters / npsScores.length) - (detractors / npsScores.length)) * 100
      : 0

    // 2. 스튜디오별 통계
    const { data: byStudio } = await supabase
      .from('survey_stats_by_studio')
      .select('*')

    // 3. 월별 통계
    const { data: byMonth } = await supabase
      .from('survey_stats_by_month')
      .select('*')
      .order('month', { ascending: false })
      .limit(12)

    // 4. 항목별 평균 계산
    const categoryStats: Record<string, number> = {}
    const categoryCounts: Record<string, number> = {}

    completedSurveys.forEach(survey => {
      if (survey.category_ratings && typeof survey.category_ratings === 'object') {
        Object.entries(survey.category_ratings).forEach(([key, value]) => {
          if (typeof value === 'number') {
            categoryStats[key] = (categoryStats[key] || 0) + value
            categoryCounts[key] = (categoryCounts[key] || 0) + 1
          }
        })
      }
    })

    Object.keys(categoryStats).forEach(key => {
      categoryStats[key] = categoryStats[key] / categoryCounts[key]
    })

    // 5. 최근 코멘트
    const { data: recentComments } = await supabase
      .from('satisfaction_surveys')
      .select(`
        id,
        comment,
        improvement_request,
        overall_rating,
        submitted_at,
        booking:bookings (
          applicant_name,
          rental_date,
          studio:studios (
            name
          )
        )
      `)
      .not('submitted_at', 'is', null)
      .or('comment.neq.,improvement_request.neq.')
      .order('submitted_at', { ascending: false })
      .limit(10)

    return NextResponse.json({
      overall: {
        totalSurveys,
        completedSurveys: completedCount,
        responseRate: totalSurveys > 0 ? (completedCount / totalSurveys) * 100 : 0,
        avgOverallRating,
        avgReuseIntention,
        avgNpsScore,
        nps,
      },
      byStudio: byStudio || [],
      byMonth: byMonth || [],
      categoryStats,
      recentComments: recentComments || [],
    })
  } catch (error) {
    console.error('Statistics error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    )
  }
}
