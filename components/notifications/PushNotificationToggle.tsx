'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/components/providers/AuthProvider'
import {
  requestNotificationPermission,
  unsubscribeFromPush,
  isPushSubscribed,
} from '@/lib/notifications/push'

export default function PushNotificationToggle() {
  const { user } = useAuth()
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (user?.id) {
      checkSubscriptionStatus()
    } else {
      setIsLoading(false)
    }
  }, [user?.id])

  const checkSubscriptionStatus = async () => {
    if (!user?.id) return

    setIsLoading(true)
    try {
      const subscribed = await isPushSubscribed(user.id)
      setIsSubscribed(subscribed)
    } catch (err) {
      console.error('Failed to check subscription:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggle = async () => {
    if (!user?.id) {
      setError('로그인이 필요합니다.')
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      if (isSubscribed) {
        const result = await unsubscribeFromPush(user.id)
        if (result) {
          setIsSubscribed(false)
          setSuccess('푸시 알림이 해제되었습니다.')
        } else {
          setError('알림 해제에 실패했습니다.')
        }
      } else {
        const result = await requestNotificationPermission(user.id)
        if (result) {
          setIsSubscribed(true)
          setSuccess('푸시 알림이 활성화되었습니다!')
        } else {
          setError('알림 권한을 허용해주세요.')
        }
      }
    } catch (err) {
      console.error('Toggle push notification error:', err)
      setError('오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  // 브라우저 지원 여부 확인
  const isSupported = typeof window !== 'undefined' && 'Notification' in window

  if (!isSupported) {
    return (
      <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-400" />
          <div>
            <p className="text-sm font-medium text-yellow-400">푸시 알림 미지원</p>
            <p className="text-xs text-gray-400 mt-1">
              이 브라우저는 푸시 알림을 지원하지 않습니다.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
        <div className="flex items-center gap-3">
          {isSubscribed ? (
            <div className="p-2 rounded-lg bg-green-500/20">
              <Bell className="w-5 h-5 text-green-400" />
            </div>
          ) : (
            <div className="p-2 rounded-lg bg-gray-500/20">
              <BellOff className="w-5 h-5 text-gray-400" />
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-white">푸시 알림</p>
            <p className="text-xs text-gray-400">
              {isSubscribed ? '새 예약 시 알림을 받습니다' : '알림이 꺼져있습니다'}
            </p>
          </div>
        </div>

        <button
          onClick={handleToggle}
          disabled={isLoading}
          className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            isSubscribed
              ? 'bg-gray-500/20 text-gray-300 hover:bg-gray-500/30'
              : 'bg-purple-500 text-white hover:bg-purple-600'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isSubscribed ? (
            '알림 끄기'
          ) : (
            '알림 켜기'
          )}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
          <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
          <p className="text-sm text-green-400">{success}</p>
        </div>
      )}

      {/* iOS 사용자 안내 */}
      {typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && (
        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <p className="text-xs text-blue-400">
            <strong>iOS 사용자:</strong> 푸시 알림을 받으려면 Safari에서 &quot;홈 화면에 추가&quot;를
            통해 앱으로 설치해주세요.
          </p>
        </div>
      )}
    </div>
  )
}
