# 종로 스튜디오 대시보드

한국SNS인재개발원 종로 스튜디오 시설 예약 관리 시스템 (FMS)

## 개요

서울관광재단(STO) 예약 시스템과 연동하여 스튜디오 예약을 실시간으로 관리하는 대시보드입니다.

<img width="1915" height="907" alt="대시보드 메인" src="https://github.com/user-attachments/assets/03d46666-4836-4eaf-85b8-b4b231ec2160" />
<img width="1915" height="907" alt="캘린더 뷰" src="https://github.com/user-attachments/assets/04af3287-91eb-40e4-8519-0e1c168e0ed0" />

### 주요 기능

- **예약 관리**: STO 시스템 연동을 통한 실시간 예약 동기화
- **대시보드**: 오늘의 예약 현황, 스튜디오 가동률 통계
- **캘린더 뷰**: 월별/주별 예약 일정 확인
- **장비 관리**: 스튜디오 장비 대여 및 반납 관리
- **만족도 조사**: QR 코드 기반 설문, 통계 대시보드, 구글 시트 연동
- **통계/KPI**: 월별 이용 현황 및 성과 지표 관리
- **키오스크 모드**: 방문객용 예약 확인 화면
- **라이브 모니터링**: 실시간 스튜디오 현황 모니터

### 스튜디오 구성

| ID | 정식 명칭 | 약칭 | 설명 | 수용 인원 |
|----|----------|------|------|----------|
| 1 | 메인 스튜디오 | 메인 | 다목적 대형 공간 | 최대 30명 |
| 3 | 1인 스튜디오 A | 1인 A | 개인 크리에이터용 소형 스튜디오 | 최대 2명 |
| 4 | 1인 스튜디오 B | 1인 B | 개인 크리에이터용 소형 스튜디오 | 최대 2명 |

> 참고: ID 2는 1인 스튜디오 카테고리(그룹)로 사용됨

## 기술 스택

### Frontend
- **Framework**: Next.js 15 (App Router)
- **UI**: React 19, TailwindCSS
- **상태관리**: TanStack Query (React Query)
- **폼 관리**: React Hook Form + Zod
- **차트**: Recharts
- **아이콘**: Lucide React

### Backend
- **Runtime**: Next.js API Routes (Node.js)
- **Database**: Supabase (PostgreSQL)
- **인증**: Supabase Auth
- **외부 연동**:
  - STO (서울관광재단) 예약 시스템 스크래핑
  - Gmail API (자동 로그인 인증코드 추출)

### 배포
- **플랫폼**: Vercel
- **Cron Jobs**: Vercel Cron (세션 유지, 자동 동기화)

## 프로젝트 구조

```
├── app/                    # Next.js App Router 페이지
│   ├── api/               # API Routes
│   │   ├── google/        # Gmail API 연동
│   │   ├── sto/           # STO 연동 API
│   │   └── survey/        # 만족도 조사 API
│   ├── bookings/          # 예약 관리 페이지
│   ├── calendar/          # 캘린더 뷰
│   ├── equipments/        # 장비 관리
│   ├── kiosk/             # 키오스크 모드
│   ├── kpi/               # KPI 관리
│   ├── live/              # 라이브 모니터링
│   ├── settings/          # 설정 (STO 로그인, 구글 시트)
│   ├── statistics/        # 통계 페이지
│   ├── survey/            # 설문 응답 페이지 (외부 공개)
│   └── surveys/           # 만족도 조사 관리 (관리자)
│
├── components/            # React 컴포넌트
│   ├── dashboard/         # 대시보드 위젯
│   ├── layout/            # 레이아웃 (Sidebar, AdminLayout)
│   ├── modals/            # 모달 컴포넌트
│   ├── providers/         # Context Providers
│   └── ui/                # 공통 UI 컴포넌트
│
├── lib/                   # 유틸리티 및 비즈니스 로직
│   ├── data/              # 데이터 파싱
│   ├── google/            # Gmail API 클라이언트
│   ├── google-sheets/     # 구글 시트 연동
│   ├── sto/               # STO 연동 클라이언트
│   ├── supabase/          # Supabase 클라이언트
│   ├── survey/            # 만족도 조사 설정
│   └── utils/             # 유틸리티 함수
│
├── supabase/              # 데이터베이스 스키마
├── types/                 # TypeScript 타입 정의
└── vercel.json            # Vercel Cron 설정
```

## 환경 변수

`.env.local` 파일에 다음 환경 변수를 설정하세요:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Google Gmail API (STO 자동 로그인용 - 선택사항)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REFRESH_TOKEN=your_refresh_token

# Vercel Cron Secret (배포 시)
CRON_SECRET=your_cron_secret
```

## 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 빌드
npm run build

# 프로덕션 실행
npm start
```

## STO 연동

### 스튜디오 매핑
| STO 시설명 | 내부 studio_id |
|-----------|---------------|
| 대형 스튜디오 | 1 (메인 스튜디오) |
| 1인 스튜디오 #1 | 3 (1인 스튜디오 A) |
| 1인 스튜디오 #2 | 4 (1인 스튜디오 B) |

### 동기화 동작
- **수동 동기화**: 설정 페이지에서 버튼 클릭
- **자동 동기화** (Vercel 배포 시):
  - Keep-alive: 5분마다 (세션 유지)
  - 동기화: 10분마다 (신규 예약 및 상태 변경 감지)
  - 업무시간: 월~금 09:00~17:00

### 자동 로그인
Gmail API를 연동하면 STO 로그인 시 이메일 인증 코드를 자동으로 추출하여 로그인합니다.

## 데이터베이스 스키마

주요 테이블:
- `studios`: 스튜디오 정보
- `bookings`: 예약 정보 (STO 연동 데이터 포함)
- `equipments`: 장비 정보
- `equipment_rentals`: 장비 대여 기록
- `kpi_monthly`: 월별 KPI 데이터
- `sto_sessions`: STO 세션 정보 (Vercel 배포용)
- `satisfaction_surveys`: 만족도 조사 응답
- `settings`: 시스템 설정 (구글 시트 연동 등)

## 개발 현황

### 완료된 기능
- [x] 대시보드 (오늘의 예약, 통계 위젯)
- [x] 예약 관리 (목록, 상세, 수정)
- [x] 캘린더 뷰
- [x] STO 연동 (로그인, 동기화, 상세 정보)
- [x] Gmail API 자동 로그인
- [x] 장비 관리
- [x] 통계 페이지
- [x] KPI 관리
- [x] 키오스크/라이브 모니터 모드
- [x] Vercel Cron 설정
- [x] 만족도 조사 시스템
  - QR 코드 기반 설문 (`/surveys/today`)
  - PIN 인증 (전화번호 뒷 4자리)
  - 2026년 설문 양식 적용
  - 항목별/전체 만족도 통계
  - 구글 시트 자동 연동 (YYYY-MM-DD HH:mm:ss 형식)
  - 스튜디오 타입별 적정 비용 질문 동적 표시 (메인/1인)
  - 숫자 입력 시 세자리 쉼표 자동 포맷
  - 설문 완료 시 자동 리다이렉트 및 푸시 알림
- [x] 푸시 알림 (예약 변경/설문 완료 시 Webhook)

### 예정된 기능
- [ ] 사용자 권한 관리
- [ ] 예약 충돌 감지
- [ ] 리포트 생성 및 내보내기

## 라이선스

Private - 한국SNS인재개발원 내부용
