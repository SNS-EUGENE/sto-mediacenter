'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { usePathname, useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

// 인증이 필요 없는 경로
const PUBLIC_PATHS = ['/kiosk', '/live', '/login', '/auth/callback']

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const pathname = usePathname()
  const router = useRouter()

  // 공개 페이지 여부 확인
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path))

  useEffect(() => {
    // 초기 세션 확인
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setSession(session)
        setUser(session?.user ?? null)
      } catch (error) {
        console.error('Auth init error:', error)
      } finally {
        setLoading(false)
      }
    }

    initAuth()

    // 인증 상태 변경 리스너
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // 인증 필요 페이지에서 미인증 시 리다이렉트
  useEffect(() => {
    if (!loading && !user && !isPublicPath) {
      router.push('/login')
    }

    // 로그인 된 상태에서 로그인 페이지 접근 시
    if (!loading && user && pathname === '/login') {
      router.push('/')
    }
  }, [loading, user, isPublicPath, pathname, router])

  // 로그아웃
  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // 공개 페이지는 로딩 화면 없이 바로 렌더링
  if (isPublicPath) {
    return (
      <AuthContext.Provider
        value={{
          user,
          session,
          loading,
          signOut: handleSignOut,
        }}
      >
        {children}
      </AuthContext.Provider>
    )
  }

  // 인증 필요 페이지에서 로딩 중일 때
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-violet-500/30 blur-[120px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-500/30 blur-[120px]" />
        </div>
        <div className="relative z-10 text-center">
          <Loader2 className="w-10 h-10 text-purple-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">인증 확인 중...</p>
        </div>
      </div>
    )
  }

  // 미인증 상태에서 보호된 페이지 접근 시 (리다이렉트 전까지 빈 화면)
  if (!user && !isPublicPath) {
    return null
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signOut: handleSignOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
