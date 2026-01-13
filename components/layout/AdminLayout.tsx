'use client'

import { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import MobileNav from './MobileNav'
import { cn } from '@/lib/utils'

interface AdminLayoutProps {
  children: React.ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Load sidebar state - 일시적으로 항상 펼침 상태 유지
  useEffect(() => {
    // const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true'
    // setSidebarCollapsed(isCollapsed)
    setSidebarCollapsed(false) // 항상 펼침
    requestAnimationFrame(() => {
      setMounted(true)
    })
  }, [])

  const handleToggle = () => {
    const newState = !sidebarCollapsed
    setSidebarCollapsed(newState)
    localStorage.setItem('sidebarCollapsed', String(newState))
  }

  return (
    <div className="min-h-screen text-white">
      {/* Ambient Background */}
      <div className={cn(
        'ambient-bg',
        mounted && 'with-transition',
        sidebarCollapsed && 'sidebar-collapsed'
      )}>
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
      </div>

      {/* Sidebar Toggle Button - 일시 비활성화 */}
      {/* <button
        onClick={handleToggle}
        className={cn(
          'sidebar-toggle hidden lg:flex',
          mounted && 'with-transition',
          sidebarCollapsed && 'collapsed'
        )}
      >
        <svg
          className="w-3 h-3 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          style={{ transform: sidebarCollapsed ? 'rotate(180deg)' : 'none' }}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button> */}

      {/* Desktop Sidebar */}
      <Sidebar collapsed={sidebarCollapsed} onToggle={handleToggle} mounted={mounted} />

      {/* Main Content */}
      <main
        className={cn(
          'main-content relative z-10 h-screen overflow-hidden',
          mounted && 'with-transition',
          sidebarCollapsed && 'sidebar-collapsed'
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
