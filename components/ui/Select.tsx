'use client'

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown, Check } from 'lucide-react'

export interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  className?: string
}

export default function Select({
  value,
  onChange,
  options,
  placeholder = '선택',
  className,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [alignRight, setAlignRight] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find((opt) => opt.value === value)

  // 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ESC 키로 닫기
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // 드롭다운 위치 자동 감지 - 열기 전에 컨테이너 위치로 판단
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect()
      const viewportWidth = window.innerWidth

      // 컨테이너가 화면 오른쪽 절반에 있으면 오른쪽 정렬
      const isOnRightSide = containerRect.right > viewportWidth / 2
      setAlignRight(isOnRightSide)
    }
  }, [isOpen])

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center justify-between gap-2 w-full',
          'px-3 py-2.5 rounded-xl text-sm',
          'bg-white/5 border border-white/10',
          'text-white transition-all',
          'hover:bg-white/[0.07] hover:border-white/15',
          'focus:outline-none focus:border-purple-500/50',
          isOpen && 'border-purple-500/50 bg-white/[0.07]'
        )}
      >
        <span className={cn(!selectedOption && 'text-gray-500')}>
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-gray-400 transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className={cn(
            'absolute z-50 mt-2 min-w-[140px]',
            'py-1.5 rounded-xl',
            'bg-[#1a1a24]/95 backdrop-blur-xl',
            'border border-white/10',
            'shadow-xl shadow-black/30',
            'animate-in fade-in-0 zoom-in-95 duration-150',
            'max-h-[240px] overflow-y-auto scrollbar-thin',
            alignRight ? 'right-0' : 'left-0'
          )}
        >
          {options.map((option) => {
            const isSelected = option.value === value

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value)
                  setIsOpen(false)
                }}
                className={cn(
                  'flex items-center justify-between w-full px-3 py-2 text-sm',
                  'transition-colors',
                  isSelected
                    ? 'text-purple-400 bg-purple-500/10'
                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                )}
              >
                <span>{option.label}</span>
                {isSelected && <Check className="w-4 h-4" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
