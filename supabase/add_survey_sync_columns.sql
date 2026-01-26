-- =============================================
-- 만족도 조사 테이블에 구글 시트 연동 컬럼 추가
-- (이미 테이블이 있는 경우 실행)
-- =============================================

-- 구글 시트 연동 상태 컬럼 추가
ALTER TABLE satisfaction_surveys
ADD COLUMN IF NOT EXISTS google_sheet_synced BOOLEAN DEFAULT FALSE;

ALTER TABLE satisfaction_surveys
ADD COLUMN IF NOT EXISTS google_sheet_synced_at TIMESTAMPTZ;

ALTER TABLE satisfaction_surveys
ADD COLUMN IF NOT EXISTS google_sheet_sync_error TEXT;

-- 인덱스 추가 (연동 안된 것 빠르게 조회)
CREATE INDEX IF NOT EXISTS idx_surveys_google_sheet_synced
ON satisfaction_surveys(google_sheet_synced)
WHERE google_sheet_synced = FALSE AND submitted_at IS NOT NULL;
