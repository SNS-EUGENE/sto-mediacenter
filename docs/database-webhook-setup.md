# Supabase Database Webhook 설정 가이드

데이터베이스 변경(INSERT/UPDATE) 시 자동으로 알림을 발송하는 Webhook 설정입니다.

## 1. 개요

**기존 방식 (API 레벨):**
- STO 동기화 API 호출 시 알림 발송
- 수동 예약 등록 시 별도 처리 필요

**새로운 방식 (Database Webhook):**
- `bookings` 테이블에 데이터가 INSERT/UPDATE되면 자동 알림
- STO 동기화든, 수동 등록이든 동일하게 동작
- 더 안정적이고 일관된 알림 시스템

## 2. 환경 변수 설정

`.env.local` 또는 Vercel에 추가:

```env
# Webhook 인증 (선택사항이지만 권장)
SUPABASE_WEBHOOK_SECRET=your-random-secret-key-here
```

시크릿 생성 방법:
```bash
openssl rand -hex 32
```

## 3. Supabase Dashboard에서 Webhook 설정

### 3.1 Database Webhooks 페이지 이동

1. [Supabase Dashboard](https://supabase.com/dashboard) 접속
2. 프로젝트 선택
3. 좌측 메뉴에서 **Database** > **Webhooks** 클릭

### 3.2 새 Webhook 생성

1. **"Create a new hook"** 버튼 클릭

2. **기본 설정:**
   - Name: `booking-change-notification`
   - Table: `bookings`
   - Events:
     - ✅ Insert
     - ✅ Update
     - ❌ Delete (선택)

3. **Webhook 설정:**
   - Type: `HTTP Request`
   - Method: `POST`
   - URL: `https://your-domain.vercel.app/api/webhooks/booking-change`

   > ⚠️ `your-domain`을 실제 Vercel 도메인으로 변경하세요

4. **HTTP Headers:**
   ```
   Content-Type: application/json
   Authorization: Bearer your-random-secret-key-here
   ```

   > `your-random-secret-key-here`를 `SUPABASE_WEBHOOK_SECRET` 값으로 변경

5. **"Create webhook"** 클릭

## 4. 로컬 테스트

로컬 환경에서는 Supabase Webhook이 localhost를 호출할 수 없습니다.
ngrok 등을 사용하여 테스트할 수 있습니다:

```bash
# ngrok 설치 후
ngrok http 3000

# 표시된 URL을 Webhook URL로 임시 설정
# 예: https://abc123.ngrok.io/api/webhooks/booking-change
```

또는 API를 직접 호출하여 테스트:

```bash
curl -X POST http://localhost:3000/api/webhooks/booking-change \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-secret" \
  -d '{
    "type": "INSERT",
    "table": "bookings",
    "schema": "public",
    "record": {
      "id": "test-123",
      "facility_name": "스튜디오 A",
      "rental_date": "2025-01-25",
      "applicant_name": "테스트 사용자",
      "status": "PENDING",
      "created_at": "2025-01-23T10:00:00Z",
      "updated_at": "2025-01-23T10:00:00Z"
    },
    "old_record": null
  }'
```

## 5. 알림 동작

### 새 예약 (INSERT)
- 푸시 알림: "새 예약 알림 - OOO님이 스튜디오 A을(를) 예약했습니다."
- 이메일: 새 예약 템플릿으로 발송

### 상태 변경 (UPDATE)
- 푸시 알림: "예약 상태 변경 - OOO님의 예약: 접수됨 → 승인됨"
- 이메일: 상태 변경 템플릿으로 발송

### 알림이 발송되지 않는 경우
- UPDATE이지만 status 필드가 변경되지 않은 경우
- DELETE 이벤트 (현재 알림 비활성화)

## 6. 트러블슈팅

### Webhook이 호출되지 않음
- Supabase Dashboard > Database > Webhooks에서 활성화 상태 확인
- Webhook URL이 올바른지 확인 (HTTPS 필수)
- Vercel 함수 로그 확인

### 401 Unauthorized 오류
- `Authorization` 헤더가 올바른지 확인
- `SUPABASE_WEBHOOK_SECRET` 환경변수 확인

### 알림이 발송되지 않음
- `ADMIN_NOTIFICATION_EMAILS` 환경변수 확인
- 푸시 구독이 등록되어 있는지 확인
- Vercel 함수 로그에서 오류 확인

## 7. 기존 API 알림 코드 제거 (선택)

Database Webhook이 정상 동작하면, `app/api/sto/sync/route.ts`와
`app/api/sto/cron/route.ts`에서 알림 발송 코드를 제거할 수 있습니다.

단, 당분간은 둘 다 유지하여 이중 안전장치로 사용해도 됩니다.
(중복 알림이 발생할 수 있으니 테스트 후 결정)

## 8. 참고 자료

- [Supabase Database Webhooks 문서](https://supabase.com/docs/guides/database/webhooks)
- [Vercel Serverless Functions](https://vercel.com/docs/functions)
