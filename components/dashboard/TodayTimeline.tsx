'use client'

import GlassCard from '@/components/ui/GlassCard'
import StudioBadge from '@/components/ui/StudioBadge'
import StatusBadge from '@/components/ui/StatusBadge'
import { VALID_TIME_SLOTS, STUDIOS } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface TimelineBooking {
  id: string
  studioId: number
  studioName: string
  startHour: number
  endHour: number
  applicantName: string
  eventName?: string
  status: string
}

interface TodayTimelineProps {
  bookings: TimelineBooking[]
  currentHour?: number
}

export default function TodayTimeline({ bookings, currentHour }: TodayTimelineProps) {
  const now = currentHour ?? new Date().getHours()

  return (
    <GlassCard className="overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">오늘의 일정</h2>
        <span className="text-xs text-gray-500">
          {new Date().toLocaleDateString('ko-KR', {
            month: 'long',
            day: 'numeric',
            weekday: 'short',
          })}
        </span>
      </div>

      <div className="overflow-x-auto scrollbar-thin">
        <div className="min-w-[600px]">
          {/* Time Header */}
          <div className="flex border-b border-white/5 pb-2 mb-2">
            <div className="w-24 flex-shrink-0" />
            {VALID_TIME_SLOTS.map((hour) => (
              <div
                key={hour}
                className={cn(
                  'flex-1 text-center text-xs',
                  hour === now ? 'text-purple-400 font-semibold' : 'text-gray-500'
                )}
              >
                {hour}시
              </div>
            ))}
          </div>

          {/* Studio Rows */}
          {STUDIOS.map((studio) => {
            const studioBookings = bookings.filter((b) => b.studioId === studio.id)

            return (
              <div key={studio.id} className="flex items-center py-2 border-b border-white/5 last:border-0">
                <div className="w-24 flex-shrink-0 pr-2">
                  <StudioBadge studioId={studio.id} name={studio.alias} />
                </div>
                <div className="flex-1 flex relative h-10">
                  {/* Time Slots Background */}
                  {VALID_TIME_SLOTS.map((hour) => (
                    <div
                      key={hour}
                      className={cn(
                        'flex-1 border-r border-white/5 last:border-0',
                        hour === now && 'bg-purple-500/10'
                      )}
                    />
                  ))}

                  {/* Bookings */}
                  {studioBookings.map((booking) => {
                    const startIdx = VALID_TIME_SLOTS.indexOf(booking.startHour)
                    const duration = booking.endHour - booking.startHour
                    const widthPercent = (duration / VALID_TIME_SLOTS.length) * 100
                    const leftPercent = (startIdx / VALID_TIME_SLOTS.length) * 100

                    if (startIdx === -1) return null

                    return (
                      <div
                        key={booking.id}
                        className={cn(
                          'absolute top-1 bottom-1 rounded-md px-2 flex items-center',
                          'bg-gradient-to-r from-purple-500/30 to-pink-500/30 border border-purple-500/20',
                          'text-xs text-white truncate cursor-pointer hover:from-purple-500/40 hover:to-pink-500/40 transition-all'
                        )}
                        style={{
                          left: `${leftPercent}%`,
                          width: `${widthPercent}%`,
                        }}
                        title={`${booking.applicantName} - ${booking.eventName || '예약'}`}
                      >
                        <span className="truncate">{booking.applicantName}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Current Time Indicator */}
      {now >= 9 && now < 18 && (
        <div className="mt-3 flex items-center gap-2 text-xs text-purple-400">
          <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
          <span>현재 시간: {now}시</span>
        </div>
      )}
    </GlassCard>
  )
}
