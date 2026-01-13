import { cn } from '@/lib/utils'

interface StudioBadgeProps {
  studioId: number
  name?: string
  className?: string
}

const studioColors: Record<number, string> = {
  1: 'bg-purple-500/20 text-purple-400 border-purple-500/30', // 대형 스튜디오
  2: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',       // 1인 스튜디오 A
  3: 'bg-pink-500/20 text-pink-400 border-pink-500/30',       // 1인 스튜디오 B
}

const studioNames: Record<number, string> = {
  1: '대형',
  2: '1인 #1',
  3: '1인 #2',
}

export default function StudioBadge({ studioId, name, className }: StudioBadgeProps) {
  const colorClass = studioColors[studioId] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  const displayName = name || studioNames[studioId] || `스튜디오 ${studioId}`

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border',
        colorClass,
        className
      )}
    >
      {displayName}
    </span>
  )
}
