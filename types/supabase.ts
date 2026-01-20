// =============================================
// Supabase Database Types
// Auto-generated types based on init.sql schema
// =============================================

// Database Enums
export type BookingStatus = 'APPLIED' | 'PENDING' | 'CONFIRMED' | 'IN_USE' | 'DONE' | 'CANCELLED';

export type EquipmentStatus = 'NORMAL' | 'BROKEN' | 'MALFUNCTION' | 'REPAIRING' | 'REPAIRED';

// Time Slots (09:00 ~ 18:00)
export type TimeSlot = 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17;

// =============================================
// Database Tables
// =============================================

export interface Studio {
  id: number;
  parent_id: number | null;      // 상위 스튜디오 ID (계층 구조)
  name: string;
  alias: string | null;          // 짧은 별칭 (메인, A, B 등)
  description: string | null;
  capacity: number;              // 수용 인원
  is_category: boolean;          // 카테고리(그룹)인지 여부
  sort_order: number;            // 정렬 순서
  created_at: string;
}

export interface Booking {
  id: string;
  studio_id: number;
  rental_date: string; // YYYY-MM-DD
  time_slots: number[];
  applicant_name: string;
  organization: string | null;
  phone: string;
  email: string | null;
  event_name: string | null;
  purpose: string | null;
  participants_count: number;
  payment_confirmed: boolean;
  status: BookingStatus;
  fee: number | null; // 이용료
  cancelled_at: string | null; // 취소 일시
  sto_reqst_sn: string | null; // STO 예약 고유번호
  // STO 상세 정보
  special_note: string | null; // 특이사항
  user_type: string | null; // 사용자 신청 유형
  discount_rate: number | null; // 대관료 할인율 (%)
  company_phone: string | null; // 전화번호
  business_license: string | null; // 사업자등록증 파일명
  business_license_url: string | null; // 사업자등록증 다운로드 URL
  receipt_type: string | null; // 증빙 발행 유형
  business_number: string | null; // 사업자번호
  has_no_show: boolean | null; // No-Show 여부
  no_show_memo: string | null; // No-Show 메모
  studio_usage_method: string | null; // 스튜디오 사용 방식
  file_delivery_method: string | null; // 파일 원본 수령 방법
  pre_meeting_contact: string | null; // 사전 미팅 연락처
  other_inquiry: string | null; // 기타 문의사항
  created_at: string;
  updated_at: string;
}

export interface Equipment {
  id: string; // 일련번호 (MS-001-A 형식)
  original_index: string; // 엑셀 원본 연번
  name: string;
  category: string;
  spec: string | null;
  location: string; // 메인 스튜디오, 1인 스튜디오 A/B
  sub_location: string | null; // 스튜디오, 조정실, 서버실
  quantity: number;
  unit: string;
  serial_number: string | null; // 제조사 시리얼넘버
  status: EquipmentStatus;
  notes: string | null;
  is_material: boolean;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

// =============================================
// Join Types (with Relations)
// =============================================

export interface BookingWithStudio extends Booking {
  studio: Studio;
}

// =============================================
// Insert Types (for Creating Records)
// =============================================

export type StudioInsert = Omit<Studio, 'id' | 'created_at'>;

export type BookingInsert = {
  studio_id: number;
  rental_date: string;
  time_slots: number[];
  applicant_name: string;
  phone: string;
  organization?: string | null;
  email?: string | null;
  event_name?: string | null;
  purpose?: string | null;
  participants_count?: number;
  payment_confirmed?: boolean;
  status?: BookingStatus;
  fee?: number | null;
  cancelled_at?: string | null;
  sto_reqst_sn?: string | null;
  // STO 상세 필드 (선택)
  special_note?: string | null;
  user_type?: string | null;
  discount_rate?: number | null;
  company_phone?: string | null;
  business_license?: string | null;
  business_license_url?: string | null;
  receipt_type?: string | null;
  business_number?: string | null;
  has_no_show?: boolean | null;
  no_show_memo?: string | null;
  studio_usage_method?: string | null;
  file_delivery_method?: string | null;
  pre_meeting_contact?: string | null;
  other_inquiry?: string | null;
};

export type EquipmentInsert = Omit<Equipment, 'id' | 'created_at' | 'updated_at'> & {
  name: string;
};

// =============================================
// Update Types (for Updating Records)
// =============================================

export type BookingUpdate = Partial<Omit<Booking, 'id' | 'created_at' | 'updated_at'>>;

export type EquipmentUpdate = Partial<Omit<Equipment, 'id' | 'created_at' | 'updated_at'>>;

// =============================================
// Database Schema Type (for Supabase Client)
// =============================================

export interface Database {
  public: {
    Tables: {
      studios: {
        Row: Studio;
        Insert: StudioInsert;
        Update: Partial<StudioInsert>;
      };
      bookings: {
        Row: Booking;
        Insert: BookingInsert;
        Update: BookingUpdate;
      };
      equipments: {
        Row: Equipment;
        Insert: EquipmentInsert;
        Update: EquipmentUpdate;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      check_booking_conflict: {
        Args: {
          p_studio_id: number;
          p_rental_date: string;
          p_time_slots: number[];
          p_exclude_booking_id?: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      booking_status: BookingStatus;
      equipment_status: EquipmentStatus;
    };
  };
}
