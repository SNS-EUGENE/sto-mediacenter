'use client'

import Link from 'next/link'
import GlassCard from '@/components/ui/GlassCard'
import StudioBadge from '@/components/ui/StudioBadge'
import StatusBadge from '@/components/ui/StatusBadge'
import { ArrowRight } from 'lucide-react'

interface RecentBooking {
  id: string
  studioId: number
  studioName: string
  date: string
  time: string
  applicantName: string
  organization?: string
  eventName?: string
  status: string
}

interface RecentBookingsProps {
  bookings: RecentBooking[]
}

export default function RecentBookings({ bookings }: RecentBookingsProps) {
  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">최근 예약</h2>
        <Link
          href="/bookings"
          className="flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300 transition-colors"
        >
          <span>전체보기</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="space-y-3">
        {bookings.length === 0 ? (
          <p className="text-center text-gray-500 py-8">예약 내역이 없습니다</p>
        ) : (
          bookings.map((booking) => (
            <div
              key={booking.id}
              className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-colors cursor-pointer"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <StudioBadge studioId={booking.studioId} />
                  <span className="text-xs text-gray-500">{booking.date}</span>
                  <span className="text-xs text-gray-600">{booking.time}</span>
                </div>
                <p className="text-sm text-white truncate">
                  {booking.applicantName}
                  {booking.organization && (
                    <span className="text-gray-500"> ({booking.organization})</span>
                  )}
                </p>
                {booking.eventName && (
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {booking.eventName}
                  </p>
                )}
              </div>
              <StatusBadge status={booking.status} />
            </div>
          ))
        )}
      </div>
    </GlassCard>
  )
}
