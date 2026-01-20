// STO 세션 영속화 모듈
// Supabase DB에 세션을 저장하여 서버 재시작 후에도 유지

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { STOSession, STO_CONFIG } from './types'

// Supabase 클라이언트 (service_role 키 사용 - 서버 사이드 전용)
let supabase: SupabaseClient | null = null

function getSupabase(): SupabaseClient | null {
  if (supabase) return supabase

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('[STO Session] Supabase 환경변수 없음 - 세션 영속화 비활성화')
    return null
  }

  supabase = createClient(supabaseUrl, supabaseServiceKey)
  return supabase
}

export interface StoredSession {
  id: number
  cookies: string
  expires_at: string
  last_sync_at: string | null
  last_keepalive_at: string | null
  created_at: string
  updated_at: string
}

/**
 * DB에서 저장된 세션 로드
 */
export async function loadSessionFromDB(): Promise<STOSession | null> {
  const db = getSupabase()
  if (!db) return null

  try {
    const { data, error } = await db
      .from('sto_sessions')
      .select('*')
      .eq('id', 1)
      .single()

    if (error || !data) {
      console.log('[STO Session] DB에 저장된 세션 없음:', error?.message)
      return null
    }

    const stored = data as StoredSession

    // 빈 쿠키면 세션 없음
    if (!stored.cookies || stored.cookies.trim() === '') {
      return null
    }

    // 만료 체크
    const expiresAt = new Date(stored.expires_at)
    if (expiresAt <= new Date()) {
      console.log('[STO Session] 저장된 세션 만료됨')
      return null
    }

    const session: STOSession = {
      cookies: stored.cookies,
      expiresAt,
      isLoggedIn: true,
    }

    console.log('[STO Session] DB에서 세션 로드 완료, 만료:', expiresAt)
    return session
  } catch (err) {
    console.error('[STO Session] DB 로드 오류:', err)
    return null
  }
}

/**
 * 세션을 DB에 저장
 */
export async function saveSessionToDB(session: STOSession): Promise<boolean> {
  const db = getSupabase()
  if (!db) return false

  try {
    const { error } = await db
      .from('sto_sessions')
      .upsert({
        id: 1,
        cookies: session.cookies,
        expires_at: session.expiresAt.toISOString(),
      })

    if (error) {
      console.error('[STO Session] DB 저장 오류:', error.message)
      return false
    }

    console.log('[STO Session] DB에 세션 저장 완료')
    return true
  } catch (err) {
    console.error('[STO Session] DB 저장 예외:', err)
    return false
  }
}

/**
 * 세션 만료 시간 갱신 (keep-alive 후)
 */
export async function extendSessionExpiry(): Promise<boolean> {
  const db = getSupabase()
  if (!db) return false

  const newExpiry = new Date(Date.now() + STO_CONFIG.sessionExpiryMinutes * 60 * 1000)

  try {
    const { error } = await db
      .from('sto_sessions')
      .update({
        expires_at: newExpiry.toISOString(),
        last_keepalive_at: new Date().toISOString(),
      })
      .eq('id', 1)

    if (error) {
      console.error('[STO Session] 만료 갱신 오류:', error.message)
      return false
    }

    console.log('[STO Session] 세션 만료 시간 갱신:', newExpiry)
    return true
  } catch (err) {
    console.error('[STO Session] 만료 갱신 예외:', err)
    return false
  }
}

/**
 * 마지막 동기화 시간 업데이트
 */
export async function updateLastSyncTime(): Promise<boolean> {
  const db = getSupabase()
  if (!db) return false

  try {
    const { error } = await db
      .from('sto_sessions')
      .update({
        last_sync_at: new Date().toISOString(),
      })
      .eq('id', 1)

    if (error) {
      console.error('[STO Session] 동기화 시간 업데이트 오류:', error.message)
      return false
    }

    return true
  } catch (err) {
    console.error('[STO Session] 동기화 시간 업데이트 예외:', err)
    return false
  }
}

/**
 * 마지막 동기화 시간 조회
 */
export async function getLastSyncTime(): Promise<Date | null> {
  const db = getSupabase()
  if (!db) return null

  try {
    const { data, error } = await db
      .from('sto_sessions')
      .select('last_sync_at')
      .eq('id', 1)
      .single()

    if (error || !data?.last_sync_at) {
      return null
    }

    return new Date(data.last_sync_at)
  } catch (err) {
    console.error('[STO Session] 동기화 시간 조회 예외:', err)
    return null
  }
}

/**
 * 세션 무효화 (로그아웃 시)
 */
export async function clearSessionFromDB(): Promise<boolean> {
  const db = getSupabase()
  if (!db) return false

  try {
    const { error } = await db
      .from('sto_sessions')
      .update({
        cookies: '',
        expires_at: new Date().toISOString(),
      })
      .eq('id', 1)

    if (error) {
      console.error('[STO Session] 세션 클리어 오류:', error.message)
      return false
    }

    console.log('[STO Session] DB 세션 클리어 완료')
    return true
  } catch (err) {
    console.error('[STO Session] 세션 클리어 예외:', err)
    return false
  }
}

/**
 * 업무 시간 체크 (09:00 ~ 18:00 KST)
 */
export function isBusinessHours(): boolean {
  const now = new Date()
  // KST = UTC + 9
  const kstHours = (now.getUTCHours() + 9) % 24
  return kstHours >= 9 && kstHours < 18
}

/**
 * 동기화 필요 여부 체크 (마지막 동기화로부터 일정 시간 경과)
 */
export async function shouldSync(intervalMinutes: number = 10): Promise<boolean> {
  const lastSync = await getLastSyncTime()
  if (!lastSync) return true

  const elapsed = (Date.now() - lastSync.getTime()) / (1000 * 60)
  return elapsed >= intervalMinutes
}
