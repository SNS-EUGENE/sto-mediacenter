// Supabase 인증 관련 유틸리티
import { supabase } from './client'

// 화이트리스트 사용자 (환경변수 또는 DB에서 관리 권장)
// 실제 운영 시 Supabase 테이블로 이동
const WHITELIST_EMAILS = [
  'admin@koreansns.co.kr',
  'manager@koreansns.co.kr',
  // 추가 이메일...
]

/**
 * 이메일 로그인 (Magic Link)
 */
export async function signInWithEmail(email: string) {
  // 화이트리스트 확인
  if (!isEmailWhitelisted(email)) {
    return { error: { message: '접근 권한이 없는 이메일입니다.' } }
  }

  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  })

  return { data, error }
}

/**
 * 이메일/비밀번호 로그인
 */
export async function signInWithPassword(email: string, password: string) {
  // 화이트리스트 확인
  if (!isEmailWhitelisted(email)) {
    return { error: { message: '접근 권한이 없는 이메일입니다.' } }
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  return { data, error }
}

/**
 * 로그아웃
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  return { error }
}

/**
 * 현재 사용자 정보 가져오기
 */
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  return { user, error }
}

/**
 * 세션 가져오기
 */
export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession()
  return { session, error }
}

/**
 * 화이트리스트 확인
 */
export function isEmailWhitelisted(email: string): boolean {
  // 개발 환경에서는 모든 이메일 허용
  if (process.env.NODE_ENV === 'development') {
    return true
  }
  return WHITELIST_EMAILS.includes(email.toLowerCase())
}

/**
 * 인증 상태 변경 리스너
 */
export function onAuthStateChange(
  callback: (event: string, session: unknown) => void
) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      callback(event, session)
    }
  )
  return subscription
}
