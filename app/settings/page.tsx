'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import GlassCard from '@/components/ui/GlassCard'
import { Settings, RefreshCw, Bell, CheckCircle, AlertCircle, Clock, Loader2, Eye, EyeOff, Key, Zap, Target, Presentation, Film, Gift, Building2, Users, Handshake, Smartphone, FileSpreadsheet, HelpCircle, ExternalLink, RefreshCcw, Layout, BarChart3, Calendar, ClipboardCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import PushNotificationToggle from '@/components/notifications/PushNotificationToggle'

// STO 연동 상태 타입
interface STOStatus {
  connected: boolean
  lastSync: Date | null
  nextSync: Date | null
  newBookingsCount: number
  statusChangesCount: number
}

// 동기화 결과 타입
interface SyncResult {
  success: boolean
  totalCount: number
  newBookingsCount: number
  statusChangesCount: number
  newBookings: {
    reqstSn: string
    facilityName: string
    rentalDate: string
    applicantName: string
    status: string
  }[]
  statusChanges: {
    reqstSn: string
    applicantName: string
    rentalDate: string
    previousStatus: string
    newStatus: string
  }[]
  errors: string[]
}

export default function SettingsPage() {
  // STO 연동 설정
  const [stoEmail, setStoEmail] = useState('')
  const [stoPassword, setStoPassword] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [needsVerification, setNeedsVerification] = useState(false)
  const [stoStatus, setStoStatus] = useState<STOStatus>({
    connected: false,
    lastSync: null,
    nextSync: null,
    newBookingsCount: 0,
    statusChangesCount: 0,
  })
  const [isTesting, setIsTesting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)

  // 알림 설정
  const [notifyOnNewBooking, setNotifyOnNewBooking] = useState(true)
  const [notifySound, setNotifySound] = useState(true)
  const [pollInterval, setPollInterval] = useState(5) // 분 단위

  // 초기값 저장 (변경 감지용)
  const [initialNotifyOnNewBooking, setInitialNotifyOnNewBooking] = useState(true)
  const [initialNotifySound, setInitialNotifySound] = useState(true)
  const [initialPollInterval, setInitialPollInterval] = useState(5)

  // KPI 목표 설정
  const [kpiTargets, setKpiTargets] = useState({
    programOperation: 60,      // 프로그램 운영 활성화 (회)
    contentProduction: 60,     // 콘텐츠 기획 제작 (건)
    goodsEvent: 100,           // 굿즈 및 이벤트 운영 (%)
    studioActivation: 250,     // 스튜디오 활성화 (건)
    membershipStrength: 230,   // 멤버십 운영 강화 (명)
    longTermUsers: 2,          // 장기 이용자 확보 (곳)
  })
  const [initialKpiTargets, setInitialKpiTargets] = useState({
    programOperation: 60,
    contentProduction: 60,
    goodsEvent: 100,
    studioActivation: 250,
    membershipStrength: 230,
    longTermUsers: 2,
  })

  // 구글 시트 설정
  const [googleSheetUrl, setGoogleSheetUrl] = useState('')
  const [sheetUrlSaving, setSheetUrlSaving] = useState(false)
  const [sheetUrlResult, setSheetUrlResult] = useState<{ success: boolean; message: string } | null>(null)
  const [failedSyncCount, setFailedSyncCount] = useState(0)
  const [isSyncingSheets, setIsSyncingSheets] = useState(false)
  const [showSheetHelp, setShowSheetHelp] = useState(false)

  // 화면 설정 (페이지별 커스텀)
  const [displaySettings, setDisplaySettings] = useState({
    // 대시보드
    dashboard_recent_bookings_count: 4,        // 최근 예약 표시 개수
    dashboard_show_notifications: true,        // 알림 카드 표시
    // 예약 관리
    bookings_default_status: 'all',            // 기본 상태 필터
    bookings_items_per_page: 10,               // 페이지당 항목 수
    // 통계
    statistics_default_tab: 'overview',        // 기본 탭
    // 만족도조사
    surveys_items_per_page: 10,                // 페이지당 항목 수
  })
  const [initialDisplaySettings, setInitialDisplaySettings] = useState({
    dashboard_recent_bookings_count: 4,
    dashboard_show_notifications: true,
    bookings_default_status: 'all',
    bookings_items_per_page: 10,
    statistics_default_tab: 'overview',
    surveys_items_per_page: 10,
  })

  // 각 섹션별 저장 결과
  const [syncSettingResult, setSyncSettingResult] = useState<{ success: boolean; message: string } | null>(null)
  const [kpiSettingResult, setKpiSettingResult] = useState<{ success: boolean; message: string } | null>(null)
  const [notifySettingResult, setNotifySettingResult] = useState<{ success: boolean; message: string } | null>(null)
  const [displaySettingResult, setDisplaySettingResult] = useState<{ success: boolean; message: string } | null>(null)

  // 스크롤 컨테이너 및 섹션 참조
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const sectionIds = ['sto', 'sync', 'kpi', 'notify', 'google-sheet', 'display']

  // Intersection Observer로 현재 보이는 섹션 감지
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    // 스크롤 끝 감지 (마지막 섹션 처리)
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 50

      if (isAtBottom) {
        // 스크롤이 끝에 도달하면 마지막 섹션 활성화
        window.dispatchEvent(new CustomEvent('settings-section-change', { detail: 'display' }))
      }
    }

    container.addEventListener('scroll', handleScroll)

    const observer = new IntersectionObserver(
      (entries) => {
        // 스크롤이 끝에 있는지 확인
        const { scrollTop, scrollHeight, clientHeight } = container
        const isAtBottom = scrollTop + clientHeight >= scrollHeight - 50

        // 끝에 있으면 마지막 섹션 우선
        if (isAtBottom) return

        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.2) {
            const sectionId = entry.target.id
            if (sectionId) {
              // 사이드바에 현재 섹션 알림
              window.dispatchEvent(new CustomEvent('settings-section-change', { detail: sectionId }))
            }
          }
        })
      },
      {
        root: container,
        rootMargin: '-10% 0px -50% 0px',
        threshold: [0, 0.2, 0.5, 1],
      }
    )

    // 모든 섹션 관찰
    sectionIds.forEach((id) => {
      const element = document.getElementById(id)
      if (element) {
        observer.observe(element)
      }
    })

    return () => {
      observer.disconnect()
      container.removeEventListener('scroll', handleScroll)
    }
  }, [])

  // URL 해시로 초기 스크롤
  useEffect(() => {
    const hash = window.location.hash.replace('#', '')
    if (hash && sectionIds.includes(hash)) {
      setTimeout(() => {
        const element = document.getElementById(hash)
        if (element) {
          element.scrollIntoView({ block: 'start' })
        }
      }, 100)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // STO 세션 상태 확인
  const checkSTOStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/sto/sync')
      const data = await response.json()
      setStoStatus(prev => ({
        ...prev,
        connected: data.isLoggedIn,
        lastSync: data.lastSyncTime ? new Date(data.lastSyncTime) : null,
      }))
    } catch (error) {
      console.error('STO 상태 확인 실패:', error)
    }
  }, [])

  // STO 세션 keep-alive (5분마다)
  const keepAlive = useCallback(async () => {
    if (!stoStatus.connected) return

    try {
      const response = await fetch('/api/sto/keepalive', { method: 'POST' })
      const data = await response.json()

      if (!data.success) {
        // 세션 만료됨
        if (data.needsLogin) {
          setStoStatus(prev => ({ ...prev, connected: false }))
          setTestResult({ success: false, message: '세션이 만료되었습니다. 다시 로그인해주세요.' })
        }
      } else {
        console.log('[Keep-alive] 세션 유지 성공:', data.expiresAt)
      }
    } catch (error) {
      console.error('[Keep-alive] 실패:', error)
    }
  }, [stoStatus.connected])

  // 저장된 설정 로드 (localStorage)
  useEffect(() => {
    const savedEmail = localStorage.getItem('sto_email')
    const savedPollInterval = localStorage.getItem('sto_poll_interval')
    const savedNotifyNew = localStorage.getItem('sto_notify_new')
    const savedNotifySound = localStorage.getItem('sto_notify_sound')

    if (savedEmail) setStoEmail(savedEmail)
    if (savedPollInterval) {
      const interval = Number(savedPollInterval)
      setPollInterval(interval)
      setInitialPollInterval(interval)
    }
    if (savedNotifyNew !== null) {
      const value = savedNotifyNew === 'true'
      setNotifyOnNewBooking(value)
      setInitialNotifyOnNewBooking(value)
    }
    if (savedNotifySound !== null) {
      const value = savedNotifySound === 'true'
      setNotifySound(value)
      setInitialNotifySound(value)
    }

    // KPI 목표 설정 로드
    const savedKpiTargets = localStorage.getItem('kpi_targets')
    if (savedKpiTargets) {
      try {
        const parsed = JSON.parse(savedKpiTargets)
        const merged = { ...kpiTargets, ...parsed }
        setKpiTargets(merged)
        setInitialKpiTargets(merged)
      } catch (e) {
        console.error('KPI 설정 로드 실패:', e)
      }
    }

    // 화면 설정 로드
    const savedDisplaySettings = localStorage.getItem('display_settings')
    if (savedDisplaySettings) {
      try {
        const parsed = JSON.parse(savedDisplaySettings)
        const merged = { ...displaySettings, ...parsed }
        setDisplaySettings(merged)
        setInitialDisplaySettings(merged)
      } catch (e) {
        console.error('화면 설정 로드 실패:', e)
      }
    }

    // STO 상태 확인
    checkSTOStatus()

    // 구글 시트 설정 로드
    loadGoogleSheetSettings()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkSTOStatus])

  // 구글 시트 설정 로드
  const loadGoogleSheetSettings = async () => {
    try {
      const response = await fetch('/api/settings/google-sheet')
      const data = await response.json()
      if (data.url) {
        setGoogleSheetUrl(data.url)
      }
      if (data.failedCount !== undefined) {
        setFailedSyncCount(data.failedCount)
      }
    } catch (error) {
      console.error('구글 시트 설정 로드 실패:', error)
    }
  }

  // 구글 시트 URL 저장
  const handleSaveSheetUrl = async () => {
    setSheetUrlSaving(true)
    setSheetUrlResult(null)

    try {
      const response = await fetch('/api/settings/google-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: googleSheetUrl }),
      })

      const data = await response.json()

      if (data.success) {
        setSheetUrlResult({ success: true, message: '구글 시트 URL이 저장되었습니다.' })
      } else {
        setSheetUrlResult({ success: false, message: data.error || '저장 실패' })
      }
    } catch {
      setSheetUrlResult({ success: false, message: '서버 오류가 발생했습니다.' })
    } finally {
      setSheetUrlSaving(false)
    }
  }

  // 실패한 동기화 재시도
  const handleRetrySync = async () => {
    setIsSyncingSheets(true)
    setSheetUrlResult(null)

    try {
      const response = await fetch('/api/survey/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const data = await response.json()

      if (data.success) {
        setSheetUrlResult({ success: true, message: data.message })
        setFailedSyncCount(data.failed || 0)
      } else {
        setSheetUrlResult({ success: false, message: data.error || '동기화 실패' })
      }
    } catch {
      setSheetUrlResult({ success: false, message: '동기화 중 오류가 발생했습니다.' })
    } finally {
      setIsSyncingSheets(false)
    }
  }

  // Keep-alive 주기적 실행 (5분마다)
  useEffect(() => {
    if (!stoStatus.connected) return

    // 즉시 한번 실행
    keepAlive()

    // 5분마다 실행
    const interval = setInterval(keepAlive, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [stoStatus.connected, keepAlive])

  // STO 로그인
  const handleLogin = async () => {
    if (!stoEmail || !stoPassword) {
      setTestResult({ success: false, message: '이메일과 비밀번호를 입력해주세요' })
      return
    }

    // 인증코드 필요한 상태에서 인증코드 없이 요청하면 안됨
    if (needsVerification && !verificationCode) {
      setTestResult({ success: false, message: '이메일로 받은 인증코드를 입력해주세요' })
      return
    }

    setIsTesting(true)
    setTestResult(null)

    try {
      const response = await fetch('/api/sto/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: stoEmail,
          password: stoPassword,
          verificationCode: needsVerification ? verificationCode : undefined,
        }),
      })

      const data = await response.json()

      if (data.needsVerification) {
        setNeedsVerification(true)
        setTestResult({
          success: false,
          message: '이메일(sns.mediacenter@gmail.com)로 인증코드가 발송되었습니다. 인증코드를 입력해주세요.',
        })
      } else if (data.success) {
        setNeedsVerification(false)
        setVerificationCode('')
        setStoStatus(prev => ({
          ...prev,
          connected: true,
        }))
        setTestResult({
          success: true,
          message: 'STO 시스템에 성공적으로 연결되었습니다.',
        })
        // 저장
        localStorage.setItem('sto_email', stoEmail)
      } else {
        setTestResult({
          success: false,
          message: data.error || '로그인에 실패했습니다.',
        })
      }
    } catch {
      setTestResult({
        success: false,
        message: '연결 실패. 네트워크를 확인해주세요.',
      })
    } finally {
      setIsTesting(false)
    }
  }

  // 수동 동기화
  const handleManualSync = async () => {
    if (!stoStatus.connected) {
      setTestResult({ success: false, message: '먼저 STO 시스템에 연결해주세요' })
      return
    }

    setIsSyncing(true)
    setSyncResult(null)

    try {
      const response = await fetch('/api/sto/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fetchDetail: true }),  // maxRecords 생략 = 전체
      })

      const data: SyncResult = await response.json()
      setSyncResult(data)

      if (data.success) {
        setStoStatus(prev => ({
          ...prev,
          lastSync: new Date(),
          nextSync: new Date(Date.now() + pollInterval * 60 * 1000),
          newBookingsCount: data.newBookingsCount,
          statusChangesCount: data.statusChangesCount,
        }))

        // 새 예약이나 상태 변경이 있으면 알림
        if (notifyOnNewBooking && (data.newBookingsCount > 0 || data.statusChangesCount > 0)) {
          // 브라우저 알림
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('STO 예약 알림', {
              body: `신규 예약 ${data.newBookingsCount}건, 상태 변경 ${data.statusChangesCount}건`,
              icon: '/favicon.ico',
            })
          }
          // 알림음
          if (notifySound) {
            const audio = new Audio('/notification.mp3')
            audio.play().catch(() => {})
          }
        }

        setTestResult({
          success: true,
          message: `동기화 완료! 신규 ${data.newBookingsCount}건, 상태변경 ${data.statusChangesCount}건`,
        })
      } else {
        setTestResult({
          success: false,
          message: data.errors?.join(', ') || '동기화 실패',
        })
      }
    } catch {
      setTestResult({
        success: false,
        message: '동기화 중 오류가 발생했습니다.',
      })
    } finally {
      setIsSyncing(false)
    }
  }

  // 변경 감지 함수
  const isSyncSettingChanged = pollInterval !== initialPollInterval

  const isKpiSettingChanged = JSON.stringify(kpiTargets) !== JSON.stringify(initialKpiTargets)

  const isNotifySettingChanged =
    notifyOnNewBooking !== initialNotifyOnNewBooking ||
    notifySound !== initialNotifySound

  const isDisplaySettingChanged = JSON.stringify(displaySettings) !== JSON.stringify(initialDisplaySettings)

  // 동기화 설정 저장
  const handleSaveSyncSettings = () => {
    localStorage.setItem('sto_poll_interval', pollInterval.toString())
    setInitialPollInterval(pollInterval)
    setSyncSettingResult({ success: true, message: '동기화 설정이 저장되었습니다.' })
    setTimeout(() => setSyncSettingResult(null), 3000)
  }

  // KPI 설정 저장
  const handleSaveKpiSettings = () => {
    localStorage.setItem('kpi_targets', JSON.stringify(kpiTargets))
    setInitialKpiTargets({ ...kpiTargets })
    setKpiSettingResult({ success: true, message: 'KPI 목표가 저장되었습니다.' })
    setTimeout(() => setKpiSettingResult(null), 3000)
  }

  // 알림 설정 저장
  const handleSaveNotifySettings = () => {
    localStorage.setItem('sto_notify_new', notifyOnNewBooking.toString())
    localStorage.setItem('sto_notify_sound', notifySound.toString())
    setInitialNotifyOnNewBooking(notifyOnNewBooking)
    setInitialNotifySound(notifySound)
    setNotifySettingResult({ success: true, message: '알림 설정이 저장되었습니다.' })
    setTimeout(() => setNotifySettingResult(null), 3000)
  }

  // 화면 설정 저장
  const handleSaveDisplaySettings = () => {
    localStorage.setItem('display_settings', JSON.stringify(displaySettings))
    setInitialDisplaySettings({ ...displaySettings })
    setDisplaySettingResult({ success: true, message: '화면 설정이 저장되었습니다.' })
    setTimeout(() => setDisplaySettingResult(null), 3000)
  }

  // 화면 설정 변경 핸들러
  const handleDisplaySettingChange = (key: keyof typeof displaySettings, value: string | number | boolean) => {
    setDisplaySettings(prev => ({ ...prev, [key]: value }))
  }

  // KPI 목표 변경 핸들러
  const handleKpiChange = (key: keyof typeof kpiTargets, value: number) => {
    setKpiTargets(prev => ({ ...prev, [key]: value }))
  }

  return (
    <AdminLayout>
      <div className="h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 mb-6">
          <h1 className="text-xl lg:text-2xl font-bold text-white mb-1">설정</h1>
          <p className="text-sm text-gray-500">시스템 연동 및 알림 설정</p>
        </div>

        {/* Scrollable Content */}
        <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-y-auto pr-2 space-y-6 scroll-smooth">
          {/* STO 시스템 연동 */}
          <GlassCard id="sto" className="scroll-mt-4">
            <div className="flex items-center gap-2 mb-6">
              <Settings className="w-5 h-5 text-purple-400" />
              <h2 className="text-lg font-semibold text-white">STO 예약 시스템 연동</h2>
            </div>

            {/* 연결 상태 */}
            <div className="flex items-center gap-4 mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
              <div className={cn(
                'w-3 h-3 rounded-full',
                stoStatus.connected ? 'bg-green-500' : 'bg-gray-500'
              )} />
              <div className="flex-1">
                <p className="text-sm text-white">
                  {stoStatus.connected ? '연결됨' : '연결 안됨'}
                </p>
                {stoStatus.lastSync && (
                  <p className="text-xs text-gray-500">
                    마지막 동기화: {stoStatus.lastSync.toLocaleString('ko-KR')}
                  </p>
                )}
              </div>
              {stoStatus.connected && (
                <button
                  onClick={handleManualSync}
                  disabled={isSyncing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors disabled:opacity-50"
                >
                  {isSyncing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  동기화
                </button>
              )}
            </div>

            {/* 로그인 정보 */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">STO 이메일</label>
                <input
                  type="email"
                  value={stoEmail}
                  onChange={(e) => setStoEmail(e.target.value)}
                  placeholder="example@email.com"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">STO 비밀번호</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={stoPassword}
                    onChange={(e) => setStoPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 pr-12 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  * 비밀번호는 서버에 저장되지 않으며, 세션 유지에만 사용됩니다.
                </p>
              </div>

              {/* 인증코드 입력 (2단계 인증 필요시) */}
              {needsVerification && (
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    <Key className="w-4 h-4 inline mr-1" />
                    이메일 인증코드
                  </label>
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="6자리 인증코드 입력"
                    maxLength={6}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 text-center text-lg tracking-widest"
                  />
                  <p className="text-xs text-yellow-400 mt-2">
                    * sns.mediacenter@gmail.com 으로 발송된 인증코드를 입력하세요
                  </p>
                </div>
              )}

              {/* 테스트 결과 */}
              {testResult && (
                <div
                  className={cn(
                    'flex items-center gap-2 p-3 rounded-lg',
                    testResult.success
                      ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                      : 'bg-red-500/10 border border-red-500/20 text-red-400'
                  )}
                >
                  {testResult.success ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <AlertCircle className="w-4 h-4" />
                  )}
                  <span className="text-sm">{testResult.message}</span>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleLogin}
                  disabled={isTesting || stoStatus.connected}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors disabled:opacity-50"
                >
                  {isTesting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {needsVerification ? '인증 중...' : '로그인 중...'}
                    </>
                  ) : stoStatus.connected ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      연결됨
                    </>
                  ) : needsVerification ? (
                    <>
                      <Key className="w-4 h-4" />
                      인증코드 확인
                    </>
                  ) : (
                    <>STO 로그인</>
                  )}
                </button>

                {/* 자동 로그인 버튼 */}
                {!stoStatus.connected && !needsVerification && (
                  <button
                    onClick={async () => {
                      if (!stoEmail || !stoPassword) {
                        setTestResult({ success: false, message: '이메일과 비밀번호를 입력해주세요' })
                        return
                      }
                      setIsTesting(true)
                      setTestResult({ success: false, message: 'Gmail에서 인증코드 대기 중... (최대 60초)' })
                      try {
                        const response = await fetch('/api/sto/login', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            email: stoEmail,
                            password: stoPassword,
                            autoLogin: true,
                          }),
                        })
                        const data = await response.json()
                        if (data.success) {
                          setStoStatus(prev => ({ ...prev, connected: true }))
                          setTestResult({ success: true, message: '자동 로그인 성공!' })
                          localStorage.setItem('sto_email', stoEmail)
                        } else {
                          setTestResult({ success: false, message: data.error || '자동 로그인 실패' })
                        }
                      } catch {
                        setTestResult({ success: false, message: '자동 로그인 중 오류 발생' })
                      } finally {
                        setIsTesting(false)
                      }
                    }}
                    disabled={isTesting || stoStatus.connected}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors disabled:opacity-50"
                    title="Gmail에서 인증코드를 자동으로 가져와 로그인합니다"
                  >
                    <Zap className="w-4 h-4" />
                    자동
                  </button>
                )}
              </div>

              {/* 동기화 결과 상세 */}
              {syncResult && (syncResult.newBookingsCount > 0 || syncResult.statusChangesCount > 0) && (
                <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10">
                  <h4 className="text-sm font-medium text-white mb-3">동기화 결과</h4>

                  {syncResult.newBookings.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-green-400 mb-2">신규 예약 ({syncResult.newBookingsCount}건)</p>
                      <div className="space-y-1">
                        {syncResult.newBookings.slice(0, 5).map((b) => (
                          <div key={b.reqstSn} className="text-xs text-gray-400">
                            • {b.rentalDate} {b.facilityName} - {b.applicantName}
                          </div>
                        ))}
                        {syncResult.newBookings.length > 5 && (
                          <div className="text-xs text-gray-500">...외 {syncResult.newBookings.length - 5}건</div>
                        )}
                      </div>
                    </div>
                  )}

                  {syncResult.statusChanges.length > 0 && (
                    <div>
                      <p className="text-xs text-yellow-400 mb-2">상태 변경 ({syncResult.statusChangesCount}건)</p>
                      <div className="space-y-1">
                        {syncResult.statusChanges.slice(0, 5).map((c) => (
                          <div key={c.reqstSn} className="text-xs text-gray-400">
                            • {c.applicantName}: {c.previousStatus} → {c.newStatus}
                          </div>
                        ))}
                        {syncResult.statusChanges.length > 5 && (
                          <div className="text-xs text-gray-500">...외 {syncResult.statusChanges.length - 5}건</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </GlassCard>

          {/* 동기화 설정 */}
          <GlassCard id="sync" className="scroll-mt-4">
            <div className="flex items-center gap-2 mb-6">
              <Clock className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-semibold text-white">동기화 설정</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  폴링 간격 (분)
                </label>
                <select
                  value={pollInterval}
                  onChange={(e) => setPollInterval(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500/50"
                >
                  <option value={1}>1분</option>
                  <option value={3}>3분</option>
                  <option value={5}>5분 (권장)</option>
                  <option value={10}>10분</option>
                  <option value={15}>15분</option>
                  <option value={30}>30분</option>
                </select>
                <p className="text-xs text-gray-500 mt-2">
                  STO 시스템에서 새 예약을 확인하는 주기입니다.
                </p>
              </div>

              {/* 저장 결과 메시지 */}
              {syncSettingResult && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">{syncSettingResult.message}</span>
                </div>
              )}

              {/* 변경사항 있을 때만 저장 버튼 표시 */}
              {isSyncSettingChanged && (
                <button
                  onClick={handleSaveSyncSettings}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-cyan-500 text-white font-medium hover:bg-cyan-600 transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  동기화 설정 저장
                </button>
              )}
            </div>
          </GlassCard>

          {/* KPI 목표 설정 */}
          <GlassCard id="kpi" className="scroll-mt-4">
            <div className="flex items-center gap-2 mb-6">
              <Target className="w-5 h-5 text-yellow-400" />
              <h2 className="text-lg font-semibold text-white">KPI 목표 설정</h2>
              <span className="text-xs text-gray-500 ml-auto">연간 목표</span>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* 프로그램 운영 활성화 */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-lg bg-rose-500/20">
                    <Presentation className="w-4 h-4 text-rose-400" />
                  </div>
                  <span className="text-sm text-white">프로그램 운영</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={kpiTargets.programOperation}
                    onChange={(e) => handleKpiChange('programOperation', Number(e.target.value))}
                    min={1}
                    className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-right focus:outline-none focus:border-purple-500/50"
                  />
                  <span className="text-sm text-gray-400 w-8">회</span>
                </div>
              </div>

              {/* 콘텐츠 기획 제작 */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-lg bg-orange-500/20">
                    <Film className="w-4 h-4 text-orange-400" />
                  </div>
                  <span className="text-sm text-white">콘텐츠 제작</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={kpiTargets.contentProduction}
                    onChange={(e) => handleKpiChange('contentProduction', Number(e.target.value))}
                    min={1}
                    className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-right focus:outline-none focus:border-purple-500/50"
                  />
                  <span className="text-sm text-gray-400 w-8">건</span>
                </div>
              </div>

              {/* 굿즈 및 이벤트 */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-lg bg-emerald-500/20">
                    <Gift className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-sm text-white">굿즈/이벤트</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={kpiTargets.goodsEvent}
                    onChange={(e) => handleKpiChange('goodsEvent', Number(e.target.value))}
                    min={1}
                    max={100}
                    className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-right focus:outline-none focus:border-purple-500/50"
                  />
                  <span className="text-sm text-gray-400 w-8">%</span>
                </div>
              </div>

              {/* 스튜디오 활성화 */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-lg bg-violet-500/20">
                    <Building2 className="w-4 h-4 text-violet-400" />
                  </div>
                  <span className="text-sm text-white">스튜디오 활성화</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={kpiTargets.studioActivation}
                    onChange={(e) => handleKpiChange('studioActivation', Number(e.target.value))}
                    min={1}
                    className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-right focus:outline-none focus:border-purple-500/50"
                  />
                  <span className="text-sm text-gray-400 w-8">건</span>
                </div>
              </div>

              {/* 멤버십 운영 강화 */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-lg bg-cyan-500/20">
                    <Users className="w-4 h-4 text-cyan-400" />
                  </div>
                  <span className="text-sm text-white">멤버십 강화</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={kpiTargets.membershipStrength}
                    onChange={(e) => handleKpiChange('membershipStrength', Number(e.target.value))}
                    min={1}
                    className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-right focus:outline-none focus:border-purple-500/50"
                  />
                  <span className="text-sm text-gray-400 w-8">명</span>
                </div>
              </div>

              {/* 장기 이용자 확보 */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-lg bg-amber-500/20">
                    <Handshake className="w-4 h-4 text-amber-400" />
                  </div>
                  <span className="text-sm text-white">장기 이용자</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={kpiTargets.longTermUsers}
                    onChange={(e) => handleKpiChange('longTermUsers', Number(e.target.value))}
                    min={1}
                    className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-right focus:outline-none focus:border-purple-500/50"
                  />
                  <span className="text-sm text-gray-400 w-8">곳</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-500 mt-4">
              * 설정한 목표는 통계 페이지의 KPI 현황에 반영됩니다.
            </p>

            {/* 저장 결과 메시지 */}
            {kpiSettingResult && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 mt-4">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">{kpiSettingResult.message}</span>
              </div>
            )}

            {/* 변경사항 있을 때만 저장 버튼 표시 */}
            {isKpiSettingChanged && (
              <button
                onClick={handleSaveKpiSettings}
                className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-yellow-500 text-white font-medium hover:bg-yellow-600 transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                KPI 목표 저장
              </button>
            )}
          </GlassCard>

          {/* 알림 설정 */}
          <GlassCard id="notify" className="scroll-mt-4">
            <div className="flex items-center gap-2 mb-6">
              <Bell className="w-5 h-5 text-yellow-400" />
              <h2 className="text-lg font-semibold text-white">알림 설정</h2>
            </div>

            <div className="space-y-4">
              {/* 푸시 알림 (Web Push) */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Smartphone className="w-4 h-4 text-purple-400" />
                  <span className="text-sm text-gray-400">백그라운드 푸시 알림</span>
                </div>
                <PushNotificationToggle />
              </div>

              {/* 새 예약 알림 */}
              <label className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/[0.07] transition-colors">
                <div>
                  <p className="text-sm text-white">새 예약 알림</p>
                  <p className="text-xs text-gray-500">STO에서 새 예약이 감지되면 알림</p>
                </div>
                <input
                  type="checkbox"
                  checked={notifyOnNewBooking}
                  onChange={(e) => setNotifyOnNewBooking(e.target.checked)}
                  className="w-5 h-5 rounded bg-white/10 border-white/20 text-purple-500 focus:ring-purple-500/50"
                />
              </label>

              {/* 알림음 */}
              <label className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/[0.07] transition-colors">
                <div>
                  <p className="text-sm text-white">알림음</p>
                  <p className="text-xs text-gray-500">새 알림 시 소리 재생</p>
                </div>
                <input
                  type="checkbox"
                  checked={notifySound}
                  onChange={(e) => setNotifySound(e.target.checked)}
                  className="w-5 h-5 rounded bg-white/10 border-white/20 text-purple-500 focus:ring-purple-500/50"
                />
              </label>

              {/* 저장 결과 메시지 */}
              {notifySettingResult && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">{notifySettingResult.message}</span>
                </div>
              )}

              {/* 변경사항 있을 때만 저장 버튼 표시 */}
              {isNotifySettingChanged && (
                <button
                  onClick={handleSaveNotifySettings}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-500 text-white font-medium hover:bg-amber-600 transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  알림 설정 저장
                </button>
              )}
            </div>
          </GlassCard>

          {/* 만족도조사 구글 시트 연동 */}
          <GlassCard id="google-sheet" className="scroll-mt-4">
            <div className="flex items-center gap-2 mb-6">
              <FileSpreadsheet className="w-5 h-5 text-green-400" />
              <h2 className="text-lg font-semibold text-white">만족도조사 구글 시트 연동</h2>
              <button
                onClick={() => setShowSheetHelp(!showSheetHelp)}
                className="ml-auto p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                title="도움말"
              >
                <HelpCircle className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {/* 도움말 */}
            {showSheetHelp && (
              <div className="mb-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <h4 className="text-sm font-medium text-blue-400 mb-2">설정 방법</h4>
                <ol className="text-xs text-gray-400 space-y-2">
                  <li>1. Google Sheets에서 새 스프레드시트를 생성합니다.</li>
                  <li>2. 스프레드시트의 공유 설정에서 서비스 계정 이메일을 편집자로 추가합니다.</li>
                  <li>3. 스프레드시트 URL을 아래에 붙여넣기 합니다.</li>
                  <li className="text-yellow-400">
                    * 서비스 계정: 환경 변수 GOOGLE_SERVICE_ACCOUNT_KEY에 설정된 계정
                  </li>
                </ol>
              </div>
            )}

            <div className="space-y-4">
              {/* URL 입력 */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">구글 시트 URL</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={googleSheetUrl}
                    onChange={(e) => setGoogleSheetUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
                  />
                  {googleSheetUrl && (
                    <a
                      href={googleSheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-3 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                      title="시트 열기"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  * 만족도조사 결과가 자동으로 이 시트에 저장됩니다.
                </p>
              </div>

              {/* 결과 메시지 */}
              {sheetUrlResult && (
                <div
                  className={cn(
                    'flex items-center gap-2 p-3 rounded-lg',
                    sheetUrlResult.success
                      ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                      : 'bg-red-500/10 border border-red-500/20 text-red-400'
                  )}
                >
                  {sheetUrlResult.success ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <AlertCircle className="w-4 h-4" />
                  )}
                  <span className="text-sm">{sheetUrlResult.message}</span>
                </div>
              )}

              {/* 동기화 실패 건수 */}
              {failedSyncCount > 0 && (
                <div className="flex items-center justify-between p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                  <div>
                    <p className="text-sm text-yellow-400">동기화 실패 {failedSyncCount}건</p>
                    <p className="text-xs text-gray-500">시트 접근 권한을 확인하고 재시도하세요.</p>
                  </div>
                  <button
                    onClick={handleRetrySync}
                    disabled={isSyncingSheets}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition-colors disabled:opacity-50"
                  >
                    {isSyncingSheets ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCcw className="w-4 h-4" />
                    )}
                    재시도
                  </button>
                </div>
              )}

              <button
                onClick={handleSaveSheetUrl}
                disabled={sheetUrlSaving}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors disabled:opacity-50"
              >
                {sheetUrlSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="w-4 h-4" />
                    구글 시트 URL 저장
                  </>
                )}
              </button>
            </div>
          </GlassCard>

          {/* 화면 설정 */}
          <GlassCard id="display" className="scroll-mt-4">
            <div className="flex items-center gap-2 mb-6">
              <Layout className="w-5 h-5 text-indigo-400" />
              <h2 className="text-lg font-semibold text-white">화면 설정</h2>
              <span className="text-xs text-gray-500 ml-auto">페이지별 커스텀</span>
            </div>

            <div className="space-y-6">
              {/* 대시보드 설정 */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-lg bg-purple-500/20">
                    <Layout className="w-4 h-4 text-purple-400" />
                  </div>
                  <span className="text-sm font-medium text-white">대시보드</span>
                </div>
                <div className="pl-8 space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                    <div>
                      <p className="text-sm text-gray-300">최근 예약 표시 개수</p>
                      <p className="text-xs text-gray-500">대시보드에 표시할 예약 수</p>
                    </div>
                    <select
                      value={displaySettings.dashboard_recent_bookings_count}
                      onChange={(e) => handleDisplaySettingChange('dashboard_recent_bookings_count', Number(e.target.value))}
                      className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500/50"
                    >
                      <option value={2}>2개</option>
                      <option value={4}>4개</option>
                      <option value={6}>6개</option>
                      <option value={8}>8개</option>
                    </select>
                  </div>
                  <label className="flex items-center justify-between p-3 rounded-lg bg-white/5 cursor-pointer hover:bg-white/[0.07] transition-colors">
                    <div>
                      <p className="text-sm text-gray-300">알림 카드 표시</p>
                      <p className="text-xs text-gray-500">대시보드에 알림 패널 표시</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={displaySettings.dashboard_show_notifications}
                      onChange={(e) => handleDisplaySettingChange('dashboard_show_notifications', e.target.checked)}
                      className="w-5 h-5 rounded bg-white/10 border-white/20 text-purple-500 focus:ring-purple-500/50"
                    />
                  </label>
                </div>
              </div>

              {/* 예약 관리 설정 */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-lg bg-cyan-500/20">
                    <Calendar className="w-4 h-4 text-cyan-400" />
                  </div>
                  <span className="text-sm font-medium text-white">예약 관리</span>
                </div>
                <div className="pl-8 space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                    <div>
                      <p className="text-sm text-gray-300">기본 상태 필터</p>
                      <p className="text-xs text-gray-500">페이지 진입 시 기본 필터</p>
                    </div>
                    <select
                      value={displaySettings.bookings_default_status}
                      onChange={(e) => handleDisplaySettingChange('bookings_default_status', e.target.value)}
                      className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500/50"
                    >
                      <option value="all">전체</option>
                      <option value="APPROVED">승인</option>
                      <option value="PENDING">대기</option>
                      <option value="CANCELLED">취소</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                    <div>
                      <p className="text-sm text-gray-300">페이지당 항목 수</p>
                      <p className="text-xs text-gray-500">목록에 표시할 예약 수</p>
                    </div>
                    <select
                      value={displaySettings.bookings_items_per_page}
                      onChange={(e) => handleDisplaySettingChange('bookings_items_per_page', Number(e.target.value))}
                      className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500/50"
                    >
                      <option value={5}>5개</option>
                      <option value={10}>10개</option>
                      <option value={20}>20개</option>
                      <option value={50}>50개</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 통계 설정 */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-lg bg-yellow-500/20">
                    <BarChart3 className="w-4 h-4 text-yellow-400" />
                  </div>
                  <span className="text-sm font-medium text-white">통계</span>
                </div>
                <div className="pl-8 space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                    <div>
                      <p className="text-sm text-gray-300">기본 탭</p>
                      <p className="text-xs text-gray-500">통계 페이지 진입 시 기본 탭</p>
                    </div>
                    <select
                      value={displaySettings.statistics_default_tab}
                      onChange={(e) => handleDisplaySettingChange('statistics_default_tab', e.target.value)}
                      className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500/50"
                    >
                      <option value="overview">개요</option>
                      <option value="studios">스튜디오별</option>
                      <option value="users">이용자 분석</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 만족도조사 설정 */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-lg bg-green-500/20">
                    <ClipboardCheck className="w-4 h-4 text-green-400" />
                  </div>
                  <span className="text-sm font-medium text-white">만족도조사</span>
                </div>
                <div className="pl-8 space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                    <div>
                      <p className="text-sm text-gray-300">페이지당 항목 수</p>
                      <p className="text-xs text-gray-500">응답 목록에 표시할 수</p>
                    </div>
                    <select
                      value={displaySettings.surveys_items_per_page}
                      onChange={(e) => handleDisplaySettingChange('surveys_items_per_page', Number(e.target.value))}
                      className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500/50"
                    >
                      <option value={5}>5개</option>
                      <option value={10}>10개</option>
                      <option value={20}>20개</option>
                      <option value={50}>50개</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-500 mt-6">
              * 설정한 값은 저장 후 해당 페이지에 반영됩니다.
            </p>

            {/* 저장 결과 메시지 */}
            {displaySettingResult && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 mt-4">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">{displaySettingResult.message}</span>
              </div>
            )}

            {/* 변경사항 있을 때만 저장 버튼 표시 */}
            {isDisplaySettingChanged && (
              <button
                onClick={handleSaveDisplaySettings}
                className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-indigo-500 text-white font-medium hover:bg-indigo-600 transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                화면 설정 저장
              </button>
            )}
          </GlassCard>
        </div>
      </div>
    </AdminLayout>
  )
}
