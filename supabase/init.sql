-- =============================================
-- 종로 서울관광플라자 스튜디오 대관 및 장비 자산 관리 시스템 (FMS)
-- Database Schema Initialization
-- =============================================

-- Drop existing objects if they exist
DROP TABLE IF EXISTS equipments CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS studios CASCADE;
DROP TYPE IF EXISTS booking_status CASCADE;
DROP TYPE IF EXISTS equipment_status CASCADE;

-- =============================================
-- ENUMS
-- =============================================

-- 예약 상태 (APPLIED -> PENDING -> CONFIRMED -> IN_USE -> DONE)
CREATE TYPE booking_status AS ENUM (
  'APPLIED',      -- 신청
  'PENDING',      -- 승인대기
  'CONFIRMED',    -- 확정(입금완료)
  'IN_USE',       -- 사용중
  'DONE'          -- 사용완료
);

-- 장비 상태
CREATE TYPE equipment_status AS ENUM (
  'NORMAL',       -- 정상
  'BROKEN',       -- 파손
  'MALFUNCTION',  -- 고장
  'REPAIRING',    -- 수리중
  'REPAIRED'      -- 수리완료
);

-- =============================================
-- TABLES
-- =============================================

-- 1. 스튜디오 (Seed Data)
CREATE TABLE studios (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 스튜디오 초기 데이터 (대형 스튜디오, 1인 스튜디오 A, 1인 스튜디오 B)
INSERT INTO studios (name, description) VALUES
  ('대형 스튜디오', '다목적 대형 공간, 최대 30인 수용'),
  ('1인 스튜디오 A', '개인 크리에이터용 소형 스튜디오'),
  ('1인 스튜디오 B', '개인 크리에이터용 소형 스튜디오');

-- 2. 예약 관리
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id INT NOT NULL REFERENCES studios(id) ON DELETE CASCADE,

  -- 예약 날짜 및 시간대
  rental_date DATE NOT NULL,
  time_slots INT[] NOT NULL DEFAULT '{}', -- 예: [9, 10] = 09:00-11:00

  -- 신청자 정보
  applicant_name TEXT NOT NULL,
  organization TEXT,
  phone TEXT NOT NULL,

  -- 엑셀 데이터 매핑
  event_name TEXT,              -- 행사명
  purpose TEXT,                 -- 사용목적
  participants_count INT DEFAULT 1, -- 사용인원

  -- 상태 관리
  payment_confirmed BOOLEAN DEFAULT FALSE, -- 입금 확인 여부
  status booking_status DEFAULT 'APPLIED' NOT NULL,

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 제약조건: 운영시간은 09:00 ~ 18:00 (9~17시)
  CONSTRAINT valid_time_slots CHECK (
    time_slots <@ ARRAY[9,10,11,12,13,14,15,16,17]
  ),

  -- 인덱스 최적화
  CONSTRAINT positive_participants CHECK (participants_count > 0)
);

-- 예약 조회 최적화를 위한 인덱스
CREATE INDEX idx_bookings_rental_date ON bookings(rental_date);
CREATE INDEX idx_bookings_studio_date ON bookings(studio_id, rental_date);
CREATE INDEX idx_bookings_status ON bookings(status);

-- 3. 장비 자산 관리 (예약과 독립적)
CREATE TABLE equipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 장비 정보
  name TEXT NOT NULL,           -- 장비명 (예: 'Sony A7M3')
  serial_alias TEXT,            -- 동일 장비 구분 (예: 'A', 'B', 'C')
  location TEXT,                -- 현재 위치/보관함

  -- 상태 관리
  status equipment_status DEFAULT 'NORMAL' NOT NULL,
  image_url TEXT,               -- 현장 사진 URL
  notes TEXT,                   -- 비고/특이사항

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 장비 조회 최적화를 위한 인덱스
CREATE INDEX idx_equipments_status ON equipments(status);
CREATE INDEX idx_equipments_name ON equipments(name);

-- =============================================
-- TRIGGERS (자동 updated_at 갱신)
-- =============================================

-- updated_at 자동 갱신 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- bookings 테이블에 트리거 적용
CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- equipments 테이블에 트리거 적용
CREATE TRIGGER update_equipments_updated_at
  BEFORE UPDATE ON equipments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- TRIGGER: 입금 확인 시 자동 상태 변경
-- =============================================

-- 입금 확인 시 status를 CONFIRMED로 자동 변경
CREATE OR REPLACE FUNCTION auto_confirm_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_confirmed = TRUE AND OLD.payment_confirmed = FALSE THEN
    NEW.status = 'CONFIRMED';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_confirm_on_payment
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION auto_confirm_on_payment();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- RLS 활성화
ALTER TABLE studios ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipments ENABLE ROW LEVEL SECURITY;

-- 스튜디오: 모든 사용자 읽기 가능 (Kiosk 모드 지원)
CREATE POLICY "Studios are viewable by everyone"
  ON studios FOR SELECT
  USING (true);

-- 예약: 모든 사용자 읽기 가능 (Kiosk 모드 지원)
CREATE POLICY "Bookings are viewable by everyone"
  ON bookings FOR SELECT
  USING (true);

-- 예약: 인증된 사용자만 CRUD 가능 (관리자)
CREATE POLICY "Authenticated users can insert bookings"
  ON bookings FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update bookings"
  ON bookings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete bookings"
  ON bookings FOR DELETE
  TO authenticated
  USING (true);

-- 장비: 모든 사용자 읽기 가능
CREATE POLICY "Equipments are viewable by everyone"
  ON equipments FOR SELECT
  USING (true);

-- 장비: 인증된 사용자만 CRUD 가능 (모바일 점검용)
CREATE POLICY "Authenticated users can insert equipments"
  ON equipments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update equipments"
  ON equipments FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete equipments"
  ON equipments FOR DELETE
  TO authenticated
  USING (true);

-- =============================================
-- FUNCTIONS: 중복 예약 방지
-- =============================================

-- 특정 스튜디오/날짜/시간대 중복 체크 함수
CREATE OR REPLACE FUNCTION check_booking_conflict(
  p_studio_id INT,
  p_rental_date DATE,
  p_time_slots INT[],
  p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  conflict_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM bookings
    WHERE studio_id = p_studio_id
      AND rental_date = p_rental_date
      AND time_slots && p_time_slots -- 배열 겹침 체크
      AND status NOT IN ('DONE') -- 완료된 예약은 제외
      AND (p_exclude_booking_id IS NULL OR id != p_exclude_booking_id)
  ) INTO conflict_exists;

  RETURN conflict_exists;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- SAMPLE DATA (Optional - for testing)
-- =============================================

-- 테스트용 예약 데이터 (Optional)
-- INSERT INTO bookings (studio_id, rental_date, time_slots, applicant_name, organization, phone, event_name, purpose, participants_count, status)
-- VALUES
--   (1, '2026-01-15', ARRAY[9,10,11], '김철수', '서울문화재단', '010-1234-5678', '신년 촬영회', '홍보영상 제작', 15, 'CONFIRMED'),
--   (2, '2026-01-15', ARRAY[14,15], '이영희', '개인', '010-9876-5432', 'YouTube 촬영', '개인 콘텐츠 제작', 1, 'APPLIED');

-- 테스트용 장비 데이터 (Optional)
-- INSERT INTO equipments (name, serial_alias, location, status, notes)
-- VALUES
--   ('Sony A7M3', 'A', '1층 장비실 A-01', 'NORMAL', '렌즈: 24-70mm 포함'),
--   ('Sony A7M3', 'B', '1층 장비실 A-02', 'NORMAL', '렌즈: 24-70mm 포함'),
--   ('조명 스탠드', 'A', '2층 보관함', 'BROKEN', '지지대 균열 발견'),
--   ('무선 마이크', 'A', '1층 장비실 B-05', 'NORMAL', NULL);

-- =============================================
-- COMPLETION
-- =============================================

COMMENT ON TABLE studios IS '스튜디오 정보 (대형, 1인A, 1인B)';
COMMENT ON TABLE bookings IS '예약 관리 (엑셀 업로드 기반)';
COMMENT ON TABLE equipments IS '장비 자산 관리 (예약과 독립적)';
