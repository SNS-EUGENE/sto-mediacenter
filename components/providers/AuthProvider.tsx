'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { usePathname, useRouter } from 'next/navigation'

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
const PUBLIC_PATHS = ['/kiosk', '/login', '/auth/callback']

// 개발 모드 확인
const isDev = process.env.NODE_ENV === 'development'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(!isDev) // 개발 모드에서는 로딩 없이 바로 시작
  const pathname = usePathname()
  const router = useRouter()

  // 공개 페이지 여부 확인
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path))

  useEffect(() => {
    // 개발 모드에서는 인증 체크 스킵
    if (isDev) {
      return
    }

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

  // 인증 필요 페이지에서 미인증 시 리다이렉트 (프로덕션만)
  useEffect(() => {
    if (isDev) return // 개발 모드에서는 리다이렉트 안함

    if (!loading && !user && !isPublicPath) {
      router.push('/login')
    }
  }, [loading, user, isPublicPath, router])

  // 로그아웃
  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // 개발 모드에서는 로딩 화면 없이 바로 렌더링
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
