import { cn } from '@/lib/utils'

interface GlassCardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  id?: string
}

export default function GlassCard({ children, className, hover = false, id }: GlassCardProps) {
  return (
    <div
      id={id}
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
