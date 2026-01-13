import { cn } from '@/lib/utils'

interface GlassCardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
}

export default function GlassCard({ children, className, hover = false }: GlassCardProps) {
  return (
    <div
      className={cn(
        'glass-card p-5',
        hover && 'hover:bg-white/[0.06] hover:border-white/10 cursor-pointer transition-all',
        className
      )}
    >
      {children}
    </div>
  )
}
