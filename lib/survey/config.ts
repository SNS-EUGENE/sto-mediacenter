// 만족도 조사 문항 설정
// 2026년 온라인미디어센터 스튜디오 이용 만족도 조사 양식 기준
// 문항 추가/수정/삭제 시 이 파일만 수정하면 됩니다.

// 만족도 척도 (1-5점)
export const SATISFACTION_LEVELS = [
  { value: 5, label: '매우 만족' },
  { value: 4, label: '만족' },
  { value: 3, label: '보통' },
  { value: 2, label: '불만족' },
  { value: 1, label: '매우 불만족' },
] as const

// 항목별 만족도 질문 (순서대로 표시)
// key는 DB 호환성을 위해 유지, label만 새 양식에 맞게 수정
export const SURVEY_CATEGORIES = [
  { key: 'overall', label: '서울관광플라자 스튜디오 이용에 대한 전반적인 만족도는 어느 정도입니까?' },
  { key: 'equipment', label: '서울관광플라자 스튜디오 시설 및 장비에 대한 만족도는 어느 정도입니까?' },
  { key: 'staff', label: '서울관광플라자 스튜디오 직원 안내 및 응대에 대한 만족도는 어느 정도입니까?' },
  { key: 'cost', label: '스튜디오 대관 비용에 대해 어떻게 생각하십니까?' },
] as const

// 카테고리 키 → 라벨 매핑 (통계 페이지용, 짧은 버전)
export const CATEGORY_LABELS: Record<string, string> = {
  // 새 항목
  overall: '전반적 만족도',
  equipment: '시설 및 장비',
  staff: '직원 응대',
  cost: '대관 비용',
  // 기존 항목 (하위 호환성)
  staff_kindness: '직원 친절도',
  staff_expertise: '장비 전문성',
  booking_process: '예약 프로세스',
  cleanliness: '청결 상태',
}

// 조건부 질문 (보통 이하일 때 표시)
export const CONDITIONAL_QUESTIONS = {
  overall: {
    condition: (rating: number) => rating <= 5, // 항상 표시
    question: '위의 만족도를 선택한 이유는 무엇인가요?',
    placeholder: '간단히 작성해주세요',
    key: 'overall_reason',
  },
  equipment: {
    condition: (rating: number) => rating <= 3, // 보통 이하일 때만
    question: '시설 및 장비 중 어떤 점이 보완되면 좋겠다고 생각하십니까?',
    placeholder: '보완이 필요한 부분을 작성해주세요',
    key: 'equipment_improvement',
  },
  cost: {
    condition: (rating: number) => rating <= 3, // 보통 이하일 때만
    question: '적정한 스튜디오 대관 비용은 얼마라고 생각하십니까?',
    subQuestions: [
      { key: 'cost_small_studio', label: '1인 스튜디오 1시간당 적정 금액', placeholder: '예: 50000' },
      { key: 'cost_large_studio', label: '대형 스튜디오 1시간당 적정 금액', placeholder: '예: 100000' },
    ],
  },
} as const

// 추천 의향 (예/아니오)
export const RECOMMENDATION_OPTIONS = [
  { value: 'yes', label: '있다' },
  { value: 'no', label: '없다' },
] as const

// 재이용 의향 (예/아니오)
export const REUSE_OPTIONS = [
  { value: 'yes', label: '있다' },
  { value: 'no', label: '없다' },
] as const

// ============================================
// 레거시 항목 (기존 데이터 호환성 유지)
// ============================================

// 기존 인지 경로 옵션 (더 이상 사용하지 않지만 기존 데이터 표시용)
export const DISCOVERY_CHANNELS = [
  { value: 'internet', label: '인터넷' },
  { value: 'news', label: '언론 기사' },
  { value: 'referral', label: '지인 소개' },
  { value: 'sto_website', label: 'STO 홈페이지' },
  { value: 'other', label: '기타' },
] as const

// 기존 이용 후 도움이 된 부분 (더 이상 사용하지 않지만 기존 데이터 표시용)
export const BENEFITS = [
  { value: 'sales', label: '판매 증진' },
  { value: 'promotion', label: '제품 홍보' },
  { value: 'awareness', label: '인지도 상승' },
  { value: 'cost_saving', label: '비용 절감' },
  { value: 'content_quality', label: '콘텐츠 품질 향상' },
  { value: 'other', label: '기타' },
] as const

// 레거시 카테고리 키 목록 (기존 데이터 통계 계산 시 사용)
export const LEGACY_CATEGORY_KEYS = [
  'staff_kindness',
  'staff_expertise',
  'booking_process',
  'cleanliness',
] as const

// 모든 유효한 카테고리 키 (새 항목 + 레거시)
export const ALL_CATEGORY_KEYS = [
  ...SURVEY_CATEGORIES.map(c => c.key),
  ...LEGACY_CATEGORY_KEYS,
] as const

// 타입 export
export type SatisfactionLevel = (typeof SATISFACTION_LEVELS)[number]
export type SurveyCategory = (typeof SURVEY_CATEGORIES)[number]
export type DiscoveryChannel = (typeof DISCOVERY_CHANNELS)[number]
export type Benefit = (typeof BENEFITS)[number]
