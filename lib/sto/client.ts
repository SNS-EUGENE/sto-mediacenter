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
import { loadSessionFromDB, saveSessionToDB, clearSessionFromDB } from './session-store'

// 세션 저장소 (메모리 기반 + DB 영속화)
let currentSession: STOSession | null = null
let sessionLoadedFromDB = false

// 임시 저장소 (인증 과정에서 사용)
let pendingCredentials: { empId: string; password: string; userEmail: string; cookies: string } | null = null

/**
 * STO 시스템 로그인 - 1단계: 인증코드 요청
 * 아이디/비밀번호 확인 후 이메일로 인증코드 발송
 */
export async function requestVerificationCode(
  credentials: STOCredentials
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[STO] 인증코드 요청 시작:', credentials.email)

    // 1단계: 로그인 페이지 접속하여 세션 쿠키 획득
    const loginPageResponse = await fetch(`${STO_CONFIG.baseUrl}${STO_CONFIG.loginPath}`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
    })

    // set-cookie 헤더에서 쿠키 추출 (여러 개일 수 있음)
    const setCookieHeader = loginPageResponse.headers.get('set-cookie') || ''
    // JSESSIONID 추출
    const sessionMatch = setCookieHeader.match(/JSESSIONID=([^;]+)/)
    let cookies = sessionMatch ? `JSESSIONID=${sessionMatch[1]}` : ''

    console.log('[STO] 로그인 페이지 접속')
    console.log('[STO] set-cookie 헤더:', setCookieHeader)
    console.log('[STO] 추출된 쿠키:', cookies)

    // 2단계: 아이디/비밀번호 확인 및 인증코드 발송 요청
    // 필드명: empId, password (STO 시스템 기준)
    const formData = new URLSearchParams()
    formData.append('empId', credentials.email)
    formData.append('password', credentials.password)

    console.log('[STO] idPwChk 요청 전송...')
    const response = await fetch(`${STO_CONFIG.baseUrl}/sto3788/loginout/idPwChk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Cookie': cookies,
        'Referer': `${STO_CONFIG.baseUrl}${STO_CONFIG.loginPath}`,
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
      },
      body: formData.toString(),
      redirect: 'manual',
    })

    // 쿠키 업데이트
    const newCookies = response.headers.get('set-cookie')
    if (newCookies) {
      const newSessionMatch = newCookies.match(/JSESSIONID=([^;]+)/)
      if (newSessionMatch) {
        cookies = `JSESSIONID=${newSessionMatch[1]}`
      }
    }

    console.log('[STO] idPwChk 응답 상태:', response.status)
    console.log('[STO] idPwChk 응답 location:', response.headers.get('location'))

    // 302 리다이렉트면 세션 문제
    if (response.status === 302) {
      const location = response.headers.get('location') || ''
      if (location.includes('logout') || location.includes('login')) {
        console.log('[STO] 세션 문제로 리다이렉트됨')
        return { success: false, error: '세션 연결에 실패했습니다. 다시 시도해주세요.' }
      }
    }

    const responseText = await response.text()
    console.log('[STO] idPwChk 응답 길이:', responseText.length)
    console.log('[STO] idPwChk 응답 미리보기:', responseText.substring(0, 200))

    // JSON 응답 파싱 시도
    try {
      const data = JSON.parse(responseText)

      if (data.status === 'success' || data.result === 'success' || data.success === true) {
        // 인증코드 발송 성공 - 자격증명 임시 저장
        // data.data에 사용자 이메일이 포함됨
        const userEmail = data.data || data.emgEmail || data.email || ''
        pendingCredentials = { empId: credentials.email, password: credentials.password, userEmail, cookies }
        console.log('[STO] 인증코드 발송 성공, 이메일:', userEmail)
        return { success: true }
      } else {
        // 로그인 실패 (아이디/비밀번호 오류)
        const errorMsg = data.message || data.msg || '아이디 또는 비밀번호가 올바르지 않습니다.'
        console.log('[STO] 인증코드 요청 실패:', errorMsg, 'data:', data)
        return { success: false, error: errorMsg }
      }
    } catch {
      // JSON이 아닌 경우 텍스트로 판단
      if (responseText.includes('success') || responseText.includes('발송')) {
        pendingCredentials = { empId: credentials.email, password: credentials.password, userEmail: '', cookies }
        return { success: true }
      }
      console.log('[STO] 응답 파싱 실패:', responseText)
      return { success: false, error: '서버 응답을 처리할 수 없습니다.' }
    }
  } catch (error) {
    console.error('[STO] 인증코드 요청 오류:', error)
    return { success: false, error: `오류 발생: ${error}` }
  }
}

/**
 * STO 시스템 로그인 - 2단계: 인증코드 확인 및 로그인 완료
 */
export async function verifyCodeAndLogin(
  verificationCode: string
): Promise<{ success: boolean; session?: STOSession; error?: string }> {
  if (!pendingCredentials) {
    return { success: false, error: '먼저 인증코드를 요청하세요.' }
  }

  try {
    console.log('[STO] 인증코드 확인 시도')

    // 필드명: email, inputCode, chk (STO 시스템 기준)
    const formData = new URLSearchParams()
    formData.append('email', pendingCredentials.userEmail)
    formData.append('inputCode', verificationCode)
    formData.append('chk', 'login')

    const response = await fetch(`${STO_CONFIG.baseUrl}/sto3788/loginout/certification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Cookie': pendingCredentials.cookies,
        'Referer': `${STO_CONFIG.baseUrl}${STO_CONFIG.loginPath}`,
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
      },
      body: formData.toString(),
    })

    // 쿠키 업데이트 - JSESSIONID 추출
    let cookies = pendingCredentials.cookies
    const newCookies = response.headers.get('set-cookie')
    console.log('[STO] certification set-cookie:', newCookies)
    if (newCookies) {
      const sessionMatch = newCookies.match(/JSESSIONID=([^;]+)/)
      if (sessionMatch) {
        cookies = `JSESSIONID=${sessionMatch[1]}`
        console.log('[STO] certification 후 쿠키 업데이트:', cookies)
      }
    }

    const responseText = await response.text()
    console.log('[STO] certification 응답:', responseText)

    try {
      const data = JSON.parse(responseText)

      if (data.status === 'success' || data.result === 'success' || data.success === true) {
        // 인증 성공 - 이제 실제 로그인 폼 제출
        console.log('[STO] 인증 성공! 로그인 폼 제출 중...')

        // 로그인 폼 제출 (form-login submit)
        // 실제 브라우저에서 전송하는 필드: emgEmail, userId, password, saveId
        const loginFormData = new URLSearchParams()
        loginFormData.append('emgEmail', pendingCredentials.userEmail)
        loginFormData.append('userId', pendingCredentials.empId)
        loginFormData.append('password', pendingCredentials.password)
        loginFormData.append('saveId', 'Y')

        let loginResponse = await fetch(`${STO_CONFIG.baseUrl}${STO_CONFIG.loginActionPath}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Cookie': cookies,
            'Referer': `${STO_CONFIG.baseUrl}${STO_CONFIG.loginPath}`,
          },
          body: loginFormData.toString(),
          redirect: 'manual',
        })

        // 로그인 응답에서 쿠키 업데이트
        let loginCookies = loginResponse.headers.get('set-cookie')
        console.log('[STO] loginAction set-cookie:', loginCookies)
        if (loginCookies) {
          const sessionMatch = loginCookies.match(/JSESSIONID=([^;]+)/)
          if (sessionMatch) {
            cookies = `JSESSIONID=${sessionMatch[1]}`
            console.log('[STO] loginAction 후 쿠키 업데이트:', cookies)
          }
        }

        let loginLocation = loginResponse.headers.get('location') || ''
        console.log('[STO] loginAction 응답:', loginResponse.status, loginLocation)

        // 302 리다이렉트면 따라가서 새 세션 쿠키 획득
        if (loginResponse.status === 302 && loginLocation) {
          const redirectUrl = loginLocation.startsWith('http')
            ? loginLocation
            : `${STO_CONFIG.baseUrl}${loginLocation}`
          console.log('[STO] 리다이렉트 따라가기:', redirectUrl)

          loginResponse = await fetch(redirectUrl, {
            method: 'GET',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Cookie': cookies,
            },
            redirect: 'manual',
          })

          loginCookies = loginResponse.headers.get('set-cookie')
          console.log('[STO] 리다이렉트 후 set-cookie:', loginCookies)
          if (loginCookies) {
            const sessionMatch = loginCookies.match(/JSESSIONID=([^;]+)/)
            if (sessionMatch) {
              cookies = `JSESSIONID=${sessionMatch[1]}`
              console.log('[STO] 리다이렉트 후 쿠키 업데이트:', cookies)
            }
          }

          loginLocation = loginResponse.headers.get('location') || ''
          console.log('[STO] 리다이렉트 후 응답:', loginResponse.status, loginLocation)

          // 두 번째 리다이렉트가 있으면 따라가기 (로그인 → 메인페이지 등)
          if (loginResponse.status === 302 && loginLocation && !loginLocation.includes('logout')) {
            const redirectUrl2 = loginLocation.startsWith('http')
              ? loginLocation
              : `${STO_CONFIG.baseUrl}${loginLocation}`
            console.log('[STO] 두 번째 리다이렉트:', redirectUrl2)

            loginResponse = await fetch(redirectUrl2, {
              method: 'GET',
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Cookie': cookies,
              },
              redirect: 'manual',
            })

            const loginCookies2 = loginResponse.headers.get('set-cookie')
            if (loginCookies2) {
              const sessionMatch = loginCookies2.match(/JSESSIONID=([^;]+)/)
              if (sessionMatch) {
                cookies = `JSESSIONID=${sessionMatch[1]}`
                console.log('[STO] 두 번째 리다이렉트 후 쿠키:', cookies)
              }
            }
          }
        }

        // 세션 생성
        const session: STOSession = {
          cookies,
          expiresAt: new Date(Date.now() + STO_CONFIG.sessionExpiryMinutes * 60 * 1000),
          isLoggedIn: true,
        }
        currentSession = session
        pendingCredentials = null

        // DB에 세션 저장 (영속화)
        await saveSessionToDB(session)

        console.log('[STO] 로그인 완료! 최종 쿠키:', cookies)
        return { success: true, session }
      } else {
        const errorMsg = data.message || data.msg || '인증코드가 올바르지 않습니다.'
        console.log('[STO] 인증 실패:', errorMsg, 'data:', data)
        return { success: false, error: errorMsg }
      }
    } catch {
      if (responseText.includes('success')) {
        // 세션 생성 (fallback)
        const session: STOSession = {
          cookies,
          expiresAt: new Date(Date.now() + STO_CONFIG.sessionExpiryMinutes * 60 * 1000),
          isLoggedIn: true,
        }
        currentSession = session
        pendingCredentials = null
        // DB에 세션 저장 (영속화)
        await saveSessionToDB(session)
        return { success: true, session }
      }
      return { success: false, error: '인증코드 확인에 실패했습니다.' }
    }
  } catch (error) {
    console.error('[STO] 인증코드 확인 오류:', error)
    return { success: false, error: `오류 발생: ${error}` }
  }
}

/**
 * STO 시스템 로그인 (통합 함수 - 이전 호환성 유지)
 */
export async function loginToSTO(
  credentials: STOCredentials,
  verificationCode?: string
): Promise<{ success: boolean; needsVerification?: boolean; session?: STOSession; error?: string }> {
  // 인증코드가 없으면 1단계: 인증코드 요청
  if (!verificationCode) {
    const result = await requestVerificationCode(credentials)
    if (result.success) {
      return { success: false, needsVerification: true }
    } else {
      return { success: false, error: result.error }
    }
  }

  // 인증코드가 있으면 2단계: 인증 및 로그인
  const result = await verifyCodeAndLogin(verificationCode)
  return result
}

/**
 * STO 자동 로그인 (Gmail에서 인증 코드 자동 추출)
 * 1. 인증코드 요청
 * 2. Gmail에서 인증코드 대기 및 추출
 * 3. 자동 로그인 완료
 */
export async function autoLoginToSTO(
  credentials: STOCredentials
): Promise<{ success: boolean; session?: STOSession; error?: string }> {
  try {
    console.log('[STO Auto Login] 자동 로그인 시작')

    // 1단계: 인증코드 요청
    const requestResult = await requestVerificationCode(credentials)
    if (!requestResult.success) {
      return { success: false, error: requestResult.error }
    }

    console.log('[STO Auto Login] 인증코드 발송 완료, 5초 대기 후 Gmail 확인...')

    // 이메일 도착 대기 (5초)
    await new Promise(resolve => setTimeout(resolve, 5000))

    // 2단계: Gmail에서 인증 코드 대기 (최대 60초, 5초마다 체크)
    const { waitForSTOVerificationCode } = await import('@/lib/google/gmail')
    const codeResult = await waitForSTOVerificationCode(60000, 5000)

    if (!codeResult.success || !codeResult.code) {
      return { success: false, error: codeResult.error || '인증 코드를 받지 못했습니다' }
    }

    console.log('[STO Auto Login] Gmail에서 인증 코드 추출:', codeResult.code)

    // 3단계: 인증 코드로 로그인 완료
    const loginResult = await verifyCodeAndLogin(codeResult.code)
    return loginResult

  } catch (error) {
    console.error('[STO Auto Login] 오류:', error)
    return { success: false, error: `자동 로그인 실패: ${error}` }
  }
}

/**
 * 세션 유효성 검사 (동기 버전 - 메모리만 체크)
 */
export function isSessionValid(): boolean {
  if (!currentSession) return false
  if (!currentSession.isLoggedIn) return false
  return new Date() < currentSession.expiresAt
}

/**
 * 세션 유효성 검사 (비동기 버전 - DB 로드 포함)
 * 메모리에 세션이 없으면 DB에서 로드 시도
 */
export async function ensureValidSession(): Promise<boolean> {
  // 메모리에 유효한 세션이 있으면 OK
  if (isSessionValid()) return true

  // DB에서 로드 시도
  if (!sessionLoadedFromDB) {
    sessionLoadedFromDB = true
    const storedSession = await loadSessionFromDB()
    if (storedSession) {
      currentSession = storedSession
      console.log('[STO] DB에서 세션 로드 완료')
      return true
    }
  }

  return false
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
 * 세션 클리어 (메모리 + DB)
 */
export async function clearSession(): Promise<void> {
  currentSession = null
  sessionLoadedFromDB = false
  await clearSessionFromDB()
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
      redirect: 'manual',
    })

    // 302 리다이렉트면 세션 만료
    if (response.status === 302) {
      const location = response.headers.get('location') || ''
      console.log('[STO] 목록 조회 리다이렉트:', location)
      if (location.includes('login') || location.includes('logout')) {
        currentSession!.isLoggedIn = false
        return { html: '', success: false, error: '세션이 만료되었습니다.' }
      }
    }

    const html = await response.text()

    // HTML 내용으로 로그인 페이지 여부 확인
    if (html.includes('자동로그아웃') || html.includes('<title>로그인</title>') || html.includes('loginout/login')) {
      currentSession!.isLoggedIn = false
      return { html: '', success: false, error: '세션이 만료되었습니다.' }
    }

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

/**
 * STO에서 파일 다운로드 (사업자등록증 등)
 * @param fileUrl STO 파일 다운로드 URL
 * @returns 파일 Blob 또는 null
 */
export async function downloadSTOFile(fileUrl: string): Promise<{
  blob: Blob | null
  contentType: string
  success: boolean
  error?: string
}> {
  if (!isSessionValid()) {
    return { blob: null, contentType: '', success: false, error: '유효하지 않은 세션입니다.' }
  }

  try {
    const response = await fetch(fileUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Cookie': currentSession!.cookies,
      },
    })

    if (!response.ok) {
      return { blob: null, contentType: '', success: false, error: `HTTP ${response.status}` }
    }

    // 로그인 페이지로 리다이렉트되면 세션 만료
    if (response.url.includes('login') || response.url.includes('logout')) {
      currentSession!.isLoggedIn = false
      return { blob: null, contentType: '', success: false, error: '세션이 만료되었습니다.' }
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream'
    const blob = await response.blob()

    return { blob, contentType, success: true }
  } catch (error) {
    console.error('[STO] 파일 다운로드 오류:', error)
    return { blob: null, contentType: '', success: false, error: `다운로드 오류: ${error}` }
  }
}
