import { cn } from '@/lib/utils'
import { BOOKING_STATUS_LABELS, EQUIPMENT_STATUS_LABELS } from '@/lib/constants'

type BadgeType = 'booking' | 'equipment'

interface StatusBadgeProps {
  status: string
  type?: BadgeType
  className?: string
}

const bookingStatusColors: Record<string, string> = {
  APPLIED: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  PENDING: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  CONFIRMED: 'bg-green-500/20 text-green-400 border-green-500/30',
  IN_USE: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  DONE: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  CANCELLED: 'bg-red-500/20 text-red-400 border-red-500/30',
}

const equipmentStatusColors: Record<string, string> = {
  NORMAL: 'bg-green-500/20 text-green-400 border-green-500/30',
  BROKEN: 'bg-red-500/20 text-red-400 border-red-500/30',
  MALFUNCTION: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  REPAIRING: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  REPAIRED: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
}

export default function StatusBadge({ status, type = 'booking', className }: StatusBadgeProps) {
  const labels = type === 'booking' ? BOOKING_STATUS_LABELS : EQUIPMENT_STATUS_LABELS
  const colors = type === 'booking' ? bookingStatusColors : equipmentStatusColors

  const label = labels[status] || status
  const colorClass = colors[status] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border',
        colorClass,
        className
      )}
    >
      {label}
    </span>
  )
}
