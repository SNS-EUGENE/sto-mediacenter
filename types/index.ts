// =============================================
// Common Types & Utilities
// =============================================

export * from './supabase';

// =============================================
// UI/Business Logic Types
// =============================================

// 예약 필터 옵션
export interface BookingFilters {
  studioId?: number;
  status?: string[];
  dateFrom?: string;
  dateTo?: string;
  searchTerm?: string;
}

// 캘린더 뷰용 이벤트 타입
export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: {
    studioId: number;
    studioName: string;
    status: string;
    applicantName: string;
    organization?: string;
  };
}

// 타임라인 뷰용 슬롯 타입
export interface TimelineSlot {
  studioId: number;
  studioName: string;
  hour: number;
  booking?: {
    id: string;
    applicantName: string;
    organization?: string;
    status: string;
    eventName?: string;
  };
  isCurrentTime?: boolean;
}

// 통계 데이터 타입
export interface StudioStatistics {
  studioId: number;
  studioName: string;
  totalSlots: number;
  bookedSlots: number;
  utilizationRate: number; // 가동률 (%)
  period: {
    start: string;
    end: string;
  };
}

// 엑셀 업로드 매핑 타입
export interface ExcelBookingRow {
  날짜?: string;
  스튜디오?: string;
  시작시간?: string;
  종료시간?: string;
  신청자명?: string;
  단체명?: string;
  연락처?: string;
  행사명?: string;
  사용목적?: string;
  사용인원?: number;
}

// 엑셀 업로드 결과
export interface ExcelUploadResult {
  success: boolean;
  imported: number;
  failed: number;
  errors: Array<{
    row: number;
    reason: string;
  }>;
}

// 장비 점검 양식 타입
export interface EquipmentCheckForm {
  equipmentId: string;
  status: string;
  imageFile?: File;
  notes?: string;
}

// API Response 타입
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Pagination 타입
export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// 상태별 한글 라벨 매핑
export const BOOKING_STATUS_LABELS: Record<string, string> = {
  APPLIED: '신청',
  PENDING: '승인대기',
  CONFIRMED: '확정',
  IN_USE: '사용중',
  DONE: '완료',
};

export const EQUIPMENT_STATUS_LABELS: Record<string, string> = {
  NORMAL: '정상',
  BROKEN: '파손',
  MALFUNCTION: '고장',
  REPAIRING: '수리중',
  REPAIRED: '수리완료',
};

// 운영 시간 상수
export const OPERATING_HOURS = {
  START: 9,
  END: 18,
  SLOTS: [9, 10, 11, 12, 13, 14, 15, 16, 17] as const,
} as const;

// 시간 슬롯 포맷터
export const formatTimeSlot = (hour: number): string => {
  return `${hour.toString().padStart(2, '0')}:00`;
};

// 시간 슬롯 범위 포맷터
export const formatTimeSlotRange = (slots: number[]): string => {
  if (slots.length === 0) return '';
  const sortedSlots = [...slots].sort((a, b) => a - b);
  const start = sortedSlots[0];
  const end = sortedSlots[sortedSlots.length - 1] + 1;
  return `${formatTimeSlot(start)} - ${formatTimeSlot(end)}`;
};

// 날짜 포맷터 (YYYY-MM-DD)
export const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
};

// 한국 시간대 날짜 포맷터
export const formatDateKR = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
};
