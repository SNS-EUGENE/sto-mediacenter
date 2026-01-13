'use client'

import GlassCard from '@/components/ui/GlassCard'
import { cn } from '@/lib/utils'
import { STUDIOS } from '@/lib/constants'

interface StudioStats {
  studioId: number
  totalBookings: number
  totalHours: number
  utilizationRate: number
}

interface StudioUtilizationProps {
  stats: StudioStats[]
  period: string
}

const studioGradients: Record<number, string> = {
  1: 'from-purple-500 to-purple-600',
  2: 'from-cyan-500 to-cyan-600',
  3: 'from-pink-500 to-pink-600',
}

export default function StudioUtilization({ stats, period }: StudioUtilizationProps) {
  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">스튜디오 가동률</h2>
        <span className="text-xs text-gray-500">{period}</span>
      </div>

      <div className="space-y-4">
        {STUDIOS.map((studio) => {
          const stat = stats.find((s) => s.studioId === studio.id)
          const rate = stat?.utilizationRate || 0
          const gradient = studioGradients[studio.id] || 'from-gray-500 to-gray-600'

          return (
            <div key={studio.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">{studio.alias}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">
                    {stat?.totalBookings || 0}건 / {stat?.totalHours || 0}시간
                  </span>
                  <span className="text-sm font-semibold text-white">
                    {rate.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full bg-gradient-to-r transition-all duration-500',
                    gradient
                  )}
                  style={{ width: `${Math.min(rate, 100)}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-white/5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">전체 평균</span>
          <span className="font-semibold text-white">
            {stats.length > 0
              ? (stats.reduce((sum, s) => sum + s.utilizationRate, 0) / stats.length).toFixed(1)
              : 0}%
          </span>
        </div>
      </div>
    </GlassCard>
  )
}
