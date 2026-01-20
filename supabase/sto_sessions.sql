-- =============================================
-- STO 세션 영속화 테이블
-- 로그인 세션을 DB에 저장하여 서버 재시작 후에도 유지
-- =============================================

CREATE TABLE IF NOT EXISTS sto_sessions (
  id INT PRIMARY KEY DEFAULT 1,  -- 단일 레코드만 유지
  cookies TEXT NOT NULL,          -- JSESSIONID 등 쿠키 문자열
  expires_at TIMESTAMPTZ NOT NULL, -- 세션 만료 시간
  last_sync_at TIMESTAMPTZ,       -- 마지막 동기화 시간
  last_keepalive_at TIMESTAMPTZ,  -- 마지막 keep-alive 시간
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 단일 레코드만 허용
  CONSTRAINT single_session CHECK (id = 1)
);

-- RLS 정책 (서버 사이드에서만 접근)
ALTER TABLE sto_sessions ENABLE ROW LEVEL SECURITY;

-- 서비스 롤만 접근 가능 (anon은 접근 불가)
CREATE POLICY "Service role only" ON sto_sessions
  FOR ALL
  USING (auth.role() = 'service_role');

-- 업데이트 시 updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_sto_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sto_session_updated
  BEFORE UPDATE ON sto_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_sto_session_timestamp();

-- 초기 레코드 삽입 (빈 세션)
INSERT INTO sto_sessions (id, cookies, expires_at)
VALUES (1, '', NOW())
ON CONFLICT (id) DO NOTHING;
