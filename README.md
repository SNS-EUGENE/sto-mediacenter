# 종로 스튜디오 대시보드

종로 미디어센터 스튜디오 예약 관리 시스템 대시보드

## 개요

3개 스튜디오(A, B, C)의 예약 현황을 관리하고 통계를 확인할 수 있는 관리자 대시보드입니다.

## 개발 진행 상황

> PROJECT_SPEC.md 기준 진행률

### Phase 1: 프로젝트 설정 - 작업 완료
- [x] package.json 생성
- [x] next.config.ts 설정
- [x] tailwind.config.ts 설정
- [x] tsconfig.json 설정
- [ ] .env.example 생성
- [ ] components.json (shadcn/ui)

### Phase 2: 기반 구조 - 작업 중
- [ ] Supabase 클라이언트 (lib/supabase/) - **미연결**
- [x] 유틸리티 함수 (lib/utils/)
- [x] 상수 정의 (lib/constants.ts)
- [ ] Validation 스키마 (lib/validations/)

### Phase 3: UI 컴포넌트 - 작업 중
- [ ] shadcn/ui 기본 컴포넌트 설치 - **미설치**
- [x] 커스텀 컴포넌트 (GlassCard, StatusBadge, StudioBadge)
- [x] 레이아웃 컴포넌트 (AdminLayout, Sidebar, MobileNav)

### Phase 4: 레이아웃 - 작업 완료
- [x] 루트 레이아웃 (app/layout.tsx)
- [x] 관리자 레이아웃 (AdminLayout 컴포넌트)
- [ ] 키오스크 레이아웃 (app/(kiosk)/layout.tsx) - **미구현**
- [ ] 인증 레이아웃 (app/(auth)/layout.tsx) - **미구현**

### Phase 5: 키오스크 - 작업 전
- [ ] 타임라인 컴포넌트 (timeline-view.tsx)
- [ ] 키오스크 페이지 (app/(kiosk)/kiosk/page.tsx)
- [ ] 실시간 갱신 훅 (use-realtime.ts)

### Phase 6: 예약 관리 - 작업 중 (UI만 완료)
- [x] 예약 목록 페이지 (UI)
- [ ] 예약 상세 페이지
- [ ] 예약 등록/수정 폼
- [x] 예약 캘린더 페이지 (UI)
- [ ] 엑셀 업로드 기능 - **미구현**
- [ ] 예약 API Routes - **미구현 (Supabase 미연결)**

### Phase 7: 장비 관리 - 작업 중 (UI만 완료)
- [x] 장비 목록 페이지 (UI, 더미데이터)
- [ ] 장비 상세 페이지
- [ ] 장비 등록/수정 폼
- [ ] 사진 업로드 기능
- [ ] 장비 API Routes - **미구현**
- [ ] 실제 장비 데이터 - **미수신**

### Phase 8: 인증 - 작업 전
- [ ] 로그인 페이지
- [ ] 인증 미들웨어
- [ ] 세션 관리

### Phase 9: 통계 - 작업 중 (UI만 완료)
- [x] 통계 페이지 (UI)
- [x] 가동률 계산 로직 (더미데이터 기준)
- [x] 차트 컴포넌트 (커스텀)

### Phase 10: 마무리 - 작업 전
- [ ] 에러 핸들링
- [ ] 로딩 상태
- [x] 반응형 테스트
- [ ] 성능 최적화

---

### 전체 진행률: 약 35%

| 구분 | 상태 | 비고 |
|------|------|------|
| UI/프론트엔드 | 70% | 모든 페이지 UI 완료 |
| 백엔드/API | 0% | Supabase 미연결 |
| 데이터 연동 | 0% | 더미 데이터 사용 중 |
| 인증 | 0% | 미구현 |
| 키오스크 | 0% | 미구현 |

---

## 기술 스택

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS 4
- **UI**: Glassmorphism 다크 테마
- **Font**: Pretendard
- **Icons**: Lucide React

### 예정 기술 (미적용)
- **Database**: Supabase (PostgreSQL)
- **State**: TanStack Query v5
- **Forms**: React Hook Form + Zod
- **Excel**: xlsx (SheetJS)
- **Charts**: Recharts

## 현재 구현된 페이지

### 대시보드 (/)
- 오늘의 예약 현황 요약
- 스튜디오별 가동률
- 최근 예약 목록

### 예약 관리 (/bookings)
- 전체 예약 목록 조회 (더미 데이터)
- 검색 및 필터링 (스튜디오, 상태)
- 아코디언 상세 보기

### 캘린더 (/calendar)
- 월간 캘린더 뷰
- 날짜별 예약 현황

### 실시간 현황 (/live)
- 타임라인 형태의 일일 예약 현황
- 현재 시간 표시선

### 장비 관리 (/equipments)
- 장비 목록 (더미 데이터)
- 상태별 필터링

### 통계 (/statistics)
- 연간 KPI 현황
- 월별/스튜디오별 통계

## 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build
```

## 남은 작업

1. **Supabase 연동**
   - 데이터베이스 스키마 생성
   - API Routes 구현
   - 실시간 구독 설정

2. **장비 데이터 수신**
   - 실제 장비 목록 입력

3. **인증 시스템**
   - 관리자 로그인 구현

4. **키오스크 모드**
   - 전체화면 타임라인 뷰

5. **엑셀 업로드**
   - STO 시스템 엑셀 파싱

## 라이선스

Private - 한국SNS인재개발원
