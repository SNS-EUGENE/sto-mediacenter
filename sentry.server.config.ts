// Sentry 서버 설정 (Node.js)
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 에러 샘플링 비율
  tracesSampleRate: 1.0,

  // 개발환경에서도 에러 수집
  debug: false,
});
