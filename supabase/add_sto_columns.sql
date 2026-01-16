-- STO 연동을 위한 bookings 테이블 컬럼 추가
-- 2026-01-16

-- STO 예약 고유번호 컬럼 추가
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS sto_reqst_sn TEXT;

-- 이메일 컬럼 추가 (STO 상세 정보)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS email TEXT;

-- STO 예약번호 인덱스 추가 (동기화 성능 향상)
CREATE INDEX IF NOT EXISTS idx_bookings_sto_reqst_sn ON bookings(sto_reqst_sn);

-- STO 예약번호 유니크 제약 (중복 동기화 방지)
-- null은 유니크 제약에서 제외됨
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_sto_reqst_sn_unique
ON bookings(sto_reqst_sn)
WHERE sto_reqst_sn IS NOT NULL;

COMMENT ON COLUMN bookings.sto_reqst_sn IS 'STO 예약 시스템의 고유번호 (reqstSn)';
COMMENT ON COLUMN bookings.email IS '신청자 이메일';
