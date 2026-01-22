# 푸시 알림 설정 가이드 (Supabase + Web Push)

Firebase 없이 순수 Web Push API와 Supabase만 사용합니다.

## 1. VAPID 키 생성

터미널에서 실행:
```bash
npx web-push generate-vapid-keys
```

출력된 키를 복사해두세요.

## 2. 환경 변수 설정

`.env.local` 파일에 추가:

```env
# Web Push VAPID Keys
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BLxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VAPID_PRIVATE_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VAPID_EMAIL=mailto:your-email@example.com

# Supabase (이미 설정되어 있을 것)
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxx
SUPABASE_SERVICE_ROLE_KEY=xxxxx  # 푸시 발송 API용
```

## 3. Supabase 테이블 생성

Supabase SQL Editor에서 실행:

```sql
-- 푸시 알림 구독 테이블
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  device_type TEXT DEFAULT 'web',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

-- RLS 정책
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 구독만 관리 가능
CREATE POLICY "Users can manage own subscriptions"
  ON push_subscriptions
  FOR ALL
  USING (auth.uid() = user_id);

-- 인덱스
CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);
```

## 4. PWA 아이콘 준비

`public/icons/` 폴더에 다음 아이콘 추가:
- icon-72x72.png (배지용)
- icon-192x192.png
- icon-512x512.png

## 5. 사용 방법

### 클라이언트에서 구독
설정 페이지 > 알림 설정 > "알림 켜기" 버튼

### 서버에서 푸시 발송
```typescript
// 새 예약 시 알림 발송
await fetch('/api/push/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: '새 예약 알림',
    body: '홍길동님이 A스튜디오를 예약했습니다.',
    url: '/bookings',
    // userId: 'xxx' // 특정 유저에게만 보내려면
  }),
})
```

## 플랫폼별 지원 현황

| 플랫폼 | 지원 | 비고 |
|--------|------|------|
| Android Chrome | ✅ | 완벽 지원 |
| Windows Chrome/Edge | ✅ | 완벽 지원 |
| macOS Chrome/Safari | ✅ | 완벽 지원 |
| iOS Safari (PWA) | ⚠️ | 홈화면 추가 필수, iOS 16.4+ |
| iOS Chrome | ❌ | 미지원 |

## 트러블슈팅

### 구독 실패
- VAPID 공개키가 올바른지 확인
- HTTPS 환경인지 확인 (localhost 제외)

### 푸시 안 옴
- Service Worker 등록 확인 (DevTools > Application)
- VAPID 개인키가 올바른지 확인

### iOS에서 안 됨
- Safari에서 "홈 화면에 추가" 필요
- iOS 16.4 이상 필요
