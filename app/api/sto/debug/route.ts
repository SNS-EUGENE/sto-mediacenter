// STO 디버깅용 API - 상세 페이지 HTML 확인
import { NextRequest, NextResponse } from 'next/server'
import { fetchBookingDetailPage, isSessionValid, setSession } from '@/lib/sto/client'
import { loadSessionFromDB } from '@/lib/sto/session-store'

export async function GET(request: NextRequest) {
  const reqstSn = request.nextUrl.searchParams.get('reqstSn')

  if (!reqstSn) {
    return NextResponse.json({ error: 'reqstSn 파라미터 필요' }, { status: 400 })
  }

  // 메모리에 세션이 없으면 DB에서 로드
  if (!isSessionValid()) {
    const storedSession = await loadSessionFromDB()
    if (storedSession) {
      setSession(storedSession)
    } else {
      return NextResponse.json({ error: 'STO 로그인 필요 (DB에 세션 없음)' }, { status: 401 })
    }
  }

  const result = await fetchBookingDetailPage(reqstSn)

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  // fileList1 영역만 추출
  const fileListMatch = result.html.match(/id=["']fileList1["'][^>]*>([\s\S]*?)<\/div>/i)
  const fileListHtml = fileListMatch ? fileListMatch[0] : 'fileList1 not found'

  // file-name 클래스 찾기
  const fileNameMatches = result.html.match(/<a[^>]*class=["'][^"']*file-name[^"']*["'][^>]*>[^<]*/gi)

  // 사업자등록증 관련 영역 찾기 (더 넓은 범위)
  const bizLicenseSection = result.html.match(/사업자등록증[\s\S]{0,1000}/i)

  return NextResponse.json({
    reqstSn,
    htmlLength: result.html.length,
    fileList1: fileListHtml,
    fileNameTags: fileNameMatches || [],
    bizLicenseSection: bizLicenseSection ? bizLicenseSection[0].substring(0, 500) : 'not found',
    // 전체 HTML의 일부 (디버깅용)
    htmlSnippet: result.html.substring(0, 3000),
  })
}
