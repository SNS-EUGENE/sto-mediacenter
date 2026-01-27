'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { X, Target, Settings, Tv, LogOut, ClipboardCheck } from 'lucide-react'
import { useAuth } from '@/components/providers/AuthProvider'

export default function MobileNav() {
  const pathname = usePathname()
  const [showMore, setShowMore] = useState(false)
  const { user, signOut } = useAuth()

  const mainNavItems = [
    {
      href: '/',
      label: '홈',
      icon: (
        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"/>
        </svg>
      ),
    },
    {
      href: '/bookings',
      label: '예약',
      icon: (
        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
        </svg>
      ),
    },
    {
      href: '/calendar',
      label: '캘린더',
      icon: (
        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>
      ),
    },
    {
      href: '/statistics',
      label: '통계',
      icon: (
        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
        </svg>
      ),
    },
  ]

  const moreNavItems = [
    { href: '/equipments', label: '장비 관리', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg> },
    { href: '/live', label: '실시간 현황', icon: <Tv className="w-5 h-5" /> },
    { href: '/surveys', label: '만족도조사', icon: <ClipboardCheck className="w-5 h-5" /> },
    { href: '/kpi', label: 'KPI 관리', icon: <Target className="w-5 h-5" /> },
    { href: '/settings', label: '설정', icon: <Settings className="w-5 h-5" /> },
  ]

  const isMoreActive = moreNavItems.some(item => pathname === item.href)

  return (
    <>
      {/* More Menu Overlay */}
      {showMore && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setShowMore(false)}>
          <div
            className="absolute bottom-20 left-4 right-4 bg-[#1a1a24]/95 backdrop-blur-xl rounded-2xl border border-white/10 p-2 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-3 py-2 mb-1">
              <span className="text-sm font-medium text-white">더보기</span>
              <button onClick={() => setShowMore(false)} className="p-1 rounded-lg hover:bg-white/10">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1">
              {moreNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setShowMore(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-3 rounded-xl transition-colors',
                    pathname === item.href
                      ? 'bg-purple-500/20 text-purple-400'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  )}
                >
                  {item.icon}
                  <span className="text-sm">{item.label}</span>
                </Link>
              ))}
            </div>
            {/* 로그아웃 버튼 */}
            {user && (
              <div className="mt-2 pt-2 border-t border-white/10">
                <button
                  onClick={() => {
                    setShowMore(false)
                    signOut()
                  }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="text-sm">로그아웃</span>
                  <span className="ml-auto text-xs text-gray-500 truncate max-w-[120px]">
                    {user.email}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
        <div className="mobile-nav">
          <div className="flex items-center justify-around px-1 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
            {mainNavItems.map((item) => {
              const isActive = pathname === item.href

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'nav-tab',
                    isActive && 'active'
                  )}
                >
                  {item.icon}
                  <span className="text-[10px] font-medium">{item.label}</span>
                </Link>
              )
            })}
            {/* More Button */}
            <button
              onClick={() => setShowMore(true)}
              className={cn(
                'nav-tab',
                isMoreActive && 'active'
              )}
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
              <span className="text-[10px] font-medium">더보기</span>
            </button>
          </div>
        </div>
      </nav>
    </>
  )
}
