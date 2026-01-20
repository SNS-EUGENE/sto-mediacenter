'use client'

import { useState, useEffect, useCallback } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import GlassCard from '@/components/ui/GlassCard'
import StatusBadge from '@/components/ui/StatusBadge'
import StudioBadge from '@/components/ui/StudioBadge'
import Select from '@/components/ui/Select'
import BookingModal from '@/components/ui/BookingModal'
import ConfirmModal from '@/components/ui/ConfirmModal'
import ExcelUploadModal from '@/components/ui/ExcelUploadModal'
import { getBookings, createBooking, updateBooking, deleteBooking, checkBookingConflict } from '@/lib/supabase/queries'
import { STUDIOS, BOOKING_STATUS_LABELS } from '@/lib/constants'
import { Search, ChevronLeft, ChevronRight, ChevronDown, Plus, Edit2, Trash2, Loader2, FileSpreadsheet } from 'lucide-react'
import { cn, timeSlotsToString } from '@/lib/utils'
import { getComputedStatus } from '@/lib/utils/bookingStatus'
import type { BookingWithStudio, BookingInsert, Booking } from '@/types/supabase'

const ITEMS_PER_PAGE = 20

export default function BookingsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStudio, setSelectedStudio] = useState<number | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Supabase 데이터 상태
  const [bookings, setBookings] = useState<BookingWithStudio[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 모달 상태
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deletingBookingId, setDeletingBookingId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false)

  // 데이터 로드
  const loadBookings = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getBookings(
        {
          studioId: selectedStudio || undefined,
          status: selectedStatus ? [selectedStatus] : undefined,
          searchTerm: searchTerm || undefined,
        },
        {
          page: currentPage,
          pageSize: ITEMS_PER_PAGE,
        }
      )
      setBookings(result.data)
      setTotalCount(result.pagination.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }, [searchTerm, selectedStudio, selectedStatus, currentPage])

  // 필터나 페이지 변경 시 데이터 다시 로드
  useEffect(() => {
    loadBookings()
  }, [loadBookings])

  // 페이지네이션
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  // 필터 초기화
  const clearFilters = () => {
    setSearchTerm('')
    setSelectedStudio(null)
    setSelectedStatus(null)
    setCurrentPage(1)
  }

  const hasActiveFilters = searchTerm || selectedStudio || selectedStatus

  // 아코디언 토글
  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  // 새 예약 버튼 클릭
  const handleNewBooking = () => {
    setEditingBooking(null)
    setIsBookingModalOpen(true)
  }

  // 수정 버튼 클릭
  const handleEditBooking = (booking: BookingWithStudio) => {
    setEditingBooking(booking)
    setIsBookingModalOpen(true)
  }

  // 삭제 버튼 클릭
  const handleDeleteClick = (id: string) => {
    setDeletingBookingId(id)
    setIsDeleteModalOpen(true)
  }

  // 예약 저장 (신규/수정)
  const handleSaveBooking = async (data: BookingInsert) => {
    // 충돌 확인
    const hasConflict = await checkBookingConflict(
      data.studio_id,
      data.rental_date,
      data.time_slots,
      editingBooking?.id
    )

    if (hasConflict) {
      throw new Error('해당 시간대에 이미 예약이 있습니다')
    }

    if (editingBooking) {
      // 수정
      await updateBooking(editingBooking.id, data)
    } else {
      // 신규
      await createBooking(data)
    }

    // 데이터 새로고침
    await loadBookings()
  }

  // 삭제 확인
  const handleConfirmDelete = async () => {
    if (!deletingBookingId) return

    setDeleteLoading(true)
    try {
      await deleteBooking(deletingBookingId)
      setIsDeleteModalOpen(false)
      setDeletingBookingId(null)
      await loadBookings()
    } catch (err) {
      console.error('Delete failed:', err)
    } finally {
      setDeleteLoading(false)
    }
  }

  // 엑셀 업로드
  const handleExcelUpload = async (bookings: BookingInsert[]) => {
    // 순차적으로 생성 (충돌 체크 포함)
    for (const booking of bookings) {
      const hasConflict = await checkBookingConflict(
        booking.studio_id,
        booking.rental_date,
        booking.time_slots
      )
      if (!hasConflict) {
        await createBooking(booking)
      }
    }
    await loadBookings()
  }

  return (
    <AdminLayout>
      <div className="h-full flex flex-col overflow-hidden">
        {/* Sticky Header */}
        <div className="flex-shrink-0 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-white">예약 관리</h1>
              <p className="text-sm text-gray-500">
                총 {totalCount}건
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsExcelModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-xl transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4" />
                엑셀 업로드
              </button>
              <button
                onClick={handleNewBooking}
                className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium rounded-xl transition-colors"
              >
                <Plus className="w-4 h-4" />
                새 예약
              </button>
            </div>
          </div>

          {/* Compact Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px] max-w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="검색..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-colors"
              />
            </div>

            {/* Studio Filter */}
            <Select
              value={selectedStudio?.toString() || ''}
              onChange={(val) => {
                setSelectedStudio(val ? Number(val) : null)
                setCurrentPage(1)
              }}
              placeholder="전체 스튜디오"
              options={[
                { value: '', label: '전체 스튜디오' },
                ...STUDIOS.map((studio) => ({
                  value: studio.id.toString(),
                  label: studio.alias,
                })),
              ]}
            />

            {/* Status Filter */}
            <Select
              value={selectedStatus || ''}
              onChange={(val) => {
                setSelectedStatus(val || null)
                setCurrentPage(1)
              }}
              placeholder="전체 상태"
              options={[
                { value: '', label: '전체 상태' },
                ...Object.entries(BOOKING_STATUS_LABELS).map(([code, label]) => ({
                  value: code,
                  label: label,
                })),
              ]}
            />

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-3 py-2 text-sm text-red-400 hover:text-red-300 transition-colors"
              >
                초기화
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Table Area */}
        <GlassCard className="flex-1 min-h-0 flex flex-col overflow-hidden p-0">
          {/* Table Header */}
          <div className="flex-shrink-0 border-b border-white/10 bg-white/[0.02]">
            <div className="hidden lg:grid grid-cols-[1fr_100px_100px_120px_1fr_100px_50px] gap-4 px-4 py-3">
              <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">예약일</span>
              <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">시간</span>
              <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">스튜디오</span>
              <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">신청자</span>
              <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">행사명</span>
              <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">상태</span>
              <span></span>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                <span className="ml-2 text-gray-400">로딩 중...</span>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="text-center py-12">
                <p className="text-red-400">{error}</p>
                <button
                  onClick={loadBookings}
                  className="mt-2 text-sm text-purple-400 hover:text-purple-300"
                >
                  다시 시도
                </button>
              </div>
            )}

            {/* Desktop Table */}
            {!loading && !error && (
              <div className="hidden lg:block divide-y divide-white/5">
                {bookings.map((booking) => (
                  <div key={booking.id}>
                    {/* Main Row */}
                    <div
                      onClick={() => toggleExpand(booking.id)}
                      className={cn(
                        'grid grid-cols-[1fr_100px_100px_120px_1fr_100px_50px] gap-4 px-4 py-3 cursor-pointer transition-colors',
                        'hover:bg-white/[0.03]',
                        expandedId === booking.id && 'bg-white/[0.03]'
                      )}
                    >
                      <span className="text-sm text-white">{booking.rental_date}</span>
                      <span className="text-sm text-gray-400">{timeSlotsToString(booking.time_slots || [])}</span>
                      <div><StudioBadge studioId={booking.studio_id} /></div>
                      <span className="text-sm text-white truncate">{booking.applicant_name}</span>
                      <span className="text-sm text-gray-400 truncate">{booking.event_name || '-'}</span>
                      <div><StatusBadge status={getComputedStatus(booking)} /></div>
                      <div className="flex items-center justify-center">
                        <ChevronDown className={cn(
                          'w-4 h-4 text-gray-500 transition-transform',
                          expandedId === booking.id && 'rotate-180'
                        )} />
                      </div>
                    </div>

                    {/* Expanded Detail */}
                    {expandedId === booking.id && (
                      <div className="px-4 pb-4 bg-white/[0.02] border-t border-white/5">
                        {/* 기본 정보 */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 py-4">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">소속</p>
                            <p className="text-sm text-white">{booking.organization || '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">연락처</p>
                            <p className="text-sm text-white">{booking.phone || '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">이메일</p>
                            <p className="text-sm text-white">{booking.email || '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">인원</p>
                            <p className="text-sm text-white">{booking.participants_count}명</p>
                          </div>
                          <div className="col-span-2 lg:col-span-4">
                            <p className="text-xs text-gray-500 mb-1">행사명/사용목적</p>
                            <p className="text-sm text-white">{booking.event_name || booking.purpose || '-'}</p>
                          </div>
                        </div>

                        {/* 대관료 정보 */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 py-4 border-t border-white/5">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">대관료</p>
                            <p className="text-sm text-white">{booking.fee !== null ? `${booking.fee.toLocaleString()}원` : '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">할인율</p>
                            <p className="text-sm text-white">{booking.discount_rate !== null ? `${booking.discount_rate}%` : '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">신청 유형</p>
                            <p className="text-sm text-white">{booking.user_type || '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">증빙 유형</p>
                            <p className="text-sm text-white">{booking.receipt_type || '-'}</p>
                          </div>
                        </div>

                        {/* 스튜디오 지원 정보 (STO 연동 데이터가 있는 경우) */}
                        {booking.sto_reqst_sn && (
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 py-4 border-t border-white/5">
                            <div>
                              <p className="text-xs text-gray-500 mb-1">스튜디오 사용 방식</p>
                              <p className="text-sm text-white">{booking.studio_usage_method || '-'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">파일 수령 방법</p>
                              <p className="text-sm text-white">{booking.file_delivery_method || '-'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">사전 미팅 연락처</p>
                              <p className="text-sm text-white">{booking.pre_meeting_contact || '-'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">STO 예약번호</p>
                              <p className="text-sm text-purple-400">{booking.sto_reqst_sn}</p>
                            </div>
                            {booking.other_inquiry && (
                              <div className="col-span-2 lg:col-span-4">
                                <p className="text-xs text-gray-500 mb-1">기타 문의사항</p>
                                <p className="text-sm text-white">{booking.other_inquiry}</p>
                              </div>
                            )}
                            {booking.special_note && (
                              <div className="col-span-2 lg:col-span-4">
                                <p className="text-xs text-gray-500 mb-1">특이사항</p>
                                <p className="text-sm text-yellow-400">{booking.special_note}</p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* No-Show 및 기타 정보 */}
                        {(booking.has_no_show || booking.cancelled_at) && (
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 py-4 border-t border-white/5">
                            {booking.has_no_show && (
                              <div className="col-span-2 lg:col-span-4">
                                <p className="text-xs text-gray-500 mb-1">No-Show</p>
                                <p className="text-sm text-red-400">예 {booking.no_show_memo && `- ${booking.no_show_memo}`}</p>
                              </div>
                            )}
                            {booking.cancelled_at && (
                              <div className="col-span-2 lg:col-span-4">
                                <p className="text-xs text-gray-500 mb-1">취소일시</p>
                                <p className="text-sm text-red-400">{booking.cancelled_at}</p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* 등록 정보 */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 py-4 border-t border-white/5">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">등록일</p>
                            <p className="text-sm text-white">{booking.created_at?.split('T')[0] || '-'}</p>
                          </div>
                          {booking.company_phone && (
                            <div>
                              <p className="text-xs text-gray-500 mb-1">회사 전화</p>
                              <p className="text-sm text-white">{booking.company_phone}</p>
                            </div>
                          )}
                          {booking.business_number && (
                            <div>
                              <p className="text-xs text-gray-500 mb-1">사업자번호</p>
                              <p className="text-sm text-white">{booking.business_number}</p>
                            </div>
                          )}
                          {booking.business_license && (
                            <div className="col-span-2 lg:col-span-4">
                              <p className="text-xs text-gray-500 mb-1">사업자등록증</p>
                              {booking.business_license_url ? (
                                <a
                                  href={booking.business_license_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-purple-400 hover:text-purple-300 underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {booking.business_license}
                                </a>
                              ) : (
                                <p className="text-sm text-white">{booking.business_license}</p>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 pt-3 border-t border-white/5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEditBooking(booking)
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            수정
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteClick(booking.id)
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            삭제
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Mobile List */}
            {!loading && !error && (
              <div className="lg:hidden divide-y divide-white/5">
                {bookings.map((booking) => (
                  <div key={booking.id}>
                    <div
                      onClick={() => toggleExpand(booking.id)}
                      className={cn(
                        'p-4 cursor-pointer transition-colors',
                        'hover:bg-white/[0.03]',
                        expandedId === booking.id && 'bg-white/[0.03]'
                      )}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <StudioBadge studioId={booking.studio_id} />
                          <span className="text-xs text-gray-500">{booking.rental_date}</span>
                          <span className="text-xs text-gray-600">{timeSlotsToString(booking.time_slots || [])}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={getComputedStatus(booking)} />
                          <ChevronDown className={cn(
                            'w-4 h-4 text-gray-500 transition-transform',
                            expandedId === booking.id && 'rotate-180'
                          )} />
                        </div>
                      </div>
                      <p className="text-sm text-white">{booking.applicant_name}</p>
                      <p className="text-xs text-gray-500 truncate">{booking.event_name || '-'}</p>
                    </div>

                    {/* Mobile Expanded Detail */}
                    {expandedId === booking.id && (
                      <div className="px-4 pb-4 bg-white/[0.02] border-t border-white/5">
                        {/* 기본 정보 */}
                        <div className="grid grid-cols-2 gap-3 py-3">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">소속</p>
                            <p className="text-sm text-white">{booking.organization || '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">인원</p>
                            <p className="text-sm text-white">{booking.participants_count}명</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">연락처</p>
                            <p className="text-sm text-white">{booking.phone || '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">이메일</p>
                            <p className="text-sm text-white truncate">{booking.email || '-'}</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-xs text-gray-500 mb-1">행사명/사용목적</p>
                            <p className="text-sm text-white">{booking.event_name || booking.purpose || '-'}</p>
                          </div>
                        </div>

                        {/* 대관료 정보 */}
                        <div className="grid grid-cols-2 gap-3 py-3 border-t border-white/5">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">대관료</p>
                            <p className="text-sm text-white">{booking.fee !== null ? `${booking.fee.toLocaleString()}원` : '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">할인율</p>
                            <p className="text-sm text-white">{booking.discount_rate !== null ? `${booking.discount_rate}%` : '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">신청 유형</p>
                            <p className="text-sm text-white truncate">{booking.user_type || '-'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">증빙 유형</p>
                            <p className="text-sm text-white">{booking.receipt_type || '-'}</p>
                          </div>
                        </div>

                        {/* STO 연동 정보 */}
                        {booking.sto_reqst_sn && (
                          <div className="grid grid-cols-2 gap-3 py-3 border-t border-white/5">
                            <div>
                              <p className="text-xs text-gray-500 mb-1">사용 방식</p>
                              <p className="text-sm text-white">{booking.studio_usage_method || '-'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">파일 수령</p>
                              <p className="text-sm text-white">{booking.file_delivery_method || '-'}</p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-xs text-gray-500 mb-1">STO 예약번호</p>
                              <p className="text-sm text-purple-400">{booking.sto_reqst_sn}</p>
                            </div>
                            {booking.special_note && (
                              <div className="col-span-2">
                                <p className="text-xs text-gray-500 mb-1">특이사항</p>
                                <p className="text-sm text-yellow-400">{booking.special_note}</p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* No-Show / 취소 */}
                        {(booking.has_no_show || booking.cancelled_at) && (
                          <div className="py-3 border-t border-white/5">
                            {booking.has_no_show && (
                              <p className="text-sm text-red-400">No-Show {booking.no_show_memo && `- ${booking.no_show_memo}`}</p>
                            )}
                            {booking.cancelled_at && (
                              <p className="text-sm text-red-400">취소: {booking.cancelled_at}</p>
                            )}
                          </div>
                        )}

                        {/* 등록일 */}
                        <div className="py-3 border-t border-white/5">
                          <p className="text-xs text-gray-500">등록일: {booking.created_at?.split('T')[0] || '-'}</p>
                        </div>

                        <div className="flex gap-2 pt-3 border-t border-white/5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEditBooking(booking)
                            }}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs text-white bg-white/10 rounded-lg"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            수정
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteClick(booking.id)
                            }}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs text-red-400 bg-red-500/10 rounded-lg"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            삭제
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && bookings.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">검색 결과가 없습니다</p>
              </div>
            )}
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-t border-white/10 bg-white/[0.02]">
              <p className="text-xs text-gray-500">
                {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} / {totalCount}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 py-1 text-sm text-white">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </GlassCard>
      </div>

      {/* 예약 모달 */}
      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => {
          setIsBookingModalOpen(false)
          setEditingBooking(null)
        }}
        onSubmit={handleSaveBooking}
        booking={editingBooking}
      />

      {/* 삭제 확인 모달 */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false)
          setDeletingBookingId(null)
        }}
        onConfirm={handleConfirmDelete}
        title="예약 삭제"
        message="정말 이 예약을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
        confirmText="삭제"
        variant="danger"
        loading={deleteLoading}
      />

      {/* 엑셀 업로드 모달 */}
      <ExcelUploadModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        onUpload={handleExcelUpload}
      />
    </AdminLayout>
  )
}
