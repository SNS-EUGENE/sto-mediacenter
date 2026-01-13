// =============================================
// Supabase Database Types
// Auto-generated types based on init.sql schema
// =============================================

// Database Enums
export type BookingStatus = 'APPLIED' | 'PENDING' | 'CONFIRMED' | 'IN_USE' | 'DONE';

export type EquipmentStatus = 'NORMAL' | 'BROKEN' | 'MALFUNCTION' | 'REPAIRING' | 'REPAIRED';

// Time Slots (09:00 ~ 18:00)
export type TimeSlot = 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17;

// =============================================
// Database Tables
// =============================================

export interface Studio {
  id: number;
  name: string;
  description: string | null;
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
  event_name: string | null;
  purpose: string | null;
  participants_count: number;
  payment_confirmed: boolean;
  status: BookingStatus;
  created_at: string;
  updated_at: string;
}

export interface Equipment {
  id: string;
  name: string;
  serial_alias: string | null;
  location: string | null;
  status: EquipmentStatus;
  image_url: string | null;
  notes: string | null;
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

export type BookingInsert = Omit<Booking, 'id' | 'created_at' | 'updated_at'> & {
  studio_id: number;
  rental_date: string;
  time_slots: number[];
  applicant_name: string;
  phone: string;
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
