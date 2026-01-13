import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '종로 스튜디오 FMS',
  description: '종로 서울관광플라자 스튜디오 대관 및 장비 자산 관리 시스템',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen text-white antialiased">
        {children}
      </body>
    </html>
  )
}
