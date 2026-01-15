'use client'

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import { X, Bell, Calendar, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

// 알림 타입
export interface Notification {
  id: string
  type: 'booking' | 'system' | 'warning'
  title: string
  message: string
  timestamp: Date
  read: boolean
  data?: Record<string, unknown>
}

// 컨텍스트 타입
interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  clearNotification: (id: string) => void
  clearAll: () => void
}

const NotificationContext = createContext<NotificationContextType | null>(null)

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider')
  }
  return context
}

// 알림 토스트 컴포넌트
function NotificationToast({
  notification,
  onClose,
}: {
  notification: Notification
  onClose: () => void
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000)
    return () => clearTimeout(timer)
  }, [onClose])

  const iconMap = {
    booking: <Calendar className="w-5 h-5 text-purple-400" />,
    system: <Bell className="w-5 h-5 text-cyan-400" />,
    warning: <Clock className="w-5 h-5 text-yellow-400" />,
  }

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-xl',
        'bg-[#1a1a24]/95 backdrop-blur-xl border border-white/10',
        'shadow-xl shadow-black/30',
        'animate-in slide-in-from-right-full fade-in duration-300'
      )}
    >
      <div className="flex-shrink-0 mt-0.5">
        {iconMap[notification.type]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white text-sm">{notification.title}</p>
        <p className="text-gray-400 text-xs mt-1">{notification.message}</p>
      </div>
      <button
        onClick={onClose}
        className="flex-shrink-0 p-1 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [toasts, setToasts] = useState<Notification[]>([])

  // 읽지 않은 알림 수
  const unreadCount = notifications.filter((n) => !n.read).length

  // 알림 추가
  const addNotification = useCallback(
    (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
      const newNotification: Notification = {
        ...notification,
        id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        read: false,
      }

      setNotifications((prev) => [newNotification, ...prev].slice(0, 50)) // 최대 50개 유지
      setToasts((prev) => [...prev, newNotification])

      // 알림음 재생 (설정에서 활성화된 경우)
      const notifySound = localStorage.getItem('sto_notify_sound')
      if (notifySound !== 'false') {
        try {
          const audio = new Audio('/sounds/notification.mp3')
          audio.volume = 0.5
          audio.play().catch(() => {})
        } catch {
          // 알림음 재생 실패 무시
        }
      }
    },
    []
  )

  // 읽음 처리
  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
  }, [])

  // 전체 읽음 처리
  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [])

  // 알림 삭제
  const clearNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  // 전체 삭제
  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])

  // 토스트 닫기
  const closeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotification,
        clearAll,
      }}
    >
      {children}

      {/* 토스트 컨테이너 */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
        {toasts.slice(-3).map((toast) => (
          <NotificationToast
            key={toast.id}
            notification={toast}
            onClose={() => closeToast(toast.id)}
          />
        ))}
      </div>
    </NotificationContext.Provider>
  )
}
