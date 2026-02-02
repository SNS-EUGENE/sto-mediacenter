// Sentry 클라이언트 설정 (브라우저)
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 에러 샘플링 비율 (1.0 = 100% 모든 에러 수집)
  tracesSampleRate: 1.0,

  // 개발환경에서도 에러 수집 (필요시 false로 변경)
  debug: false,

  // 리플레이 설정 (세션 녹화 - 무료 플랜에서 제한적)
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,

  // Sentry Replay 통합
  integrations: [
    Sentry.replayIntegration({
      // 민감한 정보 마스킹
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
});
