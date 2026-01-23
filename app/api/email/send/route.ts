// 이메일 발송 API (Resend)
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

interface EmailPayload {
  to: string | string[]
  subject: string
  html: string
  text?: string
}

export async function POST(request: NextRequest) {
  try {
    const { to, subject, html, text }: EmailPayload = await request.json()

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: 'RESEND_API_KEY 환경변수가 설정되지 않았습니다.' },
        { status: 500 }
      )
    }

    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다 (to, subject, html)' },
        { status: 400 }
      )
    }

    // 동적으로 Resend 클라이언트 생성
    const resend = new Resend(process.env.RESEND_API_KEY)
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'studio@resend.dev'

    const { data, error } = await resend.emails.send({
      from: `종로 스튜디오 FMS <${fromEmail}>`,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
    })

    if (error) {
      console.error('[Email] 발송 실패:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: data?.id })
  } catch (error) {
    console.error('[Email] 오류:', error)
    return NextResponse.json(
      { error: '이메일 발송 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
