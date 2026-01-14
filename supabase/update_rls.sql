-- =============================================
-- RLS 정책 업데이트: anon 사용자도 CRUD 가능하도록
-- 인증 시스템 구현 전까지 임시로 사용
-- =============================================

-- 1. booking_status ENUM에 CANCELLED 추가
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'CANCELLED';

-- 2. bookings 테이블에 fee, cancelled_at 컬럼 추가 (없는 경우)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'bookings' AND column_name = 'fee') THEN
    ALTER TABLE bookings ADD COLUMN fee INT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'bookings' AND column_name = 'cancelled_at') THEN
    ALTER TABLE bookings ADD COLUMN cancelled_at TIMESTAMPTZ;
  END IF;
END $$;

-- 3. 기존 RLS 정책 삭제
DROP POLICY IF EXISTS "Authenticated users can insert bookings" ON bookings;
DROP POLICY IF EXISTS "Authenticated users can update bookings" ON bookings;
DROP POLICY IF EXISTS "Authenticated users can delete bookings" ON bookings;

DROP POLICY IF EXISTS "Authenticated users can insert equipments" ON equipments;
DROP POLICY IF EXISTS "Authenticated users can update equipments" ON equipments;
DROP POLICY IF EXISTS "Authenticated users can delete equipments" ON equipments;

-- 4. 새 RLS 정책: anon 사용자도 CRUD 가능 (인증 구현 전까지 임시)
-- 예약
CREATE POLICY "Anyone can insert bookings"
  ON bookings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update bookings"
  ON bookings FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete bookings"
  ON bookings FOR DELETE
  USING (true);

-- 장비
CREATE POLICY "Anyone can insert equipments"
  ON equipments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update equipments"
  ON equipments FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete equipments"
  ON equipments FOR DELETE
  USING (true);

-- 완료!
-- 이 SQL을 Supabase SQL Editor에서 실행하세요.
