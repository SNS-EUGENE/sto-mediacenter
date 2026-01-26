import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET: 오늘의 예약 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

    // 해당 날짜의 CONFIRMED 예약 조회 (survey 정보 포함)
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        id,
        applicant_name,
        organization,
        rental_date,
        time_slots,
        phone,
        studio:studios (
          id,
          name
        ),
        survey:satisfaction_surveys (
          id,
          token,
          submitted_at
        )
      `)
      .eq('rental_date', date)
      .eq('status', 'CONFIRMED')
      .order('time_slots', { ascending: true })

    if (error) {
      console.error('Bookings fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 })
    }

    // survey가 배열로 올 수 있으므로 첫 번째 요소만 사용
    const formattedBookings = bookings?.map(booking => ({
      ...booking,
      survey: Array.isArray(booking.survey) ? booking.survey[0] || null : booking.survey
    }))

    return NextResponse.json({ bookings: formattedBookings || [] })
  } catch (error) {
    console.error('Today survey API error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST: PIN 검증 및 설문 토큰 발급
export async function POST(request: NextRequest) {
  try {
    const { bookingId, pin } = await request.json()

    if (!bookingId || !pin) {
      return NextResponse.json(
        { error: '필수 정보가 누락되었습니다.' },
        { status: 400 }
      )
    }

    // 예약 정보 조회
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        id,
        phone,
        status,
        rental_date,
        survey:satisfaction_surveys (
          id,
          token,
          submitted_at
        )
      `)
      .eq('id', bookingId)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: '예약을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 예약 상태 확인
    if (booking.status !== 'CONFIRMED') {
      return NextResponse.json(
        { error: '확정된 예약만 설문에 참여할 수 있습니다.' },
        { status: 400 }
      )
    }

    // PIN 검증 (전화번호 뒷 4자리)
    const phoneLast4 = booking.phone.replace(/\D/g, '').slice(-4)
    if (pin !== phoneLast4) {
      return NextResponse.json(
        { error: 'PIN이 일치하지 않습니다.' },
        { status: 401 }
      )
    }

    // 기존 survey 확인
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingSurvey = Array.isArray(booking.survey)
      ? booking.survey[0]
      : booking.survey

    // 이미 제출된 설문인지 확인
    if (existingSurvey?.submitted_at) {
      return NextResponse.json(
        { error: '이미 설문이 완료되었습니다.' },
        { status: 400 }
      )
    }

    // 기존 토큰이 있으면 반환
    if (existingSurvey?.token) {
      return NextResponse.json({ token: existingSurvey.token })
    }

    // 새 설문 레코드 생성
    const newToken = uuidv4()
    const { error: insertError } = await supabase
      .from('satisfaction_surveys')
      .insert({
        booking_id: bookingId,
        token: newToken,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7일 후 만료
      })

    if (insertError) {
      console.error('Survey creation error:', insertError)
      return NextResponse.json(
        { error: '설문 생성에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ token: newToken })
  } catch (error) {
    console.error('PIN verification error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
