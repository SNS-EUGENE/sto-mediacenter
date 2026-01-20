'use client'

import { useState, useEffect, useCallback } from 'react'
import Sidebar from './Sidebar'
import MobileNav from './MobileNav'
import { cn } from '@/lib/utils'

interface AdminLayoutProps {
  children: React.ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => {
      setMounted(true)
    })
  }, [])

  // STO 세션 keep-alive (전역)
  const keepAlive = useCallback(async () => {
    try {
      const response = await fetch('/api/sto/keepalive', { method: 'POST' })
      const data = await response.json()

      if (data.success) {
        console.log('[Global Keep-alive] 세션 유지:', new Date().toLocaleTimeString())
      } else if (data.needsLogin) {
        console.log('[Global Keep-alive] 로그인 필요')
      }
    } catch {
      // 실패해도 무시 (네트워크 문제 등)
    }
  }, [])

  // 5분마다 keep-alive 실행
  useEffect(() => {
    // 페이지 로드 시 즉시 실행
    keepAlive()

    // 5분마다 실행
    const interval = setInterval(keepAlive, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [keepAlive])

  return (
    <div className="min-h-screen text-white">
      {/* Ambient Background */}
      <div className={cn(
        'ambient-bg',
        mounted && 'with-transition'
      )}>
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
      </div>

      {/* Desktop Sidebar - 항상 열린 상태 */}
      <Sidebar collapsed={false} onToggle={() => {}} mounted={mounted} />

      {/* Main Content */}
      <main
        className={cn(
          'main-content relative z-10 h-screen overflow-hidden',
          mounted && 'with-transition'
        )}
      >
        <div className="h-full p-6 pb-24 lg:p-8 lg:pb-8">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileNav />
    </div>
  )
}
