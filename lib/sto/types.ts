// STO 예약 시스템 타입 정의

export interface STOCredentials {
  email: string
  password: string
}

export interface STOSession {
  token: string
  expiresAt: Date
}

export interface STOBooking {
  id: string
  rentalDate: string
  timeSlots: number[]
  applicantName: string
  organization: string | null
  phone: string
  eventName: string | null
  purpose: string | null
  participantsCount: number
  studioId: number
  status: string
  fee: number | null
  createdAt: string
}

export interface STOSyncResult {
  success: boolean
  newBookings: STOBooking[]
  updatedBookings: STOBooking[]
  errors: string[]
  syncedAt: Date
}

// STO 시스템 설정
export const STO_CONFIG = {
  // STO 시스템 URL (실제 URL로 교체 필요)
  baseUrl: process.env.STO_BASE_URL || 'https://sto.example.com',
  // 토큰 만료 시간 (30분)
  tokenExpiryMinutes: 30,
  // 폴링 간격 (5분)
  pollIntervalMinutes: 5,
  // 최대 재시도 횟수
  maxRetries: 3,
}
