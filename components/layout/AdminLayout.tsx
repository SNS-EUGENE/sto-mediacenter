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

  // Load sidebar state from localStorage
  useEffect(() => {
    const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true'
    setSidebarCollapsed(isCollapsed)
  }, [])

  const handleToggle = () => {
    const newState = !sidebarCollapsed
    setSidebarCollapsed(newState)
    localStorage.setItem('sidebarCollapsed', String(newState))
  }

  return (
    <div className="min-h-screen text-white">
      {/* Ambient Background */}
      <div className={cn('ambient-bg', sidebarCollapsed && 'sidebar-collapsed')}>
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
      </div>

      {/* Sidebar Toggle Button */}
      <button
        onClick={handleToggle}
        className={cn(
          'sidebar-toggle hidden lg:flex',
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
      </button>

      {/* Desktop Sidebar */}
      <Sidebar collapsed={sidebarCollapsed} onToggle={handleToggle} />

      {/* Main Content */}
      <main
        className={cn(
          'main-content relative z-10 h-screen overflow-hidden',
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
