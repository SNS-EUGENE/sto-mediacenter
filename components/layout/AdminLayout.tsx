'use client'

import { useState, useEffect } from 'react'
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
