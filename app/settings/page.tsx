'use client'

import { useState, useEffect, useCallback } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import GlassCard from '@/components/ui/GlassCard'
import { Settings, RefreshCw, Bell, CheckCircle, AlertCircle, Clock, Loader2, Eye, EyeOff, Key, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

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
    if (savedPollInterval) setPollInterval(Number(savedPollInterval))
    if (savedNotifyNew !== null) setNotifyOnNewBooking(savedNotifyNew === 'true')
    if (savedNotifySound !== null) setNotifySound(savedNotifySound === 'true')

    // STO 상태 확인
    checkSTOStatus()
  }, [checkSTOStatus])

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

  // 설정 저장
  const handleSaveSettings = () => {
    localStorage.setItem('sto_email', stoEmail)
    localStorage.setItem('sto_poll_interval', pollInterval.toString())
    localStorage.setItem('sto_notify_new', notifyOnNewBooking.toString())
    localStorage.setItem('sto_notify_sound', notifySound.toString())
    // 비밀번호는 보안상 localStorage에 저장하지 않음
    setTestResult({ success: true, message: '설정이 저장되었습니다' })
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
        <div className="flex-1 min-h-0 overflow-y-auto pr-2 space-y-6">
          {/* STO 시스템 연동 */}
          <GlassCard>
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
          <GlassCard>
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
            </div>
          </GlassCard>

          {/* 알림 설정 */}
          <GlassCard>
            <div className="flex items-center gap-2 mb-6">
              <Bell className="w-5 h-5 text-yellow-400" />
              <h2 className="text-lg font-semibold text-white">알림 설정</h2>
            </div>

            <div className="space-y-4">
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
            </div>
          </GlassCard>

          {/* 저장 버튼 */}
          <div className="flex justify-end">
            <button
              onClick={handleSaveSettings}
              className="px-6 py-3 rounded-xl bg-purple-500 text-white font-medium hover:bg-purple-600 transition-colors"
            >
              설정 저장
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
