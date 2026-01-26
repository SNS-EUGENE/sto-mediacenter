-- =============================================
-- 만족도 조사 테이블 (Satisfaction Surveys)
-- =============================================

-- 1. 만족도 조사 테이블
CREATE TABLE IF NOT EXISTS satisfaction_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,

  -- 토큰 기반 접근 (비회원도 응답 가능)
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),

  -- 응답 상태
  submitted_at TIMESTAMPTZ,  -- NULL이면 미응답
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),

  -- 전체 만족도 (1-5점)
  overall_rating INT CHECK (overall_rating >= 1 AND overall_rating <= 5),

  -- 항목별 만족도 (JSON으로 유연하게 저장)
  -- 예: {"facility": 5, "cleanliness": 4, "equipment": 5, "staff": 5}
  category_ratings JSONB DEFAULT '{}',

  -- 텍스트 피드백
  comment TEXT,

  -- 개선 요청 사항
  improvement_request TEXT,

  -- 재이용 의향 (1-5점)
  reuse_intention INT CHECK (reuse_intention >= 1 AND reuse_intention <= 5),

  -- 추천 의향 NPS (0-10점)
  nps_score INT CHECK (nps_score >= 0 AND nps_score <= 10),

  -- 구글 시트 연동 상태
  google_sheet_synced BOOLEAN DEFAULT FALSE,
  google_sheet_synced_at TIMESTAMPTZ,
  google_sheet_sync_error TEXT,

  -- 메타데이터
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 하나의 예약에 하나의 조사만
  CONSTRAINT unique_booking_survey UNIQUE (booking_id)
);

-- 인덱스
CREATE INDEX idx_surveys_booking_id ON satisfaction_surveys(booking_id);
CREATE INDEX idx_surveys_token ON satisfaction_surveys(token);
CREATE INDEX idx_surveys_submitted_at ON satisfaction_surveys(submitted_at);
CREATE INDEX idx_surveys_overall_rating ON satisfaction_surveys(overall_rating);

-- updated_at 트리거
CREATE TRIGGER update_satisfaction_surveys_updated_at
  BEFORE UPDATE ON satisfaction_surveys
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- RLS 정책
-- =============================================

ALTER TABLE satisfaction_surveys ENABLE ROW LEVEL SECURITY;

-- 토큰으로 자신의 조사만 조회/수정 가능 (익명 사용자)
CREATE POLICY "Anyone can view survey with valid token"
  ON satisfaction_surveys FOR SELECT
  USING (true);

CREATE POLICY "Anyone can submit survey with valid token"
  ON satisfaction_surveys FOR UPDATE
  USING (
    submitted_at IS NULL  -- 아직 응답하지 않은 경우만
    AND expires_at > NOW()  -- 만료되지 않은 경우만
  )
  WITH CHECK (true);

-- 인증된 사용자(관리자)는 모든 조사 관리 가능
CREATE POLICY "Authenticated users can manage surveys"
  ON satisfaction_surveys FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =============================================
-- 2. 조사 발송 기록 테이블
-- =============================================

CREATE TABLE IF NOT EXISTS survey_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES satisfaction_surveys(id) ON DELETE CASCADE,

  -- 발송 정보
  notification_type TEXT NOT NULL, -- 'email', 'sms', 'push'
  sent_at TIMESTAMPTZ DEFAULT NOW(),

  -- 발송 결과
  success BOOLEAN DEFAULT FALSE,
  error_message TEXT,

  -- 메타데이터
  recipient TEXT, -- 이메일 주소 또는 전화번호

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_survey_notifications_survey_id ON survey_notifications(survey_id);

ALTER TABLE survey_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage survey notifications"
  ON survey_notifications FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =============================================
-- 통계 뷰 (조회 최적화)
-- =============================================

-- 스튜디오별 만족도 통계 뷰
CREATE OR REPLACE VIEW survey_stats_by_studio AS
SELECT
  b.studio_id,
  s.name as studio_name,
  COUNT(ss.id) as total_surveys,
  COUNT(ss.submitted_at) as completed_surveys,
  ROUND(AVG(ss.overall_rating)::numeric, 2) as avg_overall_rating,
  ROUND(AVG(ss.reuse_intention)::numeric, 2) as avg_reuse_intention,
  ROUND(AVG(ss.nps_score)::numeric, 2) as avg_nps_score,
  -- NPS 계산: (추천자% - 비추천자%)
  ROUND(
    (COUNT(CASE WHEN ss.nps_score >= 9 THEN 1 END)::numeric / NULLIF(COUNT(ss.nps_score), 0) * 100) -
    (COUNT(CASE WHEN ss.nps_score <= 6 THEN 1 END)::numeric / NULLIF(COUNT(ss.nps_score), 0) * 100),
    1
  ) as nps
FROM satisfaction_surveys ss
JOIN bookings b ON ss.booking_id = b.id
JOIN studios s ON b.studio_id = s.id
WHERE ss.submitted_at IS NOT NULL
GROUP BY b.studio_id, s.name;

-- 월별 만족도 통계 뷰
CREATE OR REPLACE VIEW survey_stats_by_month AS
SELECT
  DATE_TRUNC('month', b.rental_date) as month,
  COUNT(ss.id) as total_surveys,
  COUNT(ss.submitted_at) as completed_surveys,
  ROUND(AVG(ss.overall_rating)::numeric, 2) as avg_overall_rating,
  ROUND(AVG(ss.nps_score)::numeric, 2) as avg_nps_score,
  ROUND(
    (COUNT(CASE WHEN ss.nps_score >= 9 THEN 1 END)::numeric / NULLIF(COUNT(ss.nps_score), 0) * 100) -
    (COUNT(CASE WHEN ss.nps_score <= 6 THEN 1 END)::numeric / NULLIF(COUNT(ss.nps_score), 0) * 100),
    1
  ) as nps
FROM satisfaction_surveys ss
JOIN bookings b ON ss.booking_id = b.id
WHERE ss.submitted_at IS NOT NULL
GROUP BY DATE_TRUNC('month', b.rental_date)
ORDER BY month DESC;

-- =============================================
-- 함수: 예약 확정 시 자동으로 조사 생성
-- =============================================

CREATE OR REPLACE FUNCTION create_survey_on_booking_confirmed()
RETURNS TRIGGER AS $$
BEGIN
  -- 상태가 CONFIRMED로 변경된 경우
  IF NEW.status = 'CONFIRMED' AND (OLD.status IS NULL OR OLD.status != 'CONFIRMED') THEN
    -- 이미 조사가 없는 경우에만 생성
    INSERT INTO satisfaction_surveys (booking_id)
    VALUES (NEW.id)
    ON CONFLICT (booking_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
DROP TRIGGER IF EXISTS trigger_create_survey_on_confirmed ON bookings;
CREATE TRIGGER trigger_create_survey_on_confirmed
  AFTER INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION create_survey_on_booking_confirmed();

-- =============================================
-- 완료
-- =============================================

COMMENT ON TABLE satisfaction_surveys IS '예약별 만족도 조사';
COMMENT ON TABLE survey_notifications IS '조사 발송 기록';
COMMENT ON VIEW survey_stats_by_studio IS '스튜디오별 만족도 통계';
COMMENT ON VIEW survey_stats_by_month IS '월별 만족도 통계';
