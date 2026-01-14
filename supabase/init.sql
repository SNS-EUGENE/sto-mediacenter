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

-- 1. 스튜디오 (Seed Data) - 계층 구조 지원
CREATE TABLE studios (
  id SERIAL PRIMARY KEY,
  parent_id INT REFERENCES studios(id) ON DELETE SET NULL,
  name TEXT NOT NULL UNIQUE,
  alias TEXT,                    -- 짧은 별칭 (메인, A, B 등)
  description TEXT,
  capacity INT DEFAULT 1,        -- 수용 인원
  is_category BOOLEAN DEFAULT FALSE, -- 카테고리(그룹)인지 여부
  sort_order INT DEFAULT 0,      -- 정렬 순서
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 스튜디오 초기 데이터 (계층 구조)
-- 1: 메인 스튜디오 (독립)
-- 2: 1인 스튜디오 (카테고리)
-- 3: 스튜디오 A (1인 스튜디오 하위)
-- 4: 스튜디오 B (1인 스튜디오 하위)
INSERT INTO studios (id, parent_id, name, alias, description, capacity, is_category, sort_order) VALUES
  (1, NULL, '메인 스튜디오', '메인', '다목적 대형 공간, 최대 30인 수용', 30, false, 1),
  (2, NULL, '1인 스튜디오', '1인', '개인 크리에이터용 소형 스튜디오 (A/B)', 0, true, 2),
  (3, 2, '스튜디오 A', 'A', '개인 크리에이터용 소형 스튜디오', 2, false, 1),
  (4, 2, '스튜디오 B', 'B', '개인 크리에이터용 소형 스튜디오', 2, false, 2);

-- 시퀀스 값 조정 (다음 ID가 5부터 시작하도록)
SELECT setval('studios_id_seq', 4);

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

-- 3. 장비/자재 자산 관리 (예약과 독립적)
CREATE TABLE equipments (
  id TEXT PRIMARY KEY,          -- 일련번호 (MS-001-A 형식)
  original_index TEXT,          -- 엑셀 원본 연번

  -- 장비 정보
  name TEXT NOT NULL,           -- 장비명/물품명
  category TEXT NOT NULL,       -- 분류 (Studio Camera System, Lighting System 등)
  spec TEXT,                    -- 내용 및 사양
  location TEXT NOT NULL,       -- 위치 (메인 스튜디오, 1인 스튜디오 A/B)
  sub_location TEXT,            -- 위치 상세 (스튜디오, 조정실, 서버실)
  quantity INT DEFAULT 1,       -- 수량 (장비=1, 자재=실제수량)
  unit TEXT DEFAULT 'EA',       -- 단위 (EA, M 등)
  serial_number TEXT,           -- 제조사 시리얼넘버

  -- 상태 관리
  status equipment_status DEFAULT 'NORMAL' NOT NULL,
  notes TEXT,                   -- 비고/특이사항
  is_material BOOLEAN DEFAULT FALSE, -- 자재 여부
  image_url TEXT,               -- 현장 사진 URL

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 장비 조회 최적화를 위한 인덱스
CREATE INDEX idx_equipments_status ON equipments(status);
CREATE INDEX idx_equipments_location ON equipments(location);
CREATE INDEX idx_equipments_category ON equipments(category);
CREATE INDEX idx_equipments_is_material ON equipments(is_material);

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
-- 실제 데이터는 장비 목록.xlsx에서 parseEquipment.js로 생성
-- INSERT INTO equipments (id, original_index, name, category, spec, location, sub_location, quantity, unit, status, is_material)
-- VALUES
--   ('MS-001-A', '1', '4K Camcoder', 'Studio Camera System', '', '메인 스튜디오', '', 1, 'EA', 'NORMAL', false),
--   ('MS-001-B', '1', '4K Camcoder', 'Studio Camera System', '', '메인 스튜디오', '', 1, 'EA', 'NORMAL', false);

-- =============================================
-- COMPLETION
-- =============================================

COMMENT ON TABLE studios IS '스튜디오 정보 (대형, 1인A, 1인B)';
COMMENT ON TABLE bookings IS '예약 관리 (엑셀 업로드 기반)';
COMMENT ON TABLE equipments IS '장비 자산 관리 (예약과 독립적)';
