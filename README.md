# 종로 스튜디오 대시보드

종로 미디어센터 스튜디오 예약 관리 시스템 대시보드

## 개요

3개 스튜디오의 예약 현황을 관리하고 통계를 확인할 수 있는 관리자 대시보드입니다.

### 스튜디오 구성

| ID | 정식 명칭 | 약칭 | 설명 | 수용 인원 |
|----|----------|------|------|----------|
| 1 | 메인 스튜디오 | 메인 | 다목적 대형 공간 | 최대 30명 |
| 3 | 1인 스튜디오 A | 1인 A | 개인 크리에이터용 소형 스튜디오 | 최대 2명 |
| 4 | 1인 스튜디오 B | 1인 B | 개인 크리에이터용 소형 스튜디오 | 최대 2명 |

> 참고: ID 2는 1인 스튜디오 카테고리(그룹)로 사용됨

## 개발 진행 상황

> PROJECT_SPEC.md 기준 진행률

### Phase 1: 프로젝트 설정 - 작업 완료
- [x] package.json 생성
- [x] next.config.ts 설정
- [x] tailwind.config.ts 설정
- [x] tsconfig.json 설정
- [x] .env.local 설정 (Supabase)
- [ ] components.json (shadcn/ui)

### Phase 2: 기반 구조 - 작업 완료
- [x] Supabase 클라이언트 (lib/supabase/)
- [x] 유틸리티 함수 (lib/utils/)
- [x] 상수 정의 (lib/constants.ts)
- [x] 타입 정의 (types/supabase.ts)
- [ ] Validation 스키마 (lib/validations/)

### Phase 3: UI 컴포넌트 - 작업 완료
- [ ] shadcn/ui 기본 컴포넌트 설치 - **미설치 (커스텀으로 대체)**
- [x] 커스텀 컴포넌트 (GlassCard, StatusBadge, StudioBadge, Select)
- [x] 레이아웃 컴포넌트 (AdminLayout, Sidebar, MobileNav)
- [x] 글라스모피즘 다크 테마 적용

### Phase 4: 레이아웃 - 작업 완료
- [x] 루트 레이아웃 (app/layout.tsx)
- [x] 관리자 레이아웃 (AdminLayout 컴포넌트)
- [x] 키오스크 레이아웃 (app/kiosk/page.tsx)
- [ ] 인증 레이아웃 (app/(auth)/layout.tsx) - **미구현**

### Phase 5: 키오스크 - 작업 완료
- [x] 타임라인 컴포넌트
- [x] 키오스크 페이지 (app/kiosk/page.tsx)
- [x] 실시간 갱신 (1분 간격)

### Phase 6: 예약 관리 - 작업 완료 (CRUD 구현)
- [x] 예약 목록 페이지 (Supabase 실시간)
- [ ] 예약 상세 페이지
- [x] 예약 등록/수정 모달 (BookingModal.tsx)
- [x] 예약 삭제 기능 (ConfirmModal.tsx)
- [x] 예약 캘린더 페이지 (Supabase 연동)
- [x] 엑셀 업로드 기능 (ExcelUploadModal.tsx)
- [x] 예약 쿼리 함수 (createBooking, updateBooking, deleteBooking, checkBookingConflict)

### Phase 7: 장비 관리 - 작업 완료 (CRUD 구현)
- [x] 장비 목록 페이지 (Supabase 실시간)
- [x] 장비 데이터 파싱 (장비 목록.xlsx → SQL seed)
- [ ] 장비 상세 페이지
- [x] 장비 등록/수정 모달 (EquipmentModal.tsx)
- [x] 장비 삭제 기능
- [ ] 사진 업로드 기능
- [x] 장비 쿼리 함수 (createEquipment, updateEquipment, deleteEquipment)

### Phase 8: 인증 - 작업 전
- [ ] 로그인 페이지
- [ ] 인증 미들웨어
- [ ] 세션 관리

### Phase 9: 통계 - 작업 완료 (Supabase 연동)
- [x] 통계 페이지 (Supabase 실시간)
- [x] 가동률 계산 로직
- [x] KPI 현황 (연간 목표 대비)
- [x] 차트 컴포넌트 (커스텀)

### Phase 10: 마무리 - 작업 중
- [ ] 에러 핸들링
- [x] 로딩 상태 (Loader2 스피너)
- [x] 반응형 테스트
- [ ] 성능 최적화
- [x] 예약 상태 자동 계산 (IN_USE, DONE)

---

### 전체 진행률: 약 88%

| 구분 | 상태 | 비고 |
|------|------|------|
| UI/프론트엔드 | 95% | 모든 페이지 UI 완료, CRUD 모달 |
| 장비 데이터 | 100% | 469개 장비/자재 파싱 완료, SQL seed 생성 |
| 백엔드/API | 95% | Supabase CRUD 완료 |
| 데이터 연동 | 100% | 모든 페이지 실시간 데이터 |
| 인증 | 0% | 미구현 |
| 키오스크 | 100% | 전체화면 타임라인 완료 |

### 최근 작업 내역 (2026-01-15 오후)
- **키오스크 페이지 UI 개선** (/kiosk)
  - 헤더 레이아웃 변경: 날짜(왼쪽), 시계(오른쪽)
  - 텍스트 크기 조정 (58px, Pretendard Bold)
  - 진행 중인 예약에 ON-AIR 배지 추가 (빨간색)
  - 글로잉 효과 제거, 테두리 유지
- **실시간 현황 페이지 UI 개선** (/live)
  - 날짜 네비게이션 중앙 정렬
- **캘린더 페이지 텍스트 크기 조정** (/calendar)
  - 모든 텍스트 2-3px 증가 (달력, 일정 패널)
- **드롭다운 컴포넌트 개선** (Select.tsx)
  - 화면 오른쪽 끝에서 잘리지 않도록 자동 정렬
  - 최대 높이 240px + 스크롤 지원

### 작업 내역 (2026-01-15 오전)
- **예약 상태 자동 계산 시스템 구현**
  - `lib/utils/bookingStatus.ts`: 쿼리 시점에 IN_USE/DONE 상태 계산
  - `supabase/computed_status_function.sql`: DB 뷰/함수로 통계 쿼리 지원
  - 프론트엔드: 예약 목록에서 과거=완료, 현재시간=사용중 자동 표시
  - 통계: 정확한 상태 집계 (DB 저장 없이 조회 시점 계산)
- **취소된 예약 데이터 복원**
  - generateBookingSQL.ts 수정: 취소 건 포함 (총 385건, 취소 62건)
  - cancelled_at 컬럼 추가
- **실시간 현황 페이지 개선** (/live)
  - 진행 중인 예약에 glow pulse 애니메이션 추가
  - Hydration 에러 수정

### 작업 내역 (2026-01-14 오후)
- **예약 CRUD 기능 구현**
  - BookingModal.tsx: 예약 등록/수정 모달
  - ConfirmModal.tsx: 삭제 확인 모달
  - createBooking, updateBooking, deleteBooking, cancelBooking 함수
  - checkBookingConflict: 시간 충돌 검사
- **장비 CRUD 기능 구현**
  - EquipmentModal.tsx: 장비 등록/수정 모달
  - createEquipment, updateEquipment, deleteEquipment 함수
- **엑셀 업로드 기능 구현**
  - ExcelUploadModal.tsx: 드래그앤드롭 엑셀 업로드
  - STO 시스템 엑셀 파일 파싱 (xlsx 라이브러리)
  - 시간 충돌 자동 체크 후 업로드
- **RLS 정책 업데이트** (supabase/update_rls.sql)
  - anon 사용자도 CRUD 가능하도록 임시 변경
  - booking_status ENUM에 CANCELLED 추가
  - bookings 테이블에 fee, cancelled_at 컬럼 추가

### 작업 내역 (2026-01-14 오전)
- **Supabase 연동 완료**: 모든 페이지 실시간 데이터 연동
- 예약 데이터 쿼리 함수 구현 (getBookings, getBookingsByDate, getBookingsByDateRange)
- 장비 데이터 쿼리 함수 구현 (getEquipments, getEquipmentStats)
- 타입 정의 업데이트 (BookingStatus에 CANCELLED 추가, fee/cancelled_at 필드)
- SQL seed 생성 스크립트 (generateBookingSQL.ts, generateEquipmentSQL.ts)
- 키오스크 페이지 Supabase 연동 (1분 자동 갱신)
- CSS @import 순서 수정 (Pretendard 폰트)

### 작업 내역 (2026-01-13)
- 장비 데이터 파싱 시스템 구현 (장비 목록.xlsx → equipmentData.ts)
- 장비 일련번호 체계 수립 (MS-001-A, 1A-002 형식)
- 커스텀 Select 컴포넌트 구현 (글라스모피즘 테마)
- 스튜디오 명칭 변경 (대형 스튜디오 → 메인 스튜디오)

---

## 기술 스택

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS 4
- **Database**: Supabase (PostgreSQL)
- **UI**: Glassmorphism 다크 테마
- **Font**: Pretendard
- **Icons**: Lucide React

### 예정 기술 (미적용)
- **State**: TanStack Query v5
- **Forms**: React Hook Form + Zod
- **Excel**: xlsx (SheetJS)
- **Charts**: Recharts

## 현재 구현된 페이지

### 대시보드 (/)
- 오늘의 예약 현황 요약 (Supabase 실시간)
- 스튜디오별 가동률
- 최근 예약 목록

### 예약 관리 (/bookings)
- 전체 예약 목록 조회 (Supabase)
- 검색 및 필터링 (스튜디오, 상태)
- 페이지네이션
- 아코디언 상세 보기

### 캘린더 (/calendar)
- 월간 캘린더 뷰 (Supabase)
- 날짜별 예약 현황
- 스튜디오 필터

### 키오스크 (/kiosk)
- 전체화면 타임라인 형태의 일일 예약 현황
- 현재 시간 표시선
- 1분마다 자동 갱신
- 진행 중 예약 표시

### 장비 관리 (/equipments)
- 장비 목록 (469개 - 장비 426개, 자재 43개)
- 상태별 필터링
- 위치/카테고리별 분류
- 점검 필요 장비 알림

### 통계 (/statistics)
- 연간 KPI 현황 (목표 대비 달성률)
- 월별/스튜디오별 통계
- 시간대별 예약 분포
- 일별 히트맵
- 소속별 예약 TOP 10

## 설치 및 실행

```bash
# 의존성 설치
npm install

# 환경변수 설정 (.env.local)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build
```

## Supabase 설정

### 테이블 생성
```bash
# supabase/init.sql 실행
```

### 시드 데이터
```bash
# 예약 데이터 SQL 생성
npx ts-node scripts/generateBookingSQL.ts

# 장비 데이터 SQL 생성
npx ts-node scripts/generateEquipmentSQL.ts

# 생성된 SQL 파일을 Supabase SQL Editor에서 실행
# - supabase/seed_bookings.sql
# - supabase/seed_equipments.sql
```

## 남은 작업

1. **인증 시스템**
   - 관리자 로그인 구현
   - RLS 정책 원복 (authenticated 사용자만 CRUD)

2. **실시간 구독**
   - Supabase Realtime 적용 (현재는 polling)

## 장비 데이터

장비 목록은 `장비 목록.xlsx` 파일에서 파싱됩니다.

### 일련번호 체계
```
[위치코드]-[순번]-[서브인덱스]

- MS: 메인 스튜디오
- 1A: 1인 스튜디오 A
- 1B: 1인 스튜디오 B

예시: MS-001-A, MS-001-B (같은 종류 장비)
```

### 파싱 스크립트
```bash
npx ts-node scripts/generateEquipmentSQL.ts
```

### 데이터 현황
| 위치 | 장비 | 자재 | 합계 |
|------|------|------|------|
| 메인 스튜디오 | 290 | 43 | 333 |
| 1인 스튜디오 A | 69 | 0 | 69 |
| 1인 스튜디오 B | 67 | 0 | 67 |
| **총계** | **426** | **43** | **469** |

## 라이선스

Private - 한국SNS인재개발원
