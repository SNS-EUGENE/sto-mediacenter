'use client'

import { Loader2, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  loading?: boolean
  variant?: 'danger' | 'warning' | 'default'
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = '확인',
  cancelText = '취소',
  loading = false,
  variant = 'default',
}: ConfirmModalProps) {
  if (!isOpen) return null

  const variantStyles = {
    danger: {
      icon: 'bg-red-500/10 text-red-400',
      button: 'bg-red-500 hover:bg-red-600',
    },
    warning: {
      icon: 'bg-yellow-500/10 text-yellow-400',
      button: 'bg-yellow-500 hover:bg-yellow-600',
    },
    default: {
      icon: 'bg-purple-500/10 text-purple-400',
      button: 'bg-purple-500 hover:bg-purple-600',
    },
  }

  const styles = variantStyles[variant]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-[#12121a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-6">
          {/* Icon */}
          <div className={cn('w-12 h-12 rounded-full flex items-center justify-center mb-4', styles.icon)}>
            <AlertTriangle className="w-6 h-6" />
          </div>

          {/* Title */}
          <h3 className="text-lg font-bold text-white mb-2">{title}</h3>

          {/* Message */}
          <p className="text-sm text-gray-400">{message}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10 bg-white/[0.02]">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50',
              styles.button
            )}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
