// 운영 시간
export const OPERATION_HOURS = {
  START: 9,
  END: 18,
}

// 유효한 시간 슬롯 (9시 ~ 17시)
export const VALID_TIME_SLOTS = [9, 10, 11, 12, 13, 14, 15, 16, 17]

// 예약 상태
export const BOOKING_STATUS = {
  APPLIED: 'APPLIED',
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  IN_USE: 'IN_USE',
  DONE: 'DONE',
  CANCELLED: 'CANCELLED',
} as const

export const BOOKING_STATUS_LABELS: Record<string, string> = {
  APPLIED: '예약신청',
  PENDING: '승인대기',
  CONFIRMED: '대관확정',
  IN_USE: '사용중',
  DONE: '완료',
  CANCELLED: '예약취소',
}

// 장비 상태
export const EQUIPMENT_STATUS = {
  NORMAL: 'NORMAL',
  BROKEN: 'BROKEN',
  MALFUNCTION: 'MALFUNCTION',
  REPAIRING: 'REPAIRING',
  REPAIRED: 'REPAIRED',
} as const

export const EQUIPMENT_STATUS_LABELS: Record<string, string> = {
  NORMAL: '정상',
  BROKEN: '파손',
  MALFUNCTION: '고장',
  REPAIRING: '수리중',
  REPAIRED: '수리완료',
}

// 스튜디오 목록 (UI 표시용 - 3개)
// DB에서는 계층 구조 (1=메인, 2=1인카테고리, 3=A, 4=B)
// UI에서는 메인, 1인A, 1인B 3개만 표시
export const STUDIOS = [
  { id: 1, name: '메인 스튜디오', alias: '메인', description: '다목적 대형 공간, 최대 30인 수용', capacity: 30 },
  { id: 3, name: '1인 스튜디오 A', alias: '1인 A', description: '개인 크리에이터용 소형 스튜디오', capacity: 2 },
  { id: 4, name: '1인 스튜디오 B', alias: '1인 B', description: '개인 크리에이터용 소형 스튜디오', capacity: 2 },
]

// 예약 가능한 스튜디오 (= STUDIOS와 동일)
export const BOOKABLE_STUDIOS = STUDIOS

// 네비게이션 메뉴
export const NAV_ITEMS = [
  { href: '/', label: '홈', icon: 'home' },
  { href: '/bookings', label: '예약', icon: 'clipboard' },
  { href: '/calendar', label: '캘린더', icon: 'calendar' },
  { href: '/equipments', label: '장비', icon: 'camera' },
  { href: '/statistics', label: '통계', icon: 'chart' },
  { href: '/settings', label: '설정', icon: 'settings' },
]
