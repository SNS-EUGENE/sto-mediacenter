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

export type BookingInsert = Omit<Booking, 'id' | 'created_at' | 'updated_at' | 'email' | 'sto_reqst_sn'> & {
  studio_id: number;
  rental_date: string;
  time_slots: number[];
  applicant_name: string;
  phone: string;
  email?: string | null;
  sto_reqst_sn?: string | null;
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
