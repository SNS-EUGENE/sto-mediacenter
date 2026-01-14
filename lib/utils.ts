import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
  }).format(amount)
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d)
}

export function formatShortDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
  }).format(d)
}

export function parseTimeSlots(timeStr: string): number[] {
  // "09:00~10:00, 10:00~11:00" -> [9, 10]
  const slots: number[] = []
  const parts = timeStr.split(',').map(s => s.trim())

  for (const part of parts) {
    const match = part.match(/(\d{2}):00/)
    if (match) {
      slots.push(parseInt(match[1], 10))
    }
  }

  return slots
}

export function timeSlotsToString(slots: number[]): string {
  if (slots.length === 0) return ''

  const sorted = [...slots].sort((a, b) => a - b)
  const start = sorted[0]
  const end = sorted[sorted.length - 1] + 1

  return `${start.toString().padStart(2, '0')}:00 ~ ${end.toString().padStart(2, '0')}:00`
}

export function getStatusColor(status: string): {
  bg: string
  text: string
  border: string
} {
  switch (status) {
    case 'APPLIED':
    case '예약신청':
      return {
        bg: 'bg-slate-500/20',
        text: 'text-slate-400',
        border: 'border-slate-500/30',
      }
    case 'PENDING':
    case '승인대기':
      return {
        bg: 'bg-amber-500/20',
        text: 'text-amber-400',
        border: 'border-amber-500/30',
      }
    case 'CONFIRMED':
    case '대관확정':
      return {
        bg: 'bg-emerald-500/20',
        text: 'text-emerald-400',
        border: 'border-emerald-500/30',
      }
    case 'IN_USE':
    case '사용중':
      return {
        bg: 'bg-blue-500/20',
        text: 'text-blue-400',
        border: 'border-blue-500/30',
      }
    case 'DONE':
    case '완료':
      return {
        bg: 'bg-gray-500/20',
        text: 'text-gray-400',
        border: 'border-gray-500/30',
      }
    case 'CANCELLED':
    case '예약취소':
      return {
        bg: 'bg-rose-500/20',
        text: 'text-rose-400',
        border: 'border-rose-500/30',
      }
    default:
      return {
        bg: 'bg-white/10',
        text: 'text-white/60',
        border: 'border-white/20',
      }
  }
}

export function getEquipmentStatusColor(status: string): {
  bg: string
  text: string
} {
  switch (status) {
    case 'NORMAL':
    case '정상':
      return { bg: 'bg-emerald-500/20', text: 'text-emerald-400' }
    case 'BROKEN':
    case '파손':
      return { bg: 'bg-rose-500/20', text: 'text-rose-400' }
    case 'MALFUNCTION':
    case '고장':
      return { bg: 'bg-orange-500/20', text: 'text-orange-400' }
    case 'REPAIRING':
    case '수리중':
      return { bg: 'bg-amber-500/20', text: 'text-amber-400' }
    case 'REPAIRED':
    case '수리완료':
      return { bg: 'bg-blue-500/20', text: 'text-blue-400' }
    default:
      return { bg: 'bg-white/10', text: 'text-white/60' }
  }
}

export function getStudioId(studioName: string): number {
  if (studioName.includes('대형') || studioName.includes('메인')) return 1
  // 1인 스튜디오 A
  if (studioName.includes('1인') && (studioName.includes('#1') || studioName.includes('A'))) return 3
  // 1인 스튜디오 B
  if (studioName.includes('1인') && (studioName.includes('#2') || studioName.includes('B'))) return 4
  return 1
}

export function getStudioName(studioId: number): string {
  switch (studioId) {
    case 1: return '메인 스튜디오'
    case 3: return '1인 스튜디오 A'
    case 4: return '1인 스튜디오 B'
    default: return '알 수 없음'
  }
}
