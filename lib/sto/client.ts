// STO 예약 시스템 클라이언트
// 웹 스크래핑 기반 예약 정보 수집

import {
  STOCredentials,
  STOSession,
  STOBookingListItem,
  STOBookingDetail,
  STO_CONFIG,
} from './types'
import { parseBookingList, parseBookingDetail, parseTotalCount, parseTotalPages } from './parser'

// 세션 저장소 (메모리 기반)
let currentSession: STOSession | null = null

/**
 * STO 시스템 로그인
 * NOTE: 이 시스템은 2단계 인증(이메일 인증코드)을 사용합니다.
 * 실제 운영에서는 이메일 인증코드를 수동으로 입력해야 합니다.
 */
export async function loginToSTO(
  credentials: STOCredentials,
  verificationCode?: string
): Promise<{ success: boolean; needsVerification?: boolean; session?: STOSession; error?: string }> {
  try {
    console.log('[STO] 로그인 시도:', credentials.email)

    // 1단계: 로그인 페이지 접속하여 세션 쿠키 획득
    const loginPageResponse = await fetch(`${STO_CONFIG.baseUrl}${STO_CONFIG.loginPath}`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })

    let cookies = loginPageResponse.headers.get('set-cookie') || ''

    // 2단계: 로그인 폼 제출
    const formData = new URLSearchParams()
    formData.append('userId', credentials.email)
    formData.append('userPwd', credentials.password)
    if (verificationCode) {
      formData.append('authCode', verificationCode)
    }

    const loginResponse = await fetch(`${STO_CONFIG.baseUrl}${STO_CONFIG.loginActionPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Cookie': cookies,
      },
      body: formData.toString(),
      redirect: 'manual',
    })

    // 쿠키 업데이트
    const newCookies = loginResponse.headers.get('set-cookie')
    if (newCookies) {
      cookies = newCookies
    }

    // 응답 분석
    const responseText = await loginResponse.text()

    // 인증코드 필요 여부 확인
    if (responseText.includes('인증코드') || responseText.includes('인증 코드')) {
      return { success: false, needsVerification: true }
    }

    // 로그인 성공 여부 확인 (리다이렉트 또는 dashboard 접근)
    if (loginResponse.status === 302 || responseText.includes('dashboard')) {
      const session: STOSession = {
        cookies,
        expiresAt: new Date(Date.now() + STO_CONFIG.sessionExpiryMinutes * 60 * 1000),
        isLoggedIn: true,
      }
      currentSession = session
      console.log('[STO] 로그인 성공')
      return { success: true, session }
    }

    // 로그인 실패
    return { success: false, error: '로그인에 실패했습니다. 아이디와 비밀번호를 확인하세요.' }
  } catch (error) {
    console.error('[STO] 로그인 오류:', error)
    return { success: false, error: `로그인 오류: ${error}` }
  }
}

/**
 * 세션 유효성 검사
 */
export function isSessionValid(): boolean {
  if (!currentSession) return false
  if (!currentSession.isLoggedIn) return false
  return new Date() < currentSession.expiresAt
}

/**
 * 현재 세션 반환
 */
export function getCurrentSession(): STOSession | null {
  return currentSession
}

/**
 * 세션 설정 (외부에서 쿠키 설정 시)
 */
export function setSession(session: STOSession): void {
  currentSession = session
}

/**
 * 세션 클리어
 */
export function clearSession(): void {
  currentSession = null
}

/**
 * 예약 목록 페이지 가져오기
 */
export async function fetchBookingListPage(page: number = 1): Promise<{
  html: string
  success: boolean
  error?: string
}> {
  if (!isSessionValid()) {
    return { html: '', success: false, error: '유효하지 않은 세션입니다.' }
  }

  try {
    const url = `${STO_CONFIG.baseUrl}${STO_CONFIG.listPath}?searchAditAt=Y&curPage=${page}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Cookie': currentSession!.cookies,
      },
    })

    // 세션 만료 체크 (로그인 페이지로 리다이렉트)
    if (response.url.includes('login') || response.url.includes('logout')) {
      currentSession!.isLoggedIn = false
      return { html: '', success: false, error: '세션이 만료되었습니다.' }
    }

    const html = await response.text()
    return { html, success: true }
  } catch (error) {
    console.error('[STO] 목록 조회 오류:', error)
    return { html: '', success: false, error: `조회 오류: ${error}` }
  }
}

/**
 * 예약 상세 페이지 가져오기
 */
export async function fetchBookingDetailPage(reqstSn: string): Promise<{
  html: string
  success: boolean
  error?: string
}> {
  if (!isSessionValid()) {
    return { html: '', success: false, error: '유효하지 않은 세션입니다.' }
  }

  try {
    const url = `${STO_CONFIG.baseUrl}${STO_CONFIG.detailPath}?reqstSn=${reqstSn}&searchAditAt=Y`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Cookie': currentSession!.cookies,
      },
    })

    // 세션 만료 체크
    if (response.url.includes('login') || response.url.includes('logout')) {
      currentSession!.isLoggedIn = false
      return { html: '', success: false, error: '세션이 만료되었습니다.' }
    }

    const html = await response.text()
    return { html, success: true }
  } catch (error) {
    console.error('[STO] 상세 조회 오류:', error)
    return { html: '', success: false, error: `조회 오류: ${error}` }
  }
}

/**
 * 전체 예약 목록 가져오기 (페이지네이션 처리)
 */
export async function fetchAllBookings(maxPages: number = 10): Promise<{
  bookings: STOBookingListItem[]
  totalCount: number
  success: boolean
  error?: string
}> {
  const allBookings: STOBookingListItem[] = []

  // 첫 페이지 조회
  const firstPageResult = await fetchBookingListPage(1)
  if (!firstPageResult.success) {
    return { bookings: [], totalCount: 0, success: false, error: firstPageResult.error }
  }

  const totalCount = parseTotalCount(firstPageResult.html)
  const totalPages = parseTotalPages(firstPageResult.html, totalCount)
  const pagesToFetch = Math.min(totalPages, maxPages)

  console.log(`[STO] 총 ${totalCount}건, ${totalPages} 페이지 중 ${pagesToFetch} 페이지 조회`)

  // 첫 페이지 파싱
  const firstPageBookings = parseBookingList(firstPageResult.html)
  allBookings.push(...firstPageBookings)

  // 나머지 페이지 조회
  for (let page = 2; page <= pagesToFetch; page++) {
    const pageResult = await fetchBookingListPage(page)
    if (!pageResult.success) {
      console.error(`[STO] ${page} 페이지 조회 실패:`, pageResult.error)
      continue
    }

    const pageBookings = parseBookingList(pageResult.html)
    allBookings.push(...pageBookings)

    // 요청 간 딜레이 (서버 부하 방지)
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  console.log(`[STO] 총 ${allBookings.length}건 조회 완료`)

  return { bookings: allBookings, totalCount, success: true }
}

/**
 * 예약 상세 정보 가져오기
 */
export async function fetchBookingDetail(
  reqstSn: string,
  listItem?: STOBookingListItem
): Promise<{
  detail: STOBookingDetail | null
  success: boolean
  error?: string
}> {
  const pageResult = await fetchBookingDetailPage(reqstSn)
  if (!pageResult.success) {
    return { detail: null, success: false, error: pageResult.error }
  }

  // 목록 아이템이 없으면 기본값 생성
  const baseItem: STOBookingListItem = listItem || {
    reqstSn,
    rowNumber: 0,
    facilityName: '',
    participantsCount: 0,
    rentalDate: '',
    timeSlots: [],
    applicantName: '',
    organization: '',
    phone: '',
    status: 'PENDING',
    cancelDate: null,
    specialNote: '',
    createdAt: '',
  }

  const detail = parseBookingDetail(pageResult.html, baseItem)
  return { detail, success: true }
}
