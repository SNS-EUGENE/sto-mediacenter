// STO 예약 시스템 HTML 파서
import { STOBookingListItem, STOBookingDetail, STOBookingStatus, STATUS_MAP } from './types'

/**
 * HTML에서 텍스트 추출 (태그 제거)
 */
function extractText(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/=\r?\n/g, '')  // quoted-printable 줄바꿈 제거
    .replace(/=([0-9A-F]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))  // quoted-printable 디코딩
    .trim()
}

/**
 * 총 건수 추출
 */
export function parseTotalCount(html: string): number {
  // <div class="search-result-num">총 <strong>385</strong>건</div>
  const match = html.match(/search-result-num[^>]*>[\s\S]*?<strong>(\d+)<\/strong>/i)
  return match ? parseInt(match[1], 10) : 0
}

/**
 * 예약 목록 파싱
 */
export function parseBookingList(html: string): STOBookingListItem[] {
  const bookings: STOBookingListItem[] = []

  // tbody.dataTbody 내의 tr 추출
  const tbodyMatch = html.match(/<tbody\s+class=["']dataTbody["'][^>]*>([\s\S]*?)<\/tbody>/i)
  if (!tbodyMatch) {
    console.error('[STO Parser] dataTbody를 찾을 수 없습니다')
    return bookings
  }

  const tbody = tbodyMatch[1]

  // 각 tr 추출
  const rowRegex = /<tr>([\s\S]*?)<\/tr>/gi
  let rowMatch

  while ((rowMatch = rowRegex.exec(tbody)) !== null) {
    const row = rowMatch[1]

    // td 추출
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi
    const cells: string[] = []
    let tdMatch

    while ((tdMatch = tdRegex.exec(row)) !== null) {
      cells.push(tdMatch[1])
    }

    if (cells.length < 12) continue

    // reqstSn 추출 (링크에서)
    const linkMatch = cells[5].match(/reqstSn=(\d+)/)
    const reqstSn = linkMatch ? linkMatch[1] : ''

    // 예약 시간 추출 (br로 구분)
    const timeSlots = cells[4]
      .split(/<br\s*\/?>/i)
      .map(t => extractText(t))
      .filter(t => t.includes('~'))

    // 예약 상태 추출
    let status: STOBookingStatus = 'PENDING'
    const statusText = extractText(cells[8])
    if (statusText in STATUS_MAP) {
      status = STATUS_MAP[statusText]
    } else if (cells[8].includes('txt-green')) {
      status = 'CONFIRMED'
    } else if (cells[8].includes('txt-real-read')) {
      status = 'CANCELLED'
    }

    // 행사 규모 (숫자만 추출)
    const participantsText = extractText(cells[2])
    const participantsMatch = participantsText.match(/(\d+)/)
    const participantsCount = participantsMatch ? parseInt(participantsMatch[1], 10) : 0

    const booking: STOBookingListItem = {
      reqstSn,
      rowNumber: parseInt(extractText(cells[0]), 10) || 0,
      facilityName: extractText(cells[1]),
      participantsCount,
      rentalDate: extractText(cells[3]).replace(/\./g, '-'),  // 2026.03.03 → 2026-03-03
      timeSlots,
      applicantName: extractText(cells[5]).replace(/<a[^>]*>|<\/a>/gi, ''),
      organization: extractText(cells[6]),
      phone: extractText(cells[7]),
      status,
      cancelDate: extractText(cells[9]) || null,
      specialNote: extractText(cells[10]),
      createdAt: extractText(cells[11]).replace(/\./g, '-'),
    }

    if (reqstSn) {
      bookings.push(booking)
    }
  }

  return bookings
}

/**
 * 예약 상세 정보 파싱
 */
export function parseBookingDetail(html: string, listItem: STOBookingListItem): STOBookingDetail {
  const detail: STOBookingDetail = {
    ...listItem,
    applicationDate: '',
    fullName: '',
    fullPhone: '',
    email: '',
    companyPhone: '',
    purpose: '',
    userType: '',
    discountRate: 0,
    rentalFee: 0,
    bankAccount: '',
    hasNoShow: false,
    noShowMemo: '',
  }

  // form-list-item 에서 정보 추출하는 헬퍼
  const extractFieldValue = (label: string): string => {
    // 레이블 다음의 form-list-cont 값 추출
    const regex = new RegExp(
      `form-list-name[^>]*>\\s*${escapeRegex(label)}[\\s\\S]*?</div>\\s*<div[^>]*form-list-cont[^>]*>([\\s\\S]*?)</div>`,
      'i'
    )
    const match = html.match(regex)
    return match ? extractText(match[1]) : ''
  }

  // 신청일
  detail.applicationDate = extractFieldValue('신청일')

  // 예약일 (상세에서 더 정확한 값)
  const detailRentalDate = extractFieldValue('예약일')
  if (detailRentalDate) {
    detail.rentalDate = detailRentalDate.replace(/\./g, '-')
  }

  // 예약 시간 (상세)
  const detailTimeSlots = extractFieldValue('예약 시간')
  if (detailTimeSlots) {
    detail.timeSlots = detailTimeSlots.split(/[,\s]+/).filter(t => t.includes('~'))
  }

  // 신청자 정보
  detail.fullName = extractFieldValue('신청자명')
  detail.fullPhone = extractFieldValue('휴대폰')
  detail.email = extractFieldValue('이메일')
  detail.companyPhone = extractFieldValue('전화번호')
  detail.purpose = extractFieldValue('사용 목적')

  // 행사 규모 (상세)
  const detailParticipants = extractFieldValue('행사 규모')
  if (detailParticipants) {
    const match = detailParticipants.match(/(\d+)/)
    if (match) detail.participantsCount = parseInt(match[1], 10)
  }

  // 대관료 정보
  // 사용자 신청 유형 (select에서)
  const userTypeMatch = html.match(/userReqstTySn[^>]*>[\s\S]*?selected[^>]*>([^<]+)/i)
  detail.userType = userTypeMatch ? extractText(userTypeMatch[1]) : ''

  // 할인율
  const discountMatch = extractFieldValue('대관료 할인율')
  if (discountMatch) {
    const num = discountMatch.match(/(\d+)/)
    if (num) detail.discountRate = parseInt(num[1], 10)
  }

  // 대관료
  const rentalFeeMatch = html.match(/id=["']rentalFee["'][^>]*value=["'](\d+)["']/i)
  detail.rentalFee = rentalFeeMatch ? parseInt(rentalFeeMatch[1], 10) : 0

  // 입금 계좌
  detail.bankAccount = extractFieldValue('시설 대관료 입금 계좌')

  // No-Show
  const noShowMatch = html.match(/noshowAt2[^>]*checked/i)
  detail.hasNoShow = !!noShowMatch

  const noShowMemoMatch = html.match(/id=["']noshowMemo["'][^>]*value=["']([^"']*)["']/i)
  detail.noShowMemo = noShowMemoMatch ? noShowMemoMatch[1] : ''

  return detail
}

/**
 * 정규식 특수문자 이스케이프
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * 페이지네이션 정보 추출 (총 페이지 수)
 */
export function parseTotalPages(html: string, totalCount: number, itemsPerPage: number = 10): number {
  return Math.ceil(totalCount / itemsPerPage)
}
