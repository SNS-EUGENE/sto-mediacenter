// 예약 데이터를 SQL INSERT 문으로 변환하는 스크립트
import * as fs from 'fs'
import * as path from 'path'

// booking_data.json 직접 로드
const bookingDataPath = path.join(__dirname, '../booking_data.json')
const rawData = JSON.parse(fs.readFileSync(bookingDataPath, 'utf-8'))

console.log(`총 ${rawData.length}개 예약 데이터 로드됨`)

// 스튜디오 매핑 (신청시설 -> studio_id)
// 새 구조: 1=메인, 2=1인(카테고리), 3=스튜디오A, 4=스튜디오B
function getStudioId(name: string): number {
  if (name.includes('대형') || name.includes('메인')) return 1
  if (name.includes('1인') && (name.includes('#1') || name.includes('A'))) return 3  // 스튜디오 A
  if (name.includes('1인') && (name.includes('#2') || name.includes('B'))) return 4  // 스튜디오 B
  return 1
}

// 예약 상태 매핑
function getStatusCode(status: string): string {
  const map: Record<string, string> = {
    '예약신청': 'APPLIED',
    '승인대기': 'PENDING',
    '대관확정': 'CONFIRMED',
    '사용중': 'IN_USE',
    '완료': 'DONE',
    '예약취소': 'CANCELLED',
  }
  return map[status] || 'APPLIED'
}

// 날짜 변환 (2026.03.03 -> 2026-03-03)
function parseDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString().split('T')[0]
  return dateStr.replace(/\./g, '-')
}

// 시간대 파싱 -> time_slots 배열
function parseTimeSlots(timeStr: string): number[] {
  if (!timeStr) return [9]

  const slots: number[] = []
  const matches = timeStr.matchAll(/(\d{1,2}):\d*~(\d{1,2}):\d*/g)

  for (const match of matches) {
    const start = parseInt(match[1], 10)
    const end = parseInt(match[2], 10)
    // 시작 시간만 슬롯으로 추가 (9~10시 = 슬롯 9)
    for (let h = start; h < end; h++) {
      if (!slots.includes(h)) {
        slots.push(h)
      }
    }
  }

  return slots.length > 0 ? slots.sort((a, b) => a - b) : [9]
}

// 인원수 파싱 (최소 1명)
function parseParticipants(str: string): number {
  if (!str) return 1
  const match = str.match(/(\d+)/)
  const count = match ? parseInt(match[1], 10) : 1
  return count < 1 ? 1 : count  // 최소 1명 보장
}

// SQL 문자열 이스케이프
function escapeSQL(str: string | null | undefined): string {
  if (!str) return ''
  return String(str).replace(/'/g, "''")
}

// 모든 예약 처리 (취소 포함)
const allBookings = rawData
console.log(`전체 ${allBookings.length}개 예약 (취소 ${rawData.filter((b: any) => b.예약상태 === '예약취소').length}건 포함)`)

// SQL INSERT 문 생성
let sql = `-- 예약 데이터 INSERT (자동 생성: ${new Date().toISOString().split('T')[0]})
-- 총 ${allBookings.length}개 (취소 건 포함)

`

const BATCH_SIZE = 50

for (let i = 0; i < allBookings.length; i += BATCH_SIZE) {
  const batch = allBookings.slice(i, i + BATCH_SIZE)

  sql += `-- Batch ${Math.floor(i / BATCH_SIZE) + 1}\n`
  sql += `INSERT INTO bookings (studio_id, rental_date, time_slots, applicant_name, organization, phone, event_name, purpose, participants_count, payment_confirmed, status, cancelled_at)\nVALUES\n`

  const values = batch.map((b: any) => {
    const studioId = getStudioId(b.신청시설)
    const rentalDate = parseDate(b.예약일)
    const timeSlots = parseTimeSlots(b.예약시간)
    const statusCode = getStatusCode(b.예약상태)
    const participants = parseParticipants(b.행사규모)
    const paymentConfirmed = statusCode === 'CONFIRMED'
    const cancelledAt = b.취소일시 ? `'${b.취소일시}'` : 'NULL'

    return `  (${studioId}, '${rentalDate}', ARRAY[${timeSlots.join(',')}], '${escapeSQL(b.신청자명)}', '${escapeSQL(b.소속)}', '010-0000-0000', '${escapeSQL(b.행사명)}', '${escapeSQL(b.행사명)}', ${participants}, ${paymentConfirmed}, '${statusCode}', ${cancelledAt})`
  })

  sql += values.join(',\n') + ';\n\n'
}

// 파일로 저장
const outputPath = path.join(__dirname, '../supabase/seed_bookings.sql')
fs.writeFileSync(outputPath, sql, 'utf-8')

console.log(`SQL 파일 생성 완료: ${outputPath}`)
console.log(`파일 크기: ${(sql.length / 1024).toFixed(2)} KB`)
