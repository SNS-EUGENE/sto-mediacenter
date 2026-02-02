import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
}

// Sentry 설정
const sentryWebpackPluginOptions = {
  // 소스맵 업로드 (프로덕션에서 에러 위치 정확히 표시)
  silent: true,

  // 빌드 오류 무시 (Sentry 서버 문제시에도 빌드 성공)
  hideSourceMaps: true,
}

export default withSentryConfig(nextConfig, sentryWebpackPluginOptions)
