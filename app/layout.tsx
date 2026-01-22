import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/components/providers/AuthProvider'

export const metadata: Metadata = {
  title: '종로 스튜디오 FMS',
  description: '종로 서울관광플라자 스튜디오 대관 및 장비 자산 관리 시스템',
  manifest: '/manifest.json',
  themeColor: '#8b5cf6',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: '종로 FMS',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen text-white antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
