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
 * 네가 준 텍스트 구조 기준으로 전체 필드 추출
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
    businessLicense: '',
    receiptType: '',
    businessNumber: '',
    hasNoShow: false,
    noShowMemo: '',
    studioUsageMethod: '',
    fileDeliveryMethod: '',
    preMeetingContact: '',
    otherInquiry: '',
  }

  // form-list-item 에서 정보 추출하는 헬퍼
  // 구조: <div class="form-list-name">레이블</div><div class="form-list-cont">값</div>
  const extractFieldValue = (label: string): string => {
    // 레이블 찾고 바로 다음 form-list-cont 내용만 추출 (non-greedy)
    const regex = new RegExp(
      `<div[^>]*class=["'][^"']*form-list-name[^"']*["'][^>]*>[^<]*${escapeRegex(label)}[^<]*</div>\\s*<div[^>]*class=["'][^"']*form-list-cont[^"']*["'][^>]*>([\\s\\S]*?)</div>`,
      'i'
    )
    const match = html.match(regex)
    if (!match) return ''

    // 값에서 select/input 태그 제거하고 텍스트만 추출
    let value = match[1]
    // select 태그가 있으면 selected option만 추출
    const selectMatch = value.match(/<option[^>]*selected(?:=["'][^"']*["'])?[^>]*>([^<]+)/i)
    if (selectMatch) {
      return extractText(selectMatch[1])
    }
    // input 태그가 있으면 value 추출
    const inputMatch = value.match(/<input[^>]*value=["']([^"']*)["']/i)
    if (inputMatch) {
      return extractText(inputMatch[1])
    }
    // 일반 텍스트
    return extractText(value)
  }

  // ========== 신청 내역 ==========
  detail.applicationDate = extractFieldValue('신청일')

  const facilityName = extractFieldValue('신청 시설')
  if (facilityName) detail.facilityName = facilityName

  // ========== 예약 일자 및 시간 ==========
  const detailRentalDate = extractFieldValue('예약일')
  if (detailRentalDate) {
    detail.rentalDate = detailRentalDate.replace(/\./g, '-')
  }

  const detailTimeSlots = extractFieldValue('예약 시간')
  if (detailTimeSlots) {
    detail.timeSlots = detailTimeSlots.split(/[,\s]+/).filter(t => t.includes('~'))
  }

  // ========== 신청자 정보 ==========
  detail.fullName = extractFieldValue('신청자명')
  detail.fullPhone = extractFieldValue('휴대폰')
  detail.email = extractFieldValue('이메일')
  detail.organization = extractFieldValue('소속') || detail.organization
  detail.companyPhone = extractFieldValue('전화번호')
  detail.purpose = extractFieldValue('사용 목적')

  // 행사 규모 (예: 2 명)
  const detailParticipants = extractFieldValue('행사 규모')
  if (detailParticipants) {
    const match = detailParticipants.match(/(\d+)/)
    if (match) detail.participantsCount = parseInt(match[1], 10)
  }

  // 특이사항
  detail.specialNote = extractFieldValue('특이사항') || detail.specialNote

  // ========== 대관료 정보 ==========
  // 사용자 신청 유형 - select에서 selected된 option만 추출
  // HTML: <select id="userReqstTySn" name="userReqstTySn">
  const userTypeSelectMatch = html.match(/<select[^>]*(?:id|name)=["']userReqstTySn["'][^>]*>[\s\S]*?<option[^>]*selected[^>]*>([^<]+)/i)
  if (userTypeSelectMatch) {
    detail.userType = extractText(userTypeSelectMatch[1]).trim()
  }

  // 할인율 (대관료 할인률)
  const discountText = extractFieldValue('대관료 할인률') || extractFieldValue('대관료 할인율')
  if (discountText) {
    const num = discountText.match(/(\d+)/)
    if (num) detail.discountRate = parseInt(num[1], 10)
  } else {
    // id="dscntRt" div에서
    const discountDivMatch = html.match(/id=["']dscntRt["'][^>]*>([^<]*)/i)
    if (discountDivMatch) {
      const num = discountDivMatch[1].match(/(\d+)/)
      if (num) detail.discountRate = parseInt(num[1], 10)
    }
  }

  // 대관료 - input#rentalFee에서 직접 추출 (extractFieldValue는 "대관료 할인률"과 충돌)
  const rentalFeeMatch = html.match(/id=["']rentalFee["'][^>]*value=["'](\d+)["']/i)
  if (rentalFeeMatch) {
    detail.rentalFee = parseInt(rentalFeeMatch[1], 10)
  }

  // 입금 계좌
  detail.bankAccount = extractFieldValue('시설 대관료 입금 계좌')

  // ========== 증빙 발행 ==========
  // 사업자등록증 파일명
  const bizLicenseMatch = html.match(/<a[^>]*class=["'][^"']*file-down[^"']*["'][^>]*>([^<]+\.pdf)/i)
  detail.businessLicense = bizLicenseMatch ? extractText(bizLicenseMatch[1]) : ''

  // 증빙 발행 유형
  detail.receiptType = extractFieldValue('증빙 발행 유형 선택')

  // 사업자번호
  detail.businessNumber = extractFieldValue('사업자번호')

  // ========== No-Show ==========
  const noShowMatch = html.match(/id=["']noshowAt2["'][^>]*checked/i)
  detail.hasNoShow = !!noShowMatch

  const noShowMemoMatch = html.match(/id=["']noshowMemo["'][^>]*value=["']([^"']*)["']/i)
  detail.noShowMemo = noShowMemoMatch ? noShowMemoMatch[1] : ''

  // ========== 스튜디오 오퍼레이팅 지원 ==========
  // 이 필드들은 라벨이 있는 li 다음 li에 값이 있는 구조
  // 라벨 -> </li> -> <li> -> form-list-cont -> 값
  const extractNextLiValue = (label: string): string => {
    const regex = new RegExp(
      `${escapeRegex(label)}[\\s\\S]*?</li>[\\s\\S]*?<li[^>]*>[\\s\\S]*?<div[^>]*class=["'][^"']*form-list-cont[^"']*["'][^>]*>([\\s\\S]*?)</div>`,
      'i'
    )
    const match = html.match(regex)
    return match ? extractText(match[1]).trim() : ''
  }

  detail.studioUsageMethod = extractNextLiValue('어떤 방식으로 스튜디오를 사용하실 예정이신가요')
  detail.fileDeliveryMethod = extractNextLiValue('파일 원본은 어떻게 받길 원하십니까')
  detail.preMeetingContact = extractNextLiValue('스튜디오 사전 미팅을 원하시면 아래 연락처를 남겨주세요')
  detail.otherInquiry = extractNextLiValue('기타 스튜디오에 문의할 점을 기재해 주세요')

  // ========== 신청 상태 ==========
  const statusMatch = html.match(/<select[^>]*id=["']reqstSttusCd["'][^>]*>[\s\S]*?<option[^>]*selected[^>]*>([^<]+)/i)
  if (statusMatch) {
    const statusText = extractText(statusMatch[1])
    if (statusText in STATUS_MAP) {
      detail.status = STATUS_MAP[statusText]
    }
  }

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
