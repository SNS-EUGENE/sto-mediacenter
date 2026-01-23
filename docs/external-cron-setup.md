# 외부 Cron 서비스 설정 가이드

Vercel Hobby 플랜의 일 1회 Cron 제한을 우회하기 위한 외부 스케줄러 설정입니다.

## 1. 세션 재사용에 대한 걱정은 필요 없습니다

**중요:** 외부 Cron이 10분마다 호출해도 STO에 로그인 요청이 매번 가는 것이 아닙니다.

동작 방식:
1. 첫 번째 호출 → 세션 없음 → STO 로그인 → 세션 DB 저장
2. 이후 호출 → DB에서 세션 로드 → 유효하면 **재사용** (로그인 안 함)
3. 세션 만료 시에만 → 재로그인 (기본 24시간)

**결과:** 하루에 STO 로그인은 1~2회 정도만 발생합니다.

## 2. 권장 서비스: cron-job.org (무료)

### 2.1 계정 생성

1. [cron-job.org](https://cron-job.org) 접속
2. 회원가입 (이메일 인증 필요)

### 2.2 Cron Job 생성

1. **"CREATE CRONJOB"** 클릭

2. **기본 설정:**
   - Title: `STO Sync - 종로 스튜디오`
   - URL: `https://your-domain.vercel.app/api/sto/cron`
   - Execution schedule: **Every 10 minutes** (또는 원하는 간격)

3. **Advanced 설정:**
   - Request method: `GET`
   - Enable job: ✅
   - Save responses: ✅ (디버깅용)

4. **Request Headers (선택):**
   ```
   Authorization: Bearer your-cron-secret
   ```
   > Vercel 환경변수 `CRON_SECRET`과 동일하게 설정

5. **"CREATE"** 클릭

### 2.3 실행 시간대 제한 (권장)

업무 시간에만 실행하려면:

- Schedule type: **Days and hours**
- Days: 월~금
- Hours: 09:00 ~ 18:00

또는 코드에서 이미 `isBusinessHours()` 체크가 있으므로 상관없습니다.

## 3. 대안 서비스

### UptimeRobot (무료)
- [uptimerobot.com](https://uptimerobot.com)
- 5분 간격 무료
- 모니터링 + Cron 겸용

### EasyCron (무료 플랜)
- [easycron.com](https://www.easycron.com)
- 월 200회 무료

### GitHub Actions (무료)
- GitHub 리포지토리에서 Workflow 설정
- 설정이 조금 복잡하지만 무료

## 4. 환경 변수 설정

Vercel Dashboard > Settings > Environment Variables:

```env
# Cron 인증 (외부 서비스에서 호출 시 사용)
CRON_SECRET=your-random-secret-here

# STO 자동 로그인 (선택 - 세션 만료 시 자동 재로그인)
STO_EMAIL=your-sto-email@example.com
STO_PASSWORD=your-sto-password
```

> ⚠️ STO 자격증명은 환경변수로 저장 시 보안에 주의하세요

## 5. 동기화 간격 권장

| 간격 | STO 부하 | 데이터 실시간성 | 권장 |
|------|---------|---------------|------|
| 1분 | 낮음 (세션 재사용) | 매우 높음 | 급한 경우 |
| 5분 | 매우 낮음 | 높음 | - |
| **10분** | **매우 낮음** | **적당** | **권장** |
| 30분 | 거의 없음 | 보통 | 비용 절감 시 |

**참고:** 세션 재사용 덕분에 어떤 간격을 선택해도 STO에 부하를 주지 않습니다.

## 6. 테스트

### 수동 테스트
```bash
curl https://your-domain.vercel.app/api/sto/cron \
  -H "Authorization: Bearer your-cron-secret"
```

### 응답 예시
```json
{
  "success": true,
  "totalCount": 15,
  "newBookings": 2,
  "statusChanges": 1,
  "syncedAt": "2025-01-23T10:30:00Z"
}
```

### 업무 시간 외 응답
```json
{
  "success": false,
  "message": "업무 시간(09:00~18:00)이 아닙니다.",
  "skipped": true
}
```

## 7. 모니터링

### Vercel 로그
1. Vercel Dashboard > 프로젝트 선택
2. **Deployments** > 최신 배포 클릭
3. **Functions** 탭에서 `/api/sto/cron` 로그 확인

### cron-job.org 로그
1. Dashboard에서 Job 선택
2. **History** 탭에서 실행 결과 확인

## 8. Database Webhook과 함께 사용

**권장 구성:**

1. **외부 Cron (10분):** STO에서 데이터 가져오기
2. **Database Webhook:** DB 변경 시 알림 발송

이렇게 하면:
- STO → DB 동기화: 10분마다 외부 Cron이 담당
- DB → 알림 발송: Database Webhook이 담당 (즉시)

**결과:** 최대 10분 지연으로 새 예약 알림을 받을 수 있습니다.
