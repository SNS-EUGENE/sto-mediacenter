'use client'

import { useState } from 'react'

export default function KakaoWorkTestPage() {
  const [result, setResult] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('h_eugene0626@naver.com')
  const [conversationId, setConversationId] = useState('')
  const [message, setMessage] = useState('종로 스튜디오 알림 테스트입니다.')

  // 채팅방 목록 조회
  const fetchConversations = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/kakaowork/test')
      const data = await res.json()
      setResult(JSON.stringify(data, null, 2))
    } catch (err) {
      setResult(String(err))
    }
    setLoading(false)
  }

  // 이메일로 메시지 보내기
  const sendByEmail = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/kakaowork/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, text: message }),
      })
      const data = await res.json()
      setResult(JSON.stringify(data, null, 2))
    } catch (err) {
      setResult(String(err))
    }
    setLoading(false)
  }

  // conversation_id로 메시지 보내기
  const sendByConversation = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/kakaowork/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: conversationId, text: message }),
      })
      const data = await res.json()
      setResult(JSON.stringify(data, null, 2))
    } catch (err) {
      setResult(String(err))
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-gray-900">카카오워크 연동 테스트</h1>

        {/* 채팅방 목록 조회 */}
        <div className="bg-white rounded-lg shadow p-6 mb-4">
          <h2 className="font-semibold mb-3 text-gray-900">1. 봇이 참여한 채팅방 목록 조회</h2>
          <button
            onClick={fetchConversations}
            disabled={loading}
            className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 disabled:opacity-50"
          >
            {loading ? '조회 중...' : '채팅방 목록 조회'}
          </button>
        </div>

        {/* 이메일로 보내기 */}
        <div className="bg-white rounded-lg shadow p-6 mb-4">
          <h2 className="font-semibold mb-3 text-gray-900">2. 이메일로 1:1 메시지 보내기</h2>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="카카오워크 이메일"
            className="w-full border rounded px-3 py-2 mb-2 text-gray-900 bg-white"
          />
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="메시지"
            className="w-full border rounded px-3 py-2 mb-2 text-gray-900 bg-white"
          />
          <button
            onClick={sendByEmail}
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? '전송 중...' : '이메일로 보내기'}
          </button>
        </div>

        {/* conversation_id로 보내기 */}
        <div className="bg-white rounded-lg shadow p-6 mb-4">
          <h2 className="font-semibold mb-3 text-gray-900">3. 채팅방 ID로 메시지 보내기</h2>
          <input
            type="text"
            value={conversationId}
            onChange={(e) => setConversationId(e.target.value)}
            placeholder="conversation_id"
            className="w-full border rounded px-3 py-2 mb-2 text-gray-900 bg-white"
          />
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="메시지"
            className="w-full border rounded px-3 py-2 mb-2 text-gray-900 bg-white"
          />
          <button
            onClick={sendByConversation}
            disabled={loading}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
          >
            {loading ? '전송 중...' : '채팅방으로 보내기'}
          </button>
        </div>

        {/* 결과 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold mb-3 text-gray-900">결과</h2>
          <pre className="bg-gray-900 text-green-400 p-4 rounded overflow-auto text-sm max-h-96">
            {result || '결과가 여기에 표시됩니다.'}
          </pre>
        </div>
      </div>
    </div>
  )
}
