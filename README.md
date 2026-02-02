# 종로 스튜디오 시설관리 시스템

> 서울관광재단 종로센터 스튜디오 예약 및 시설 관리를 위한 통합 대시보드

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?logo=supabase)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-06B6D4?logo=tailwindcss)
![Vercel](https://img.shields.io/badge/Deployed-Vercel-black?logo=vercel)

## 프로젝트 개요

**한국SNS인재개발원**에서 운영하는 서울관광플라자(종로) 스튜디오 시설의 예약 관리, 장비 현황 추적, 만족도 조사, 통계 분석을 위한 웹 기반 관리 시스템입니다.

### 주요 특징

- **STO 시스템 자동 연동**: 서울관광재단 예약 시스템과 실시간 동기화
- **실시간 알림**: 카카오워크 + 웹 푸시 알림으로 예약 변경 즉시 통보
- **만족도 조사**: QR 기반 설문 및 Google Sheets 자동 연동
- **다양한 뷰 지원**: 캘린더, 타임라인, 키오스크 모드
- **에러 모니터링**: Sentry 연동으로 실시간 에러 추적

---

## 스크린샷

<img width="1915" height="907" alt="대시보드 메인" src="https://github.com/user-attachments/assets/03d46666-4836-4eaf-85b8-b4b231ec2160" />
<img width="1915" height="907" alt="캘린더 뷰" src="https://github.com/user-attachments/assets/04af3287-91eb-40e4-8519-0e1c168e0ed0" />

---

## 기술 스택

### Frontend
| 기술 | 버전 | 용도 |
|------|------|------|
| Next.js | 15.1 | App Router 기반 풀스택 프레임워크 |
| React | 19.0 | UI 라이브러리 |
| TypeScript | 5.7 | 정적 타입 시스템 |
| TailwindCSS | 3.4 | 유틸리티 기반 스타일링 |
| TanStack Query | 5.62 | 서버 상태 관리 |
| React Hook Form | 7.54 | 폼 상태 관리 |
| Zod | 3.24 | 스키마 유효성 검증 |
| Recharts | 2.15 | 차트/그래프 시각화 |
| Lucide React | 0.469 | 아이콘 |

### Backend & Infrastructure
| 기술 | 용도 |
|------|------|
| Supabase | PostgreSQL 데이터베이스 + 인증 |
| Vercel | 호스팅 + Cron Jobs |
| Resend | 이메일 발송 |
| Web Push | 브라우저 푸시 알림 |
| Sentry | 에러 모니터링 |

### 외부 연동
| 시스템 | 용도 |
|------|------|
| STO 예약시스템 | 예약 데이터 실시간 동기화 |
| Gmail API | 인증 코드 자동 추출 (2FA) |
| Google Sheets API | 만족도 조사 결과 자동 저장 |
| 카카오워크 Bot API | 팀 알림 메시지 발송 |

---

## 주요 기능

### 1. 대시보드
- 금일 예약 현황 및 스튜디오별 가동률
- 수익 현황 (전일 대비)
- 장비 이상 알림
- 오늘의 타임라인 뷰

### 2. 예약 관리
- STO 시스템 자동 동기화 (10분 간격)
- 예약 상태 관리 (신청 → 확정 → 사용중 → 완료)
- 엑셀 일괄 업로드
- 검색 및 필터링

### 3. 캘린더
- 월간/주간 뷰 전환
- 스튜디오별 색상 구분
- 드래그 앤 드롭 예약 수정

### 4. 장비 관리
- 장비 인벤토리 (카테고리별 분류)
- 상태 추적 (정상/파손/수리중)
- 이미지 첨부 기능
- 대여 이력 관리

### 5. 만족도 조사
- 토큰 기반 익명 설문 (예약 완료 시 자동 발송)
- PIN 인증 당일 설문 (전화번호 뒷 4자리)
- 5점 척도 평가 + 주관식 피드백
- Google Sheets 자동 연동
- 2026년 설문 양식 적용

### 6. 통계 및 KPI
- 월별/연도별 가동률 추이
- 스튜디오별 비교 분석
- 장기 이용자 분석
- KPI 목표 대비 달성률

### 7. 실시간 모니터링
- 라이브 스튜디오 현황
- 현재 진행중인 촬영 표시
- 다음 예약 자동 알림

### 8. 알림 시스템
- **카카오워크**: 신규 예약, 상태 변경, 만족도 조사 완료 알림
- **웹 푸시**: 브라우저 푸시 알림
- **이메일**: 예약 확인, 상태 변경, 설문 요청

---

## 프로젝트 구조

```
jongno-studio-fms/
├── app/                      # Next.js App Router
│   ├── api/                  # API 라우트
│   │   ├── sto/              # STO 시스템 연동
│   │   ├── survey/           # 만족도 조사
│   │   ├── push/             # 푸시 알림
│   │   ├── webhooks/         # Supabase 웹훅
│   │   ├── kakaowork/        # 카카오워크 연동
│   │   ├── google/           # Gmail API
│   │   ├── email/            # 이메일 발송
│   │   └── settings/         # 시스템 설정
│   ├── bookings/             # 예약 관리 페이지
│   ├── calendar/             # 캘린더 뷰
│   ├── equipments/           # 장비 관리
│   ├── statistics/           # 통계 페이지
│   ├── surveys/              # 만족도 조사 관리
│   ├── settings/             # 시스템 설정
│   ├── kiosk/                # 키오스크 모드
│   ├── live/                 # 실시간 모니터링
│   ├── kpi/                  # KPI 대시보드
│   └── page.tsx              # 메인 대시보드
│
├── components/
│   ├── dashboard/            # 대시보드 위젯
│   ├── layout/               # 레이아웃 (사이드바, 네비게이션)
│   ├── ui/                   # 재사용 UI 컴포넌트
│   ├── modals/               # 모달 다이얼로그
│   ├── notifications/        # 알림 컴포넌트
│   └── providers/            # Context Providers
│
├── lib/
│   ├── supabase/             # DB 쿼리 및 클라이언트
│   ├── sto/                  # STO 시스템 클라이언트
│   ├── google/               # Gmail API
│   ├── kakaowork/            # 카카오워크 알림
│   ├── email/                # 이메일 발송
│   ├── notifications/        # 푸시 알림
│   ├── survey/               # 설문 설정
│   ├── constants.ts          # 상수 정의
│   └── utils.ts              # 유틸리티 함수
│
├── types/                    # TypeScript 타입 정의
│   ├── index.ts              # UI/비즈니스 타입
│   └── supabase.ts           # 데이터베이스 타입
│
├── supabase/                 # 데이터베이스 스키마
└── public/                   # 정적 파일
```

---

## 스튜디오 구성

| ID | 정식 명칭 | 약칭 | 설명 | 수용 인원 |
|----|----------|------|------|----------|
| 1 | 메인 스튜디오 | 메인 | 다목적 대형 공간 | 최대 30명 |
| 3 | 1인 스튜디오 A | 1인 A | 개인 크리에이터용 소형 스튜디오 | 최대 2명 |
| 4 | 1인 스튜디오 B | 1인 B | 개인 크리에이터용 소형 스튜디오 | 최대 2명 |

> 참고: ID 2는 1인 스튜디오 카테고리(그룹)로 사용됨

---

## 데이터베이스 스키마

### 주요 테이블

```sql
-- 스튜디오
studios (id, name, alias, capacity, is_category, parent_id)

-- 예약
bookings (
  id, studio_id, rental_date, time_slots[],
  applicant_name, organization, phone, email,
  event_name, purpose, participants_count,
  status, fee, sto_reqst_sn, ...
)

-- 장비
equipments (
  id, name, category, spec, location,
  status, quantity, serial_number, image_url
)

-- 만족도 조사
satisfaction_surveys (
  id, booking_id, token,
  overall_rating, category_ratings,
  comment, improvement_request, submitted_at
)

-- 시스템 설정
settings (key, value)
```

### 상태 값

| 예약 상태 | 설명 |
|-----------|------|
| `APPLIED` | 신청됨 |
| `PENDING` | 승인대기 |
| `CONFIRMED` | 확정 |
| `IN_USE` | 사용중 |
| `DONE` | 완료 |
| `CANCELLED` | 취소 |

| 장비 상태 | 설명 |
|-----------|------|
| `NORMAL` | 정상 |
| `BROKEN` | 파손 |
| `MALFUNCTION` | 고장 |
| `REPAIRING` | 수리중 |
| `REPAIRED` | 수리완료 |

---

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
Gmail API를 연동하면 STO 로그인 시 이메일 인증 코드를 자동으로 추출하여 2FA 인증을 자동 처리합니다.

---

## 카카오워크 알림

예약 변경 시 팀원에게 실시간 알림을 발송합니다.

```
📅 신규 예약 건이 있습니다.
📽️ 메인 스튜디오
📆 2026-02-03 09~12시
👤 홍길동 (한국관광공사)
📌 유튜브 촬영
👥 5명 | 📞 010-1234-5678
```

---

## 환경 변수

`.env.local` 파일에 다음 환경 변수를 설정하세요:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# 앱 URL
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app

# Google OAuth (STO 자동 로그인용)
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
GOOGLE_REFRESH_TOKEN=1//xxx

# STO 계정
STO_EMAIL=your-sto-email
STO_PASSWORD=your-sto-password

# 카카오워크 Bot
KAKAOWORK_BOT_KEY=xxx

# 이메일 (Resend)
RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL=studio@yourdomain.com
ADMIN_NOTIFICATION_EMAILS=admin@example.com

# 푸시 알림 (VAPID)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=xxx
VAPID_PRIVATE_KEY=xxx

# 웹훅 시크릿
SUPABASE_WEBHOOK_SECRET=xxx
CRON_SECRET=xxx

# 에러 모니터링 (Sentry)
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```

---

## 설치 및 실행

### 요구사항
- Node.js 18+
- npm 또는 yarn

### 설치

```bash
# 저장소 클론
git clone https://github.com/your-repo/jongno-studio-fms.git
cd jongno-studio-fms

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env.local
# .env.local 파일 수정

# 개발 서버 실행
npm run dev
```

### 빌드 및 배포

```bash
# 프로덕션 빌드
npm run build

# 프로덕션 실행
npm start
```

---

## Vercel Cron Jobs

| 엔드포인트 | 주기 | 용도 |
|-----------|------|------|
| `/api/sto/keepalive` | 5분 | STO 세션 유지 |
| `/api/sto/cron` | 10분 | 예약 동기화 |

> 평일 09:00~17:00에만 실행

---

## 개발 현황

### 완료된 기능
- [x] 대시보드 (오늘의 예약, 통계 위젯)
- [x] 예약 관리 (목록, 상세, 수정)
- [x] 캘린더 뷰 (월간/주간)
- [x] STO 연동 (로그인, 동기화, 상세 정보)
- [x] Gmail API 자동 로그인 (2FA 자동 처리)
- [x] 장비 관리 (인벤토리, 상태 추적)
- [x] 통계 페이지 (가동률, 장기 이용자)
- [x] KPI 관리 (목표 설정, 달성률)
- [x] 키오스크/라이브 모니터 모드
- [x] Vercel Cron 설정
- [x] 만족도 조사 시스템
  - QR 코드 기반 설문 (`/surveys/today`)
  - PIN 인증 (전화번호 뒷 4자리)
  - 2026년 설문 양식 적용
  - 항목별/전체 만족도 통계
  - 구글 시트 자동 연동
  - 스튜디오 타입별 적정 비용 질문 동적 표시
- [x] 푸시 알림 (예약 변경/설문 완료 시)
- [x] 카카오워크 알림 연동
- [x] 이메일 알림 (Resend)
- [x] Sentry 에러 모니터링

### 예정된 기능
- [ ] 사용자 권한 관리
- [ ] 예약 충돌 감지 알림
- [ ] 리포트 생성 및 PDF 내보내기
- [ ] 모바일 앱 (PWA)

---

## 라이선스

Private - 한국SNS인재개발원 내부용

---

## 개발자

**허유진** - 한국SNS인재개발원

---

*Last Updated: 2026-02-02*
