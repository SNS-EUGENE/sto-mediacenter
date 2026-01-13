'use client'

import { useState, useMemo } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import GlassCard from '@/components/ui/GlassCard'
import StatusBadge from '@/components/ui/StatusBadge'
import StudioBadge from '@/components/ui/StudioBadge'
import { allBookings } from '@/lib/data'
import { STUDIOS, BOOKING_STATUS_LABELS } from '@/lib/constants'
import { Search, Filter, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const ITEMS_PER_PAGE = 15

export default function BookingsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStudio, setSelectedStudio] = useState<number | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)

  // 필터링된 예약 목록
  const filteredBookings = useMemo(() => {
    return allBookings.filter((booking) => {
      // 검색어 필터
      if (searchTerm) {
        const search = searchTerm.toLowerCase()
        const matchesSearch =
          booking.applicantName.toLowerCase().includes(search) ||
          booking.organization.toLowerCase().includes(search) ||
          booking.eventName.toLowerCase().includes(search)
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

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-white mb-1">예약 관리</h1>
          <p className="text-sm text-gray-500">
            총 {filteredBookings.length}건의 예약
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <GlassCard className="mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="신청자, 소속, 행사명 검색..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-colors"
            />
          </div>

          {/* Filter Toggle (Mobile) */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'sm:hidden flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border transition-colors',
              showFilters
                ? 'bg-purple-500/20 border-purple-500/30 text-purple-400'
                : 'bg-white/5 border-white/10 text-gray-400'
            )}
          >
            <Filter className="w-4 h-4" />
            <span>필터</span>
          </button>

          {/* Desktop Filters */}
          <div className="hidden sm:flex items-center gap-2">
            {/* Studio Filter */}
            <select
              value={selectedStudio || ''}
              onChange={(e) => {
                setSelectedStudio(e.target.value ? Number(e.target.value) : null)
                setCurrentPage(1)
              }}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-colors"
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
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-colors"
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
                className="flex items-center gap-1 px-3 py-2.5 text-sm text-red-400 hover:text-red-300 transition-colors"
              >
                <X className="w-4 h-4" />
                <span>초기화</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Filters */}
        {showFilters && (
          <div className="sm:hidden mt-3 pt-3 border-t border-white/5 flex flex-wrap gap-2">
            <select
              value={selectedStudio || ''}
              onChange={(e) => {
                setSelectedStudio(e.target.value ? Number(e.target.value) : null)
                setCurrentPage(1)
              }}
              className="flex-1 min-w-[120px] bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
            >
              <option value="">전체 스튜디오</option>
              {STUDIOS.map((studio) => (
                <option key={studio.id} value={studio.id}>
                  {studio.alias}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus || ''}
              onChange={(e) => {
                setSelectedStatus(e.target.value || null)
                setCurrentPage(1)
              }}
              className="flex-1 min-w-[120px] bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
            >
              <option value="">전체 상태</option>
              {Object.entries(BOOKING_STATUS_LABELS).map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-3 py-2 text-sm text-red-400"
              >
                초기화
              </button>
            )}
          </div>
        )}
      </GlassCard>

      {/* Booking List */}
      <GlassCard className="overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                  예약일
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                  시간
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                  스튜디오
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                  신청자
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                  행사명
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                  상태
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {paginatedBookings.map((booking) => (
                <tr
                  key={booking.id}
                  className="hover:bg-white/[0.02] transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3">
                    <span className="text-sm text-white">{booking.rentalDate}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-400">{booking.timeDisplay}</span>
                  </td>
                  <td className="px-4 py-3">
                    <StudioBadge studioId={booking.studioId} />
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm text-white">{booking.applicantName}</p>
                      {booking.organization && (
                        <p className="text-xs text-gray-500">{booking.organization}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-400 truncate max-w-[200px]">
                      {booking.eventName || '-'}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={booking.statusCode} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile List */}
        <div className="lg:hidden divide-y divide-white/5">
          {paginatedBookings.map((booking) => (
            <div
              key={booking.id}
              className="p-4 hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <StudioBadge studioId={booking.studioId} />
                  <span className="text-xs text-gray-500">{booking.rentalDate}</span>
                </div>
                <StatusBadge status={booking.statusCode} />
              </div>
              <p className="text-sm text-white mb-1">
                {booking.applicantName}
                {booking.organization && (
                  <span className="text-gray-500"> ({booking.organization})</span>
                )}
              </p>
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500 truncate flex-1">
                  {booking.eventName || '-'}
                </p>
                <span className="text-xs text-gray-600 ml-2">{booking.timeDisplay}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {paginatedBookings.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">검색 결과가 없습니다</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
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
    </AdminLayout>
  )
}
