'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Building2,
  User,
  Loader2,
  ClipboardCheck,
  Lock,
} from 'lucide-react'

interface TodayBooking {
  id: string
  applicant_name: string
  organization: string | null
  rental_date: string
  time_slots: number[]
  phone: string
  studio: {
    id: number
    name: string
  }
  survey: {
    id: string
    token: string
    submitted_at: string | null
  } | null
}

export default function TodaySurveyPage() {
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  )
  const [bookings, setBookings] = useState<TodayBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBooking, setSelectedBooking] = useState<TodayBooking | null>(null)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [verifying, setVerifying] = useState(false)

  useEffect(() => {
    fetchBookings()
  }, [selectedDate])

  const fetchBookings = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/survey/today?date=${selectedDate}`)
      const data = await res.json()
      // 완료된 설문 제외
      const pendingBookings = (data.bookings || []).filter(
        (b: TodayBooking) => !b.survey?.submitted_at
      )
      setBookings(pendingBookings)
    } catch (error) {
      console.error('Failed to fetch bookings:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatTimeSlots = (slots: number[]) => {
    if (!slots || slots.length === 0) return '-'
    const start = slots[0]
    const end = slots[slots.length - 1] + 1
    return `${String(start).padStart(2, '0')}:00 ~ ${String(end).padStart(2, '0')}:00`
  }

  const changeDate = (days: number) => {
    const date = new Date(selectedDate)
    date.setDate(date.getDate() + days)
    setSelectedDate(date.toISOString().split('T')[0])
  }

  const handleCardClick = (booking: TodayBooking) => {
    setSelectedBooking(booking)
    setPin('')
    setPinError('')
  }

  const verifyPin = async () => {
    if (!selectedBooking) return

    if (pin.length !== 4) {
      setPinError('4자리 숫자를 입력해주세요.')
      return
    }

    setVerifying(true)
    setPinError('')

    try {
      // 서버에서 PIN 검증 및 토큰 발급
      const res = await fetch('/api/survey/today', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: selectedBooking.id,
          pin: pin,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setPinError(data.error || '인증에 실패했습니다.')
        return
      }

      if (data.token) {
        router.push(`/survey/${data.token}`)
      } else {
        setPinError('설문 토큰을 받지 못했습니다.')
      }
    } catch {
      setPinError('인증 중 오류가 발생했습니다.')
    } finally {
      setVerifying(false)
    }
  }

  const isToday = selectedDate === new Date().toISOString().split('T')[0]

  // 예약 시작 시간이 지났는지 확인 (한국 시간 기준)
  const isBookingStarted = (booking: TodayBooking) => {
    if (!booking.time_slots || booking.time_slots.length === 0) return true
    const startHour = Math.min(...booking.time_slots)
    // 한국 시간대(KST, UTC+9) 명시
    const bookingStartTime = new Date(`${booking.rental_date}T${String(startHour).padStart(2, '0')}:00:00+09:00`)
    return new Date() >= bookingStartTime
  }

  // 예약 시작 시간 포맷
  const getStartTimeStr = (booking: TodayBooking) => {
    if (!booking.time_slots || booking.time_slots.length === 0) return ''
    const startHour = Math.min(...booking.time_slots)
    return `${String(startHour).padStart(2, '0')}:00`
  }

  // 카드 클릭 핸들러 (시간 체크 포함)
  const handleCardClickWithTimeCheck = (booking: TodayBooking) => {
    if (!isBookingStarted(booking)) {
      // 시작 전이면 에러 표시
      setPinError(`설문은 ${getStartTimeStr(booking)} 이후부터 참여 가능합니다.`)
      setSelectedBooking(booking)
      return
    }
    handleCardClick(booking)
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4 relative overflow-hidden">
      {/* Ambient Background Glow */}
      <div className="ambient-bg with-transition">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
      </div>

      <div className="max-w-2xl mx-auto relative z-10">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/20 rounded-full mb-4">
            <ClipboardCheck className="w-5 h-5 text-purple-400" />
            <span className="text-purple-400 font-medium">만족도 조사</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            종로 미디어센터 스튜디오
          </h1>
          <p className="text-gray-400">
            이용해 주셔서 감사합니다. 아래에서 본인의 예약을 선택해주세요.
          </p>
        </div>

        {/* 날짜 선택 */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <button
            onClick={() => changeDate(-1)}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition"
          >
            <ChevronLeft className="w-5 h-5 text-gray-400" />
          </button>

          <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-lg">
            <Calendar className="w-5 h-5 text-purple-400" />
            <span className="text-white font-medium">
              {new Date(selectedDate).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'short',
              })}
            </span>
            {isToday && (
              <span className="px-2 py-0.5 bg-purple-500 text-white text-xs rounded-full">
                오늘
              </span>
            )}
          </div>

          <button
            onClick={() => changeDate(1)}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition"
          >
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* 예약 목록 */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-12">
            <ClipboardCheck className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">
              {isToday
                ? '오늘 설문 대기 중인 예약이 없습니다.'
                : '해당 날짜에 설문 대기 중인 예약이 없습니다.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => {
              const started = isBookingStarted(booking)
              return (
                <button
                  key={booking.id}
                  onClick={() => handleCardClickWithTimeCheck(booking)}
                  className={`w-full p-6 border rounded-xl transition text-left ${
                    started
                      ? 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-purple-500/50'
                      : 'bg-amber-500/5 border-amber-500/20 hover:bg-amber-500/10'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${started ? 'bg-purple-500/20' : 'bg-amber-500/20'}`}>
                        {started ? (
                          <Building2 className="w-5 h-5 text-purple-400" />
                        ) : (
                          <Clock className="w-5 h-5 text-amber-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-white">
                          {booking.studio.name}
                        </p>
                        <p className="text-sm text-gray-400">
                          {booking.organization || booking.applicant_name}
                        </p>
                      </div>
                    </div>
                    {/* 시간 전 표시 */}
                    {!started && (
                      <span className="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs rounded-full">
                        {getStartTimeStr(booking)} 이후
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Clock className="w-4 h-4" />
                      <span>{formatTimeSlots(booking.time_slots)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                      <User className="w-4 h-4" />
                      <span>{booking.applicant_name}</span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* 시간 제한 모달 */}
        {selectedBooking && !isBookingStarted(selectedBooking) && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md">
              <div className="text-center mb-6">
                <div className="inline-flex p-3 rounded-full bg-amber-500/20 mb-4">
                  <Clock className="w-8 h-8 text-amber-400" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">아직 설문 시간이 아닙니다</h2>
                <p className="text-gray-400 text-sm">
                  예약 시작 시간 이후부터 설문에 참여하실 수 있습니다.
                </p>
              </div>

              <div className="mb-6 p-4 rounded-xl bg-white/5">
                <p className="text-sm text-gray-400 mb-2">
                  <span className="text-white font-medium">
                    {selectedBooking.studio.name}
                  </span>{' '}
                  · {selectedBooking.applicant_name}
                </p>
                <div className="flex items-center gap-2 text-amber-400">
                  <Clock className="w-4 h-4" />
                  <span className="font-medium">{getStartTimeStr(selectedBooking)} 이후 참여 가능</span>
                </div>
              </div>

              <button
                onClick={() => setSelectedBooking(null)}
                className="w-full py-3 bg-gray-700 text-gray-300 rounded-xl font-medium hover:bg-gray-600 transition"
              >
                닫기
              </button>
            </div>
          </div>
        )}

        {/* PIN 입력 모달 */}
        {selectedBooking && isBookingStarted(selectedBooking) && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md">
              <div className="text-center mb-6">
                <div className="inline-flex p-3 rounded-full bg-purple-500/20 mb-4">
                  <Lock className="w-8 h-8 text-purple-400" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">본인 확인</h2>
                <p className="text-gray-400 text-sm">
                  예약 시 등록한 전화번호 뒷 4자리를 입력해주세요.
                </p>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-400 mb-2">
                  <span className="text-white font-medium">
                    {selectedBooking.studio.name}
                  </span>{' '}
                  · {selectedBooking.applicant_name}
                </p>
              </div>

              <input
                type="tel"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="0000"
                className="w-full text-center text-3xl tracking-[0.5em] font-mono bg-gray-700 border border-gray-600 rounded-xl p-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4"
                autoFocus
              />

              {pinError && (
                <p className="text-red-400 text-sm text-center mb-4">{pinError}</p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedBooking(null)}
                  className="flex-1 py-3 bg-gray-700 text-gray-300 rounded-xl font-medium hover:bg-gray-600 transition"
                >
                  취소
                </button>
                <button
                  onClick={verifyPin}
                  disabled={verifying || pin.length !== 4}
                  className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {verifying ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    '확인'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
