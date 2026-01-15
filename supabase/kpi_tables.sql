-- KPI 관련 테이블 정의
-- 실행: Supabase SQL Editor에서 실행

-- 1. 프로그램 운영 테이블
CREATE TABLE IF NOT EXISTS programs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  participants_count INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'PLANNED', -- PLANNED, COMPLETED, CANCELLED
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 2. 콘텐츠 제작 테이블
CREATE TABLE IF NOT EXISTS contents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content_type VARCHAR(100), -- VIDEO, IMAGE, DOCUMENT, etc.
  description TEXT,
  production_date DATE NOT NULL,
  creator VARCHAR(255),
  status VARCHAR(50) DEFAULT 'IN_PROGRESS', -- IN_PROGRESS, COMPLETED, PUBLISHED
  url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 3. 굿즈 및 이벤트 테이블
CREATE TABLE IF NOT EXISTS goods_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  event_type VARCHAR(100), -- GOODS, EVENT, PROMOTION
  description TEXT,
  target_count INTEGER DEFAULT 0,
  achieved_count INTEGER DEFAULT 0,
  start_date DATE,
  end_date DATE,
  status VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE, COMPLETED, CANCELLED
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 4. KPI 연간 목표 테이블 (수동 설정 가능)
CREATE TABLE IF NOT EXISTS kpi_targets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  year INTEGER NOT NULL,
  category VARCHAR(100) NOT NULL, -- PROGRAM, CONTENT, GOODS, STUDIO, MEMBERSHIP, PARTNERSHIP
  target_value INTEGER NOT NULL,
  unit VARCHAR(50) NOT NULL, -- 회, 건, %, 명, 곳
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(year, category)
);

-- 기본 KPI 목표 데이터 삽입 (2025년)
INSERT INTO kpi_targets (year, category, target_value, unit, description) VALUES
  (2025, 'PROGRAM', 60, '회', '프로그램 운영 활성화'),
  (2025, 'CONTENT', 60, '건', '콘텐츠 기획 제작'),
  (2025, 'GOODS', 100, '%', '굿즈 및 이벤트 운영'),
  (2025, 'STUDIO', 250, '건', '스튜디오 활성화 (247 영업일 기준)'),
  (2025, 'MEMBERSHIP', 230, '명', '멤버십 운영 강화'),
  (2025, 'PARTNERSHIP', 2, '곳', '장기 이용자 확보')
ON CONFLICT (year, category) DO UPDATE SET
  target_value = EXCLUDED.target_value,
  unit = EXCLUDED.unit,
  description = EXCLUDED.description,
  updated_at = NOW();

-- RLS 정책 (개발 환경 - 모든 접근 허용)
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_targets ENABLE ROW LEVEL SECURITY;

-- anon 사용자도 CRUD 가능하도록 임시 정책
CREATE POLICY "Allow all for programs" ON programs FOR ALL USING (true);
CREATE POLICY "Allow all for contents" ON contents FOR ALL USING (true);
CREATE POLICY "Allow all for goods_events" ON goods_events FOR ALL USING (true);
CREATE POLICY "Allow all for kpi_targets" ON kpi_targets FOR ALL USING (true);
