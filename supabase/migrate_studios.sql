-- =============================================
-- 스튜디오 계층 구조 마이그레이션 스크립트
-- 기존 데이터를 새 구조로 변환
-- =============================================

-- 1. 먼저 기존 FK 제약 제거
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_studio_id_fkey;

-- 2. 기존 스튜디오 ID 매핑 (bookings)
-- 기존: 1=메인, 2=1인A, 3=1인B
-- 신규: 1=메인, 2=1인(카테고리), 3=스튜디오A, 4=스튜디오B
-- 순서 중요: 3->4 먼저, 그 다음 2->3
UPDATE bookings SET studio_id = 4 WHERE studio_id = 3;
UPDATE bookings SET studio_id = 3 WHERE studio_id = 2;

-- 3. equipments 테이블의 location 업데이트
UPDATE equipments SET location = '스튜디오 A' WHERE location = '1인 스튜디오 A';
UPDATE equipments SET location = '스튜디오 B' WHERE location = '1인 스튜디오 B';

-- 4. studios 테이블 재구성
DROP TABLE IF EXISTS studios CASCADE;

CREATE TABLE studios (
  id SERIAL PRIMARY KEY,
  parent_id INT REFERENCES studios(id) ON DELETE SET NULL,
  name TEXT NOT NULL UNIQUE,
  alias TEXT,
  description TEXT,
  capacity INT DEFAULT 1,
  is_category BOOLEAN DEFAULT FALSE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 새 스튜디오 데이터 삽입
INSERT INTO studios (id, parent_id, name, alias, description, capacity, is_category, sort_order) VALUES
  (1, NULL, '메인 스튜디오', '메인', '다목적 대형 공간, 최대 30인 수용', 30, false, 1),
  (2, NULL, '1인 스튜디오', '1인', '개인 크리에이터용 소형 스튜디오 (A/B)', 0, true, 2),
  (3, 2, '스튜디오 A', 'A', '개인 크리에이터용 소형 스튜디오', 2, false, 1),
  (4, 2, '스튜디오 B', 'B', '개인 크리에이터용 소형 스튜디오', 2, false, 2);

SELECT setval('studios_id_seq', 4);

-- 6. Foreign Key 재설정
ALTER TABLE bookings
  ADD CONSTRAINT bookings_studio_id_fkey
  FOREIGN KEY (studio_id) REFERENCES studios(id) ON DELETE CASCADE;

-- 7. RLS 정책 재설정
ALTER TABLE studios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Studios are viewable by everyone"
  ON studios FOR SELECT
  USING (true);

-- 8. 결과 확인
SELECT s.id, s.parent_id, s.name, s.alias, s.is_category,
       (SELECT COUNT(*) FROM bookings b WHERE b.studio_id = s.id) as booking_count
FROM studios s
ORDER BY s.sort_order, s.id;

-- =============================================
-- STO 상세 필드 추가 마이그레이션 (별도 실행)
-- =============================================
-- ALTER TABLE bookings ADD COLUMN IF NOT EXISTS business_license_url TEXT;
