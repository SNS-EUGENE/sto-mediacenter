'use client'

import { useState, useMemo } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import GlassCard from '@/components/ui/GlassCard'
import StatusBadge from '@/components/ui/StatusBadge'
import StudioBadge from '@/components/ui/StudioBadge'
import { allBookings } from '@/lib/data'
import { STUDIOS, BOOKING_STATUS_LABELS } from '@/lib/constants'
import { Search, ChevronLeft, ChevronRight, ChevronDown, Plus, Edit2, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const ITEMS_PER_PAGE = 20

export default function BookingsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStudio, setSelectedStudio] = useState<number | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // 필터링된 예약 목록
  const filteredBookings = useMemo(() => {
    return allBookings.filter((booking) => {
      // 검색어 필터
      if (searchTerm) {
        const search = searchTerm.toLowerCase()
        const matchesSearch =
          (booking.applicantName || '').toLowerCase().includes(search) ||
          (booking.organization || '').toLowerCase().includes(search) ||
          (booking.eventName || '').toLowerCase().includes(search)
        if (!matchesSearch) return false
      }

      // 스튜디오 필터
      if (selectedStudio && booking.studioId !== selectedStudio) {
        return false
      }

      // 상태 필터
      if (selectedStatus && booking.statusCode !== selectedStatus) {
        return false
      }

      return true
    }).sort((a, b) => {
      // 예약일 기준 내림차순 정렬
      if (a.rentalDate !== b.rentalDate) {
        return b.rentalDate.localeCompare(a.rentalDate)
      }
      return a.startHour - b.startHour
    })
  }, [searchTerm, selectedStudio, selectedStatus])

  // 페이지네이션
  const totalPages = Math.ceil(filteredBookings.length / ITEMS_PER_PAGE)
  const paginatedBookings = filteredBookings.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

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

  return (
    <AdminLayout>
      <div className="h-full flex flex-col overflow-hidden">
        {/* Sticky Header */}
        <div className="flex-shrink-0 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-white">예약 관리</h1>
              <p className="text-sm text-gray-500">
                총 {filteredBookings.length}건
              </p>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium rounded-xl transition-colors">
              <Plus className="w-4 h-4" />
              새 예약
            </button>
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
            <select
              value={selectedStudio || ''}
              onChange={(e) => {
                setSelectedStudio(e.target.value ? Number(e.target.value) : null)
                setCurrentPage(1)
              }}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50"
            >
              <option value="">전체 스튜디오</option>
              {STUDIOS.map((studio) => (
                <option key={studio.id} value={studio.id}>
                  {studio.alias}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus || ''}
              onChange={(e) => {
                setSelectedStatus(e.target.value || null)
                setCurrentPage(1)
              }}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50"
            >
              <option value="">전체 상태</option>
              {Object.entries(BOOKING_STATUS_LABELS).map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>

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
            {/* Desktop Table */}
            <div className="hidden lg:block divide-y divide-white/5">
              {paginatedBookings.map((booking) => (
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
                    <span className="text-sm text-white">{booking.rentalDate}</span>
                    <span className="text-sm text-gray-400">{booking.timeDisplay}</span>
                    <div><StudioBadge studioId={booking.studioId} /></div>
                    <span className="text-sm text-white truncate">{booking.applicantName}</span>
                    <span className="text-sm text-gray-400 truncate">{booking.eventName || '-'}</span>
                    <div><StatusBadge status={booking.statusCode} /></div>
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
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 py-4">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">소속</p>
                          <p className="text-sm text-white">{booking.organization || '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">인원</p>
                          <p className="text-sm text-white">{booking.participantsCount}명</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">대관료</p>
                          <p className="text-sm text-white">{booking.fee.toLocaleString()}원</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">등록일</p>
                          <p className="text-sm text-white">{booking.createdAt}</p>
                        </div>
                        <div className="col-span-2 lg:col-span-4">
                          <p className="text-xs text-gray-500 mb-1">행사명</p>
                          <p className="text-sm text-white">{booking.eventName || '-'}</p>
                        </div>
                        {booking.cancelledAt && (
                          <div className="col-span-2 lg:col-span-4">
                            <p className="text-xs text-gray-500 mb-1">취소일시</p>
                            <p className="text-sm text-red-400">{booking.cancelledAt}</p>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 pt-3 border-t border-white/5">
                        <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                          수정
                        </button>
                        <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                          삭제
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Mobile List */}
            <div className="lg:hidden divide-y divide-white/5">
              {paginatedBookings.map((booking) => (
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
                        <StudioBadge studioId={booking.studioId} />
                        <span className="text-xs text-gray-500">{booking.rentalDate}</span>
                        <span className="text-xs text-gray-600">{booking.timeDisplay}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={booking.statusCode} />
                        <ChevronDown className={cn(
                          'w-4 h-4 text-gray-500 transition-transform',
                          expandedId === booking.id && 'rotate-180'
                        )} />
                      </div>
                    </div>
                    <p className="text-sm text-white">{booking.applicantName}</p>
                    <p className="text-xs text-gray-500 truncate">{booking.eventName || '-'}</p>
                  </div>

                  {/* Mobile Expanded Detail */}
                  {expandedId === booking.id && (
                    <div className="px-4 pb-4 bg-white/[0.02] border-t border-white/5">
                      <div className="grid grid-cols-2 gap-3 py-3">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">소속</p>
                          <p className="text-sm text-white">{booking.organization || '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">인원</p>
                          <p className="text-sm text-white">{booking.participantsCount}명</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">대관료</p>
                          <p className="text-sm text-white">{booking.fee.toLocaleString()}원</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">등록일</p>
                          <p className="text-sm text-white">{booking.createdAt}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-3 border-t border-white/5">
                        <button className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs text-white bg-white/10 rounded-lg">
                          <Edit2 className="w-3.5 h-3.5" />
                          수정
                        </button>
                        <button className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs text-red-400 bg-red-500/10 rounded-lg">
                          <Trash2 className="w-3.5 h-3.5" />
                          삭제
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Empty State */}
            {paginatedBookings.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">검색 결과가 없습니다</p>
              </div>
            )}
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-t border-white/10 bg-white/[0.02]">
              <p className="text-xs text-gray-500">
                {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredBookings.length)} / {filteredBookings.length}
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
    </AdminLayout>
  )
}
