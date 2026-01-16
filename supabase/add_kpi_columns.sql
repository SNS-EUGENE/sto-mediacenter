-- KPI 테이블 컬럼 추가
-- 실행: Supabase SQL Editor에서 실행

-- ========================================
-- 1. 프로그램 타입 컬럼 추가
-- ========================================
ALTER TABLE programs
ADD COLUMN IF NOT EXISTS program_type VARCHAR(50) DEFAULT 'OTHER';

-- 프로그램 타입 값:
-- EXPERIENCE_DAY: 체험데이
-- LECTURE: 강연
-- CONSULTING: 컨설팅
-- OTHER: 기타

COMMENT ON COLUMN programs.program_type IS '프로그램 유형: EXPERIENCE_DAY(체험데이), LECTURE(강연), CONSULTING(컨설팅), OTHER(기타)';

-- ========================================
-- 2. 콘텐츠 미디어 타입 컬럼 추가 (영상 송출 위치)
-- ========================================
ALTER TABLE contents
ADD COLUMN IF NOT EXISTS media_type VARCHAR(50) DEFAULT NULL;

-- 미디어 타입 값 (영상일 경우):
-- SPHERE: 구형(球形) 미디어
-- PILLAR: 기둥형 미디어
-- FACADE: 외부 파사드

COMMENT ON COLUMN contents.media_type IS '영상 송출 위치: SPHERE(구형), PILLAR(기둥형), FACADE(외부 파사드)';
