'use client'

import { useState, useCallback } from 'react'
import { X, Upload, FileSpreadsheet, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import * as XLSX from 'xlsx'
import type { BookingInsert } from '@/types/supabase'

interface ExcelUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onUpload: (bookings: BookingInsert[]) => Promise<void>
}

// STO 엑셀 파일 파싱 결과
interface ParsedBooking {
  rentalDate: string
  timeSlots: number[]
  applicantName: string
  organization: string | null
  phone: string
  eventName: string | null
  studioId: number
  participantsCount: number
  fee: number
}

// 스튜디오 이름을 ID로 변환
function parseStudioName(name: string): number {
  const normalized = name.trim().toLowerCase()
  if (normalized.includes('메인') || normalized.includes('main') || normalized.includes('대형')) return 1
  if (normalized.includes('1인') && normalized.includes('a')) return 3
  if (normalized.includes('1인') && normalized.includes('b')) return 4
  if (normalized.includes('1인 스튜디오 a')) return 3
  if (normalized.includes('1인 스튜디오 b')) return 4
  return 1 // 기본값
}

// 시간 문자열을 슬롯 배열로 변환 (예: "09:00~12:00" -> [9, 10, 11])
function parseTimeRange(timeStr: string): number[] {
  const match = timeStr.match(/(\d{1,2}):?\d*\s*[~\-]\s*(\d{1,2}):?\d*/)
  if (!match) return []

  const start = parseInt(match[1])
  const end = parseInt(match[2])

  const slots: number[] = []
  for (let h = start; h < end && h < 18; h++) {
    if (h >= 9) slots.push(h)
  }
  return slots
}

// 날짜 파싱 (Excel 시리얼 넘버 또는 문자열)
function parseDate(value: unknown): string | null {
  if (!value) return null

  // Excel 시리얼 넘버
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value)
    if (date) {
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`
    }
  }

  // 문자열
  if (typeof value === 'string') {
    // YYYY-MM-DD
    const isoMatch = value.match(/(\d{4})-(\d{1,2})-(\d{1,2})/)
    if (isoMatch) {
      return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`
    }
    // YYYY/MM/DD
    const slashMatch = value.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/)
    if (slashMatch) {
      return `${slashMatch[1]}-${slashMatch[2].padStart(2, '0')}-${slashMatch[3].padStart(2, '0')}`
    }
    // YYYY.MM.DD
    const dotMatch = value.match(/(\d{4})\.(\d{1,2})\.(\d{1,2})/)
    if (dotMatch) {
      return `${dotMatch[1]}-${dotMatch[2].padStart(2, '0')}-${dotMatch[3].padStart(2, '0')}`
    }
  }

  return null
}

// 전화번호 정규화
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  return phone
}

export default function ExcelUploadModal({
  isOpen,
  onClose,
  onUpload,
}: ExcelUploadModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<ParsedBooking[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [uploadResult, setUploadResult] = useState<{ success: number; failed: number } | null>(null)

  // 파일 드롭 핸들러
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls'))) {
      setFile(droppedFile)
      parseExcel(droppedFile)
    } else {
      setParseError('엑셀 파일(.xlsx, .xls)만 업로드 가능합니다')
    }
  }, [])

  // 파일 선택 핸들러
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      parseExcel(selectedFile)
    }
  }

  // 엑셀 파싱
  const parseExcel = async (file: File) => {
    setLoading(true)
    setParseError(null)
    setParsedData([])
    setUploadResult(null)

    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })

      // 첫 번째 시트 사용
      const sheetName = workbook.SheetNames[0]
      const sheet = workbook.Sheets[sheetName]

      // JSON으로 변환 (헤더 포함)
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][]

      if (jsonData.length < 2) {
        throw new Error('데이터가 없습니다')
      }

      // 헤더 행 찾기 (예약일, 신청자, 연락처 등의 키워드로)
      let headerRow = 0
      const headerKeywords = ['예약일', '날짜', '신청자', '이름', '연락처', '전화', '스튜디오', '시간']

      for (let i = 0; i < Math.min(10, jsonData.length); i++) {
        const row = jsonData[i]
        if (Array.isArray(row)) {
          const rowStr = row.map(c => String(c || '')).join(' ').toLowerCase()
          if (headerKeywords.some(kw => rowStr.includes(kw))) {
            headerRow = i
            break
          }
        }
      }

      const headers = (jsonData[headerRow] as string[]).map(h => String(h || '').trim().toLowerCase())

      // 컬럼 인덱스 찾기
      const findColumn = (keywords: string[]): number => {
        return headers.findIndex(h => keywords.some(kw => h.includes(kw)))
      }

      const dateCol = findColumn(['예약일', '날짜', 'date'])
      const timeCol = findColumn(['시간', 'time'])
      const studioCol = findColumn(['스튜디오', 'studio', '장소'])
      const nameCol = findColumn(['신청자', '이름', 'name', '담당자'])
      const orgCol = findColumn(['소속', '기관', 'organization', '회사'])
      const phoneCol = findColumn(['연락처', '전화', 'phone', '휴대폰'])
      const eventCol = findColumn(['행사명', '내용', 'event', '촬영내용', '용도'])
      const countCol = findColumn(['인원', '참석', 'count', '명'])
      const feeCol = findColumn(['대관료', '요금', 'fee', '금액'])

      if (dateCol === -1 || nameCol === -1) {
        throw new Error('필수 컬럼(예약일, 신청자)을 찾을 수 없습니다. 엑셀 파일 형식을 확인해주세요.')
      }

      const bookings: ParsedBooking[] = []

      for (let i = headerRow + 1; i < jsonData.length; i++) {
        const row = jsonData[i] as unknown[]
        if (!row || row.length === 0) continue

        const dateValue = row[dateCol]
        const rentalDate = parseDate(dateValue)
        if (!rentalDate) continue

        const applicantName = String(row[nameCol] || '').trim()
        if (!applicantName) continue

        const timeValue = timeCol >= 0 ? String(row[timeCol] || '') : '09:00~18:00'
        const timeSlots = parseTimeRange(timeValue)
        if (timeSlots.length === 0) continue

        const studioName = studioCol >= 0 ? String(row[studioCol] || '') : '메인 스튜디오'
        const studioId = parseStudioName(studioName)

        const phone = phoneCol >= 0 ? normalizePhone(String(row[phoneCol] || '')) : ''
        const organization = orgCol >= 0 ? String(row[orgCol] || '').trim() || null : null
        const eventName = eventCol >= 0 ? String(row[eventCol] || '').trim() || null : null
        const participantsCount = countCol >= 0 ? parseInt(String(row[countCol])) || 1 : 1
        const fee = feeCol >= 0 ? parseInt(String(row[feeCol]).replace(/[^0-9]/g, '')) || 0 : 0

        bookings.push({
          rentalDate,
          timeSlots,
          applicantName,
          organization,
          phone: phone || '000-0000-0000',
          eventName,
          studioId,
          participantsCount,
          fee,
        })
      }

      if (bookings.length === 0) {
        throw new Error('파싱된 예약 데이터가 없습니다')
      }

      setParsedData(bookings)
    } catch (err) {
      setParseError(err instanceof Error ? err.message : '파일 파싱에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  // 업로드 실행
  const handleUpload = async () => {
    if (parsedData.length === 0) return

    setUploadLoading(true)
    try {
      const bookingsToUpload: BookingInsert[] = parsedData.map(b => ({
        studio_id: b.studioId,
        rental_date: b.rentalDate,
        time_slots: b.timeSlots,
        applicant_name: b.applicantName,
        organization: b.organization,
        phone: b.phone,
        event_name: b.eventName,
        purpose: null,
        participants_count: b.participantsCount,
        fee: b.fee || null,
        status: 'CONFIRMED',
        payment_confirmed: false,
        cancelled_at: null,
      }))

      await onUpload(bookingsToUpload)
      setUploadResult({ success: bookingsToUpload.length, failed: 0 })
    } catch (err) {
      console.error('Upload failed:', err)
      setUploadResult({ success: 0, failed: parsedData.length })
    } finally {
      setUploadLoading(false)
    }
  }

  // 초기화
  const handleReset = () => {
    setFile(null)
    setParsedData([])
    setParseError(null)
    setUploadResult(null)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-3xl max-h-[90vh] mx-4 bg-[#12121a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-green-400" />
            엑셀 업로드
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Upload Zone */}
          {!file && (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-white/20 rounded-2xl p-12 text-center hover:border-purple-500/50 transition-colors"
            >
              <Upload className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400 mb-2">엑셀 파일을 여기에 드롭하거나</p>
              <label className="inline-block px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium rounded-xl cursor-pointer transition-colors">
                파일 선택
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
              <p className="text-xs text-gray-600 mt-4">
                지원 형식: .xlsx, .xls (STO 시스템 내보내기 파일)
              </p>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-4" />
              <p className="text-gray-400">파일 파싱 중...</p>
            </div>
          )}

          {/* Parse Error */}
          {parseError && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-red-400">{parseError}</p>
                <button
                  onClick={handleReset}
                  className="mt-2 text-xs text-gray-400 hover:text-white transition-colors"
                >
                  다시 시도
                </button>
              </div>
            </div>
          )}

          {/* Parsed Data Preview */}
          {parsedData.length > 0 && !uploadResult && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-400">
                  <span className="text-white font-medium">{parsedData.length}</span>건의 예약 데이터
                </p>
                <button
                  onClick={handleReset}
                  className="text-xs text-gray-500 hover:text-white transition-colors"
                >
                  다시 선택
                </button>
              </div>

              {/* Preview Table */}
              <div className="border border-white/10 rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-[300px]">
                  <table className="w-full text-sm">
                    <thead className="bg-white/5 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs text-gray-500">예약일</th>
                        <th className="px-3 py-2 text-left text-xs text-gray-500">시간</th>
                        <th className="px-3 py-2 text-left text-xs text-gray-500">스튜디오</th>
                        <th className="px-3 py-2 text-left text-xs text-gray-500">신청자</th>
                        <th className="px-3 py-2 text-left text-xs text-gray-500">소속</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {parsedData.slice(0, 20).map((booking, idx) => (
                        <tr key={idx} className="hover:bg-white/[0.02]">
                          <td className="px-3 py-2 text-white">{booking.rentalDate}</td>
                          <td className="px-3 py-2 text-gray-400">
                            {Math.min(...booking.timeSlots)}:00~{Math.max(...booking.timeSlots) + 1}:00
                          </td>
                          <td className="px-3 py-2 text-gray-400">
                            {booking.studioId === 1 ? '메인' : booking.studioId === 3 ? '1인A' : '1인B'}
                          </td>
                          <td className="px-3 py-2 text-white">{booking.applicantName}</td>
                          <td className="px-3 py-2 text-gray-500">{booking.organization || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parsedData.length > 20 && (
                  <div className="px-3 py-2 text-xs text-gray-500 bg-white/[0.02] border-t border-white/5">
                    +{parsedData.length - 20}건 더 있음
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Upload Result */}
          {uploadResult && (
            <div className={cn(
              'p-4 rounded-xl flex items-start gap-3',
              uploadResult.success > 0 ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'
            )}>
              {uploadResult.success > 0 ? (
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <p className={cn('text-sm', uploadResult.success > 0 ? 'text-green-400' : 'text-red-400')}>
                  {uploadResult.success > 0
                    ? `${uploadResult.success}건의 예약이 성공적으로 등록되었습니다`
                    : '업로드에 실패했습니다'
                  }
                </p>
                <button
                  onClick={() => {
                    handleReset()
                    if (uploadResult.success > 0) onClose()
                  }}
                  className="mt-2 text-xs text-gray-400 hover:text-white transition-colors"
                >
                  {uploadResult.success > 0 ? '닫기' : '다시 시도'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {parsedData.length > 0 && !uploadResult && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10 bg-white/[0.02]">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleUpload}
              disabled={uploadLoading}
              className="flex items-center gap-2 px-5 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              {uploadLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {parsedData.length}건 업로드
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
