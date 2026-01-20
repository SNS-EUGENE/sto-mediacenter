'use client'

import { useState, useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { STUDIOS, VALID_TIME_SLOTS, BOOKING_STATUS_LABELS } from '@/lib/constants'
import type { Booking, BookingInsert, BookingStatus } from '@/types/supabase'

interface BookingModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: BookingInsert) => Promise<void>
  booking?: Booking | null // 수정 시 기존 데이터
  initialDate?: string // 캘린더에서 날짜 선택 시
}

export default function BookingModal({
  isOpen,
  onClose,
  onSubmit,
  booking,
  initialDate,
}: BookingModalProps) {
  const isEditMode = !!booking

  // Form state - 기본 정보
  const [studioId, setStudioId] = useState<number>(1)
  const [rentalDate, setRentalDate] = useState('')
  const [timeSlots, setTimeSlots] = useState<number[]>([])
  const [applicantName, setApplicantName] = useState('')
  const [organization, setOrganization] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [eventName, setEventName] = useState('')
  const [purpose, setPurpose] = useState('')
  const [participantsCount, setParticipantsCount] = useState(1)
  const [fee, setFee] = useState(0)
  const [status, setStatus] = useState<BookingStatus>('CONFIRMED')
  const [paymentConfirmed, setPaymentConfirmed] = useState(false)

  // Form state - STO 상세 정보
  const [discountRate, setDiscountRate] = useState(0)
  const [userType, setUserType] = useState('')
  const [receiptType, setReceiptType] = useState('')
  const [companyPhone, setCompanyPhone] = useState('')
  const [businessNumber, setBusinessNumber] = useState('')
  const [businessLicense, setBusinessLicense] = useState('')
  const [businessLicenseUrl, setBusinessLicenseUrl] = useState('')
  const [specialNote, setSpecialNote] = useState('')
  const [studioUsageMethod, setStudioUsageMethod] = useState('')
  const [fileDeliveryMethod, setFileDeliveryMethod] = useState('')
  const [preMeetingContact, setPreMeetingContact] = useState('')
  const [otherInquiry, setOtherInquiry] = useState('')

  // 상세 정보 섹션 토글
  const [showDetailSection, setShowDetailSection] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 모달이 열릴 때 데이터 초기화
  useEffect(() => {
    if (isOpen) {
      if (booking) {
        // 수정 모드: 기존 데이터로 초기화
        setStudioId(booking.studio_id)
        setRentalDate(booking.rental_date)
        setTimeSlots(booking.time_slots || [])
        setApplicantName(booking.applicant_name)
        setOrganization(booking.organization || '')
        setPhone(booking.phone)
        setEmail(booking.email || '')
        setEventName(booking.event_name || '')
        setPurpose(booking.purpose || '')
        setParticipantsCount(booking.participants_count)
        setFee(booking.fee || 0)
        setStatus(booking.status)
        setPaymentConfirmed(booking.payment_confirmed)
        // STO 상세 정보
        setDiscountRate(booking.discount_rate || 0)
        setUserType(booking.user_type || '')
        setReceiptType(booking.receipt_type || '')
        setCompanyPhone(booking.company_phone || '')
        setBusinessNumber(booking.business_number || '')
        setBusinessLicense(booking.business_license || '')
        setBusinessLicenseUrl(booking.business_license_url || '')
        setSpecialNote(booking.special_note || '')
        setStudioUsageMethod(booking.studio_usage_method || '')
        setFileDeliveryMethod(booking.file_delivery_method || '')
        setPreMeetingContact(booking.pre_meeting_contact || '')
        setOtherInquiry(booking.other_inquiry || '')
        // STO 데이터가 있으면 상세 섹션 열기
        setShowDetailSection(!!booking.sto_reqst_sn || !!booking.user_type || !!booking.special_note)
      } else {
        // 신규 모드: 초기화
        setStudioId(1)
        setRentalDate(initialDate || '')
        setTimeSlots([])
        setApplicantName('')
        setOrganization('')
        setPhone('')
        setEmail('')
        setEventName('')
        setPurpose('')
        setParticipantsCount(1)
        setFee(0)
        setStatus('CONFIRMED')
        setPaymentConfirmed(false)
        // STO 상세 정보 초기화
        setDiscountRate(0)
        setUserType('')
        setReceiptType('')
        setCompanyPhone('')
        setBusinessNumber('')
        setBusinessLicense('')
        setBusinessLicenseUrl('')
        setSpecialNote('')
        setStudioUsageMethod('')
        setFileDeliveryMethod('')
        setPreMeetingContact('')
        setOtherInquiry('')
        setShowDetailSection(false)
      }
      setError(null)
    }
  }, [isOpen, booking, initialDate])

  // 시간 슬롯 토글
  const toggleTimeSlot = (slot: number) => {
    setTimeSlots((prev) =>
      prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot].sort((a, b) => a - b)
    )
  }

  // 연속 시간 선택 (shift+click)
  const selectRangeToSlot = (slot: number) => {
    if (timeSlots.length === 0) {
      setTimeSlots([slot])
      return
    }
    const minSlot = Math.min(...timeSlots, slot)
    const maxSlot = Math.max(...timeSlots, slot)
    const range: number[] = []
    for (let i = minSlot; i <= maxSlot; i++) {
      range.push(i)
    }
    setTimeSlots(range)
  }

  // 전화번호 포맷
  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '')
    if (digits.length <= 3) return digits
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`
  }

  // 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!rentalDate) {
      setError('예약일을 선택해주세요')
      return
    }
    if (timeSlots.length === 0) {
      setError('시간대를 선택해주세요')
      return
    }
    if (!applicantName.trim()) {
      setError('신청자명을 입력해주세요')
      return
    }
    if (!phone.trim()) {
      setError('연락처를 입력해주세요')
      return
    }

    setLoading(true)
    try {
      const data: BookingInsert = {
        studio_id: studioId,
        rental_date: rentalDate,
        time_slots: timeSlots,
        applicant_name: applicantName.trim(),
        organization: organization.trim() || null,
        phone: phone.trim(),
        email: email.trim() || null,
        event_name: eventName.trim() || null,
        purpose: purpose.trim() || null,
        participants_count: participantsCount,
        fee: fee || null,
        status,
        payment_confirmed: paymentConfirmed,
        cancelled_at: null,
        // STO 상세 정보
        discount_rate: discountRate || null,
        user_type: userType.trim() || null,
        receipt_type: receiptType.trim() || null,
        company_phone: companyPhone.trim() || null,
        business_number: businessNumber.trim() || null,
        business_license: businessLicense.trim() || null,
        business_license_url: businessLicenseUrl.trim() || null,
        special_note: specialNote.trim() || null,
        studio_usage_method: studioUsageMethod.trim() || null,
        file_delivery_method: fileDeliveryMethod.trim() || null,
        pre_meeting_contact: preMeetingContact.trim() || null,
        other_inquiry: otherInquiry.trim() || null,
      }
      await onSubmit(data)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] mx-4 bg-[#12121a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <h2 className="text-lg font-bold text-white">
            {isEditMode ? '예약 수정' : '새 예약 등록'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="p-6 space-y-5">
            {/* 스튜디오 선택 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">스튜디오</label>
              <div className="flex gap-2">
                {STUDIOS.map((studio) => (
                  <button
                    key={studio.id}
                    type="button"
                    onClick={() => setStudioId(studio.id)}
                    className={cn(
                      'flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
                      studioId === studio.id
                        ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                    )}
                  >
                    {studio.alias}
                  </button>
                ))}
              </div>
            </div>

            {/* 예약일 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">예약일</label>
              <input
                type="date"
                value={rentalDate}
                onChange={(e) => setRentalDate(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500/50 transition-colors"
              />
            </div>

            {/* 시간대 선택 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                시간대 <span className="text-gray-500 font-normal">(클릭하여 선택)</span>
              </label>
              <div className="grid grid-cols-9 gap-1.5">
                {VALID_TIME_SLOTS.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={(e) => {
                      if (e.shiftKey) {
                        selectRangeToSlot(slot)
                      } else {
                        toggleTimeSlot(slot)
                      }
                    }}
                    className={cn(
                      'py-2.5 rounded-lg text-sm font-medium transition-all',
                      timeSlots.includes(slot)
                        ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                    )}
                  >
                    {slot}시
                  </button>
                ))}
              </div>
              {timeSlots.length > 0 && (
                <p className="mt-2 text-sm text-purple-400">
                  선택: {Math.min(...timeSlots)}:00 ~ {Math.max(...timeSlots) + 1}:00 ({timeSlots.length}시간)
                </p>
              )}
            </div>

            {/* 신청자 정보 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  신청자명 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={applicantName}
                  onChange={(e) => setApplicantName(e.target.value)}
                  placeholder="홍길동"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  연락처 <span className="text-red-400">*</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  placeholder="010-1234-5678"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">소속</label>
                <input
                  type="text"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="회사명 또는 단체명"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">이메일</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">행사명/사용목적</label>
              <input
                type="text"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="촬영 내용 또는 행사명"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">인원수</label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={participantsCount}
                  onChange={(e) => setParticipantsCount(Number(e.target.value) || 1)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">대관료</label>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={fee}
                  onChange={(e) => setFee(Number(e.target.value) || 0)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500/50 transition-colors"
                />
              </div>
            </div>

            {/* 상태 (수정 모드에서만) */}
            {isEditMode && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">상태</label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(BOOKING_STATUS_LABELS).map(([code, label]) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setStatus(code as BookingStatus)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                        status === code
                          ? 'bg-purple-500 text-white'
                          : 'bg-white/5 text-gray-400 hover:bg-white/10'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 결제 확인 */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPaymentConfirmed(!paymentConfirmed)}
                className={cn(
                  'w-5 h-5 rounded border-2 transition-all flex items-center justify-center',
                  paymentConfirmed
                    ? 'bg-purple-500 border-purple-500'
                    : 'border-white/20 hover:border-white/40'
                )}
              >
                {paymentConfirmed && (
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
              <label className="text-sm text-gray-300 cursor-pointer" onClick={() => setPaymentConfirmed(!paymentConfirmed)}>
                결제 확인됨
              </label>
            </div>

            {/* 상세 정보 토글 */}
            <div className="border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={() => setShowDetailSection(!showDetailSection)}
                className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors"
              >
                <svg
                  className={cn('w-4 h-4 transition-transform', showDetailSection && 'rotate-180')}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                상세 정보 {showDetailSection ? '접기' : '펼치기'}
              </button>
            </div>

            {/* 상세 정보 섹션 */}
            {showDetailSection && (
              <div className="space-y-4 p-4 bg-white/[0.02] border border-white/10 rounded-xl">
                <p className="text-xs text-gray-500 mb-3">대관료 및 스튜디오 관련 상세 정보</p>

                {/* 대관료 정보 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">할인율 (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={discountRate}
                      onChange={(e) => setDiscountRate(Number(e.target.value) || 0)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">신청 유형</label>
                    <input
                      type="text"
                      value={userType}
                      onChange={(e) => setUserType(e.target.value)}
                      placeholder="서울시 입주사 등"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">증빙 유형</label>
                    <select
                      value={receiptType}
                      onChange={(e) => setReceiptType(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-colors"
                    >
                      <option value="">선택</option>
                      <option value="미대상">미대상</option>
                      <option value="세금계산서">세금계산서</option>
                      <option value="현금영수증">현금영수증</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">사업자번호</label>
                    <input
                      type="text"
                      value={businessNumber}
                      onChange={(e) => setBusinessNumber(e.target.value)}
                      placeholder="000-00-00000"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">회사 전화번호</label>
                  <input
                    type="tel"
                    value={companyPhone}
                    onChange={(e) => setCompanyPhone(e.target.value)}
                    placeholder="02-0000-0000"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 transition-colors"
                  />
                </div>

                {/* 사업자등록증 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">사업자등록증 파일명</label>
                    <input
                      type="text"
                      value={businessLicense}
                      onChange={(e) => setBusinessLicense(e.target.value)}
                      placeholder="파일명.pdf"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">사업자등록증 URL</label>
                    <input
                      type="url"
                      value={businessLicenseUrl}
                      onChange={(e) => setBusinessLicenseUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 transition-colors"
                    />
                  </div>
                </div>
                {businessLicenseUrl && (
                  <div className="mt-1">
                    <a
                      href={businessLicenseUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-purple-400 hover:text-purple-300 underline"
                    >
                      파일 보기 →
                    </a>
                  </div>
                )}

                {/* 스튜디오 이용 정보 */}
                <div className="pt-3 border-t border-white/5">
                  <p className="text-xs text-gray-500 mb-3">스튜디오 이용 정보</p>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1.5">사용 방식</label>
                      <input
                        type="text"
                        value={studioUsageMethod}
                        onChange={(e) => setStudioUsageMethod(e.target.value)}
                        placeholder="촬영, 녹화, 편집 등"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-1.5">파일 수령 방법</label>
                      <input
                        type="text"
                        value={fileDeliveryMethod}
                        onChange={(e) => setFileDeliveryMethod(e.target.value)}
                        placeholder="USB, 클라우드 등"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">사전 미팅 연락처</label>
                    <input
                      type="text"
                      value={preMeetingContact}
                      onChange={(e) => setPreMeetingContact(e.target.value)}
                      placeholder="연락처 또는 이메일"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 transition-colors"
                    />
                  </div>
                </div>

                {/* 특이사항 및 기타 문의 */}
                <div className="pt-3 border-t border-white/5">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">특이사항</label>
                    <textarea
                      value={specialNote}
                      onChange={(e) => setSpecialNote(e.target.value)}
                      placeholder="특이사항이 있으면 입력해주세요"
                      rows={2}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 transition-colors resize-none"
                    />
                  </div>

                  <div className="mt-3">
                    <label className="block text-xs font-medium text-gray-400 mb-1.5">기타 문의사항</label>
                    <textarea
                      value={otherInquiry}
                      onChange={(e) => setOtherInquiry(e.target.value)}
                      placeholder="기타 문의사항"
                      rows={2}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 transition-colors resize-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10 bg-white/[0.02]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEditMode ? '수정' : '등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
