# 종로 스튜디오 대시보드

종로 미디어센터 스튜디오 예약 관리 시스템 대시보드

## 개요

3개 스튜디오(A, B, C)의 예약 현황을 관리하고 통계를 확인할 수 있는 관리자 대시보드입니다.

## 기술 스택

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS 4
- **UI**: Glassmorphism 다크 테마
- **Font**: Pretendard
- **Icons**: Lucide React

## 주요 기능

### 대시보드 (/)
- 오늘의 예약 현황 요약
- 스튜디오별 가동률
- 최근 예약 목록
- 빠른 액션 버튼

### 예약 관리 (/bookings)
- 전체 예약 목록 조회
- 검색 및 필터링 (스튜디오, 상태)
- 아코디언 상세 보기
- 예약 추가/수정/삭제 (UI)

### 캘린더 (/calendar)
- 월간 캘린더 뷰
- 날짜별 예약 현황
- 선택 날짜 상세 목록

### 실시간 현황 (/live)
- 타임라인 형태의 실시간 예약 현황
- 현재 시간 표시선
- 진행 중인 예약 강조
- 마우스 호버 상세 정보

### 장비 관리 (/equipments)
- 스튜디오별 보유 장비 목록
- 장비 상태 관리 (정상, 고장, 수리중 등)

### 통계 (/statistics)
- 연간 KPI 현황 (목표 달성률)
  - 스튜디오 가동률: 250건 목표
  - 크리에이티브 멤버십: 230명 목표
  - 장기 이용자 확보: 2곳 이상
- 월별 예약 통계
- 스튜디오별 가동률 차트
- 시간대별 예약 분포
- 일별 히트맵
- 소속별 예약 TOP 10

## 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 프로덕션 실행
npm start
```

## 프로젝트 구조

```
├── app/                    # Next.js App Router 페이지
│   ├── page.tsx           # 대시보드
│   ├── bookings/          # 예약 관리
│   ├── calendar/          # 캘린더
│   ├── live/              # 실시간 현황
│   ├── equipments/        # 장비 관리
│   ├── statistics/        # 통계
│   ├── globals.css        # 전역 스타일
│   └── layout.tsx         # 루트 레이아웃
├── components/            # 재사용 컴포넌트
│   ├── layout/           # 레이아웃 컴포넌트
│   │   ├── AdminLayout.tsx
│   │   └── Sidebar.tsx
│   └── ui/               # UI 컴포넌트
│       ├── GlassCard.tsx
│       ├── StatusBadge.tsx
│       └── StudioBadge.tsx
├── lib/                   # 유틸리티 및 데이터
│   ├── constants.ts      # 상수 정의
│   ├── utils.ts          # 유틸 함수
│   └── data/             # 데이터 처리
│       ├── index.ts
│       ├── bookingParser.ts
│       └── booking_data.json  # 예약 데이터 (385건)
└── public/               # 정적 파일
```

## 데이터

현재 Excel에서 파싱한 385건의 예약 데이터가 포함되어 있습니다.

### 예약 상태 코드
- `APPLIED`: 신청됨
- `PENDING`: 대기중
- `CONFIRMED`: 확정
- `IN_USE`: 사용중
- `DONE`: 완료
- `CANCELLED`: 취소

### 스튜디오
- A 스튜디오 (ID: 1)
- B 스튜디오 (ID: 2)
- C 스튜디오 (ID: 3)

## 디자인 시스템

### 색상
- 배경: `#0a0a0f`
- 글래스 카드: `rgba(255, 255, 255, 0.03)`
- 보라 계열: Violet/Purple 그라디언트
- 시안 계열: Cyan/Blue 그라디언트
- 앰버 계열: Amber/Orange 그라디언트

### 컴포넌트 특징
- Glassmorphism (backdrop-filter: blur)
- 반응형 디자인 (모바일/데스크톱)
- 다크 테마 전용

## 라이선스

Private - 한국SNS인재개발원
