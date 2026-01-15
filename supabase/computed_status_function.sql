-- =============================================
-- 예약 상태 계산 함수 및 뷰
-- CONFIRMED 상태를 현재 시간 기준으로 IN_USE/DONE으로 계산
-- =============================================

-- 1. 상태 계산 함수
CREATE OR REPLACE FUNCTION compute_booking_status(
  p_status booking_status,
  p_rental_date DATE,
  p_time_slots INT[],
  p_now TIMESTAMPTZ DEFAULT NOW()
)
RETURNS booking_status AS $$
DECLARE
  v_today DATE;
  v_current_hour INT;
  v_min_slot INT;
  v_max_slot INT;
BEGIN
  -- CONFIRMED가 아니면 원래 상태 반환
  IF p_status != 'CONFIRMED' THEN
    RETURN p_status;
  END IF;

  v_today := (p_now AT TIME ZONE 'Asia/Seoul')::DATE;
  v_current_hour := EXTRACT(HOUR FROM p_now AT TIME ZONE 'Asia/Seoul')::INT;

  -- 예약일이 오늘 이전이면 DONE
  IF p_rental_date < v_today THEN
    RETURN 'DONE';
  END IF;

  -- 예약일이 오늘 이후면 CONFIRMED 유지
  IF p_rental_date > v_today THEN
    RETURN 'CONFIRMED';
  END IF;

  -- 예약일이 오늘인 경우 - 시간대 확인
  IF p_time_slots IS NULL OR array_length(p_time_slots, 1) IS NULL THEN
    RETURN 'CONFIRMED';
  END IF;

  SELECT MIN(slot), MAX(slot) INTO v_min_slot, v_max_slot
  FROM unnest(p_time_slots) AS slot;

  -- 현재 시간이 예약 시간대 내에 있으면 IN_USE
  IF v_current_hour >= v_min_slot AND v_current_hour <= v_max_slot THEN
    RETURN 'IN_USE';
  END IF;

  -- 예약 시간이 이미 지났으면 DONE
  IF v_current_hour > v_max_slot THEN
    RETURN 'DONE';
  END IF;

  -- 예약 시간 전이면 CONFIRMED 유지
  RETURN 'CONFIRMED';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. 계산된 상태를 포함한 뷰 생성
CREATE OR REPLACE VIEW bookings_with_computed_status AS
SELECT
  *,
  compute_booking_status(status, rental_date, time_slots) AS computed_status
FROM bookings;

-- 3. 통계용 함수: 기간별 상태 집계
CREATE OR REPLACE FUNCTION get_booking_stats_by_period(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  computed_status booking_status,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    compute_booking_status(b.status, b.rental_date, b.time_slots) AS computed_status,
    COUNT(*)::BIGINT
  FROM bookings b
  WHERE b.rental_date BETWEEN p_start_date AND p_end_date
  GROUP BY compute_booking_status(b.status, b.rental_date, b.time_slots);
END;
$$ LANGUAGE plpgsql;

-- 4. 스튜디오별 이용률 통계 (계산된 상태 기준)
CREATE OR REPLACE FUNCTION get_studio_utilization(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  studio_id INT,
  total_bookings BIGINT,
  confirmed_count BIGINT,
  in_use_count BIGINT,
  done_count BIGINT,
  cancelled_count BIGINT,
  total_hours BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.studio_id::INT,
    COUNT(*)::BIGINT AS total_bookings,
    COUNT(*) FILTER (WHERE compute_booking_status(b.status, b.rental_date, b.time_slots) = 'CONFIRMED')::BIGINT,
    COUNT(*) FILTER (WHERE compute_booking_status(b.status, b.rental_date, b.time_slots) = 'IN_USE')::BIGINT,
    COUNT(*) FILTER (WHERE compute_booking_status(b.status, b.rental_date, b.time_slots) = 'DONE')::BIGINT,
    COUNT(*) FILTER (WHERE compute_booking_status(b.status, b.rental_date, b.time_slots) = 'CANCELLED')::BIGINT,
    COALESCE(SUM(array_length(b.time_slots, 1)), 0)::BIGINT AS total_hours
  FROM bookings b
  WHERE b.rental_date BETWEEN p_start_date AND p_end_date
  GROUP BY b.studio_id;
END;
$$ LANGUAGE plpgsql;

-- 완료!
-- 사용 예시:
-- SELECT * FROM bookings_with_computed_status WHERE rental_date = CURRENT_DATE;
-- SELECT * FROM get_booking_stats_by_period('2026-01-01', '2026-12-31');
-- SELECT * FROM get_studio_utilization('2026-01-01', '2026-03-31');
