# 이메일 알림 설정 가이드 (Resend)

Resend를 사용한 이메일 알림 시스템입니다.

## 1. Resend 계정 생성

1. [Resend](https://resend.com) 가입
2. API Key 생성 (Settings > API Keys)

## 2. 환경 변수 설정

`.env.local` 또는 Vercel 환경 변수에 추가:

```env
# Resend API
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=studio@yourdomain.com  # 도메인 인증 후 사용

# 알림 수신 이메일 (쉼표로 구분)
ADMIN_NOTIFICATION_EMAILS=admin@example.com,manager@example.com
```

## 3. 도메인 설정 (선택)

기본적으로 Resend는 `onboarding@resend.dev`에서 발송합니다.
자체 도메인을 사용하려면:

1. Resend Dashboard > Domains
2. 도메인 추가 및 DNS 레코드 설정
3. `RESEND_FROM_EMAIL` 환경변수 업데이트

## 4. 알림 종류

### 새 예약 알림
- STO 동기화 시 새 예약이 감지되면 발송
- 예약자, 스튜디오, 대관일 정보 포함

### 상태 변경 알림
- 예약 상태 변경 시 발송 (접수→승인, 승인→취소 등)

### 일일 리포트 (추후 구현)
- 매일 정해진 시간에 전날 통계 발송

## 5. 테스트

```bash
# API 직접 호출 테스트
curl -X POST http://localhost:3000/api/email/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "your@email.com",
    "subject": "테스트 이메일",
    "html": "<h1>테스트</h1><p>이메일 발송 테스트입니다.</p>"
  }'
```

## 6. 트러블슈팅

### 이메일이 안 옴
- `RESEND_API_KEY` 확인
- `ADMIN_NOTIFICATION_EMAILS` 확인
- Resend 대시보드에서 발송 로그 확인

### 스팸함으로 들어감
- 도메인 인증 필요 (SPF, DKIM, DMARC 설정)
- Resend 유료 플랜에서 전용 IP 사용 가능

## 7. 요금

Resend 무료 플랜:
- 월 3,000건 발송
- 1개 도메인
- 기본 지원
