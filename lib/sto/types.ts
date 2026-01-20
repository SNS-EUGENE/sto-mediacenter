// STO 예약 시스템 타입 정의

export interface STOCredentials {
  email: string
  password: string
}

export interface STOSession {
  cookies: string
  expiresAt: Date
  isLoggedIn: boolean
}

// STO 예약 목록 아이템 (목록 페이지에서 추출)
export interface STOBookingListItem {
  reqstSn: string           // 예약 고유번호 (URL의 reqstSn)
  rowNumber: number         // 순번
  facilityName: string      // 신청시설 (대형 스튜디오, 1인 스튜디오 #1, #2)
  participantsCount: number // 행사규모 (명)
  rentalDate: string        // 예약일 (YYYY.MM.DD)
  timeSlots: string[]       // 예약시간 배열 (09:00~10:00 등)
  applicantName: string     // 신청자명 (마스킹됨)
  organization: string      // 소속
  phone: string             // 휴대폰 (마스킹됨)
  status: STOBookingStatus  // 예약상태
  cancelDate: string | null // 취소일자
  specialNote: string       // 특이사항
  createdAt: string         // 등록일
}

// STO 예약 상세 정보 (상세 페이지에서 추출)
export interface STOBookingDetail extends STOBookingListItem {
  // 신청 내역
  applicationDate: string   // 신청일

  // 신청자 정보 (상세)
  fullName: string          // 신청자명 (전체)
  fullPhone: string         // 휴대폰 (전체)
  email: string             // 이메일
  companyPhone: string      // 전화번호
  purpose: string           // 사용 목적

  // 대관료 정보
  userType: string          // 사용자 신청 유형 (서울시 및 서울관광플라자 입주사 등)
  discountRate: number      // 대관료 할인율 (%)
  rentalFee: number         // 대관료 (원)
  bankAccount: string       // 입금 계좌

  // 증빙 발행
  businessLicense: string      // 사업자등록증 파일명
  businessLicenseUrl: string   // 사업자등록증 다운로드 URL
  receiptType: string          // 증빙 발행 유형 (미대상, 세금계산서 등)
  businessNumber: string       // 사업자번호

  // No-Show
  hasNoShow: boolean        // No-Show 여부
  noShowMemo: string        // No-Show 메모

  // 스튜디오 오퍼레이팅 지원
  studioUsageMethod: string     // 사용 방식
  fileDeliveryMethod: string    // 파일 원본 수령 방법
  preMeetingContact: string     // 사전 미팅 연락처
  otherInquiry: string          // 기타 문의사항
}

// 예약 상태
export type STOBookingStatus =
  | 'PENDING'      // 신청접수
  | 'PAYMENT_WAIT' // 입금대기
  | 'CONFIRMED'    // 대관확정
  | 'CANCELLED'    // 예약취소

// 상태 변경 알림
export interface STOStatusChange {
  reqstSn: string
  applicantName: string
  rentalDate: string
  facilityName: string
  previousStatus: STOBookingStatus | null
  newStatus: STOBookingStatus
  changedAt: Date
}

export interface STOSyncResult {
  success: boolean
  totalCount: number
  newBookings: STOBookingListItem[]
  statusChanges: STOStatusChange[]
  errors: string[]
  syncedAt: Date
}

// STO 시스템 설정
export const STO_CONFIG = {
  baseUrl: 'https://sto3788.sto.or.kr',
  loginPath: '/sto3788/loginout/login',
  loginActionPath: '/sto3788/loginout/loginAction',
  listPath: '/sto3788/reserveManage/stdioresvesttus/list',
  detailPath: '/sto3788/reserveManage/stdioresvesttus/view',
  // 세션 만료 시간 (30분)
  sessionExpiryMinutes: 30,
  // 페이지당 항목 수
  itemsPerPage: 10,
}

// 시설 ID 매핑 (STO → 내부)
// STO: 대형 스튜디오, 1인 스튜디오 #1, 1인 스튜디오 #2
// 내부 DB: 메인 스튜디오(1), 1인 스튜디오(부모)(2), 1인 스튜디오 A(3), 1인 스튜디오 B(4)
export const FACILITY_MAP: Record<string, number> = {
  '대형 스튜디오': 1,         // 메인 스튜디오
  '1인 스튜디오 #1': 3,       // 1인 스튜디오 A
  '1인 스튜디오 #2': 4,       // 1인 스튜디오 B
  '1인 스튜디오 A': 3,        // 호환성
  '1인 스튜디오 B': 4,        // 호환성
}

// 상태 텍스트 매핑
export const STATUS_MAP: Record<string, STOBookingStatus> = {
  '신청접수': 'PENDING',
  '입금대기': 'PAYMENT_WAIT',
  '대관확정': 'CONFIRMED',
  '예약취소': 'CANCELLED',
}
