'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('인증 처리 중...')

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // URL에서 인증 코드 추출
        const code = searchParams.get('code')
        const errorDescription = searchParams.get('error_description')

        if (errorDescription) {
          throw new Error(errorDescription)
        }

        if (code) {
          // 인증 코드로 세션 교환
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) throw error
        }

        // 세션 확인
        const { data: { session } } = await supabase.auth.getSession()

        if (session) {
          setStatus('success')
          setMessage('로그인 성공! 대시보드로 이동합니다...')
          setTimeout(() => router.push('/'), 1500)
        } else {
          throw new Error('세션을 생성할 수 없습니다')
        }
      } catch (error) {
        console.error('Auth callback error:', error)
        setStatus('error')
        setMessage(error instanceof Error ? error.message : '인증에 실패했습니다')
      }
    }

    handleAuthCallback()
  }, [router, searchParams])

  return (
    <div className="relative z-10 w-full max-w-md text-center">
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8">
        {status === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">인증 처리 중</h2>
            <p className="text-gray-400">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-6 h-6 text-green-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">로그인 성공</h2>
            <p className="text-gray-400">{message}</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-6 h-6 text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">인증 실패</h2>
            <p className="text-gray-400 mb-4">{message}</p>
            <button
              onClick={() => router.push('/login')}
              className="px-6 py-2 rounded-xl bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors"
            >
              로그인 페이지로 돌아가기
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="relative z-10 w-full max-w-md text-center">
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8">
        <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">인증 처리 중</h2>
        <p className="text-gray-400">잠시만 기다려주세요...</p>
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center p-4">
      {/* Ambient Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-violet-500/30 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-500/30 blur-[120px]" />
      </div>

      <Suspense fallback={<LoadingFallback />}>
        <AuthCallbackContent />
      </Suspense>
    </div>
  )
}
