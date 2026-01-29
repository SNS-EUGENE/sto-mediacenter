import { NextRequest, NextResponse } from 'next/server'

const KAKAOWORK_BOT_KEY = process.env.KAKAOWORK_BOT_KEY || ''

// GET: 봇이 참여한 채팅방 목록 조회
export async function GET() {
  if (!KAKAOWORK_BOT_KEY) {
    return NextResponse.json({ error: 'KAKAOWORK_BOT_KEY 환경변수가 설정되지 않았습니다.' }, { status: 500 })
  }

  try {
    const response = await fetch('https://api.kakaowork.com/v1/conversations.list', {
      headers: {
        'Authorization': `Bearer ${KAKAOWORK_BOT_KEY}`,
      },
    })

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

// POST: 테스트 메시지 보내기
export async function POST(request: NextRequest) {
  if (!KAKAOWORK_BOT_KEY) {
    return NextResponse.json({ error: 'KAKAOWORK_BOT_KEY 환경변수가 설정되지 않았습니다.' }, { status: 500 })
  }

  try {
    const body = await request.json()
    const { conversation_id, email, text } = body

    let endpoint = ''
    let payload: Record<string, string> = { text: text || '테스트 메시지입니다.' }

    if (conversation_id) {
      // conversation_id로 보내기
      endpoint = 'https://api.kakaowork.com/v1/messages.send'
      payload.conversation_id = conversation_id
    } else if (email) {
      // 이메일로 보내기
      endpoint = 'https://api.kakaowork.com/v1/messages.send_by_email'
      payload.email = email
    } else {
      return NextResponse.json({ error: 'conversation_id 또는 email이 필요합니다.' }, { status: 400 })
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KAKAOWORK_BOT_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
