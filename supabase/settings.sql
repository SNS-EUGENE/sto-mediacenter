-- 설정 테이블
-- 키-값 형태로 시스템 설정을 저장

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 업데이트 트리거
CREATE OR REPLACE FUNCTION update_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS settings_updated_at ON settings;
CREATE TRIGGER settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW
  EXECUTE FUNCTION update_settings_timestamp();

-- RLS 정책
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users" ON settings
  FOR ALL USING (true);

-- 기본 설정값
INSERT INTO settings (key, value, description) VALUES
  ('survey_google_sheet_url', NULL, '만족도조사 결과를 저장할 구글 시트 URL')
ON CONFLICT (key) DO NOTHING;
