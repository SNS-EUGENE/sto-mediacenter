'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// 기존 /survey/today URL을 /surveys/today로 리다이렉트
export default function OldTodaySurveyPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/surveys/today')
  }, [router])

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <p className="text-gray-400">페이지를 이동하고 있습니다...</p>
    </div>
  )
}
