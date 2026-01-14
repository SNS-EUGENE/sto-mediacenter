'use client'

import { useState, useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EQUIPMENT_STATUS_LABELS } from '@/lib/constants'
import type { Equipment, EquipmentStatus, EquipmentInsert } from '@/types/supabase'

// 위치 옵션
const LOCATIONS = ['메인 스튜디오', '1인 스튜디오 A', '1인 스튜디오 B']
const SUB_LOCATIONS = ['스튜디오', '조정실', '서버실']

// 카테고리 옵션
const CATEGORIES = [
  'Camera',
  'Lighting',
  'Audio',
  'Switcher/Video',
  'Monitor',
  'Network/Intercom',
  'Installation',
  'Accessories',
  'Materials',
]

interface EquipmentModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: EquipmentInsert) => Promise<void>
  equipment?: Equipment | null
}

export default function EquipmentModal({
  isOpen,
  onClose,
  onSubmit,
  equipment,
}: EquipmentModalProps) {
  const isEditMode = !!equipment

  // Form state
  const [id, setId] = useState('')
  const [originalIndex, setOriginalIndex] = useState('')
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [spec, setSpec] = useState('')
  const [location, setLocation] = useState('메인 스튜디오')
  const [subLocation, setSubLocation] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [unit, setUnit] = useState('EA')
  const [serialNumber, setSerialNumber] = useState('')
  const [status, setStatus] = useState<EquipmentStatus>('NORMAL')
  const [notes, setNotes] = useState('')
  const [isMaterial, setIsMaterial] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 모달이 열릴 때 데이터 초기화
  useEffect(() => {
    if (isOpen) {
      if (equipment) {
        setId(equipment.id)
        setOriginalIndex(equipment.original_index)
        setName(equipment.name)
        setCategory(equipment.category)
        setSpec(equipment.spec || '')
        setLocation(equipment.location)
        setSubLocation(equipment.sub_location || '')
        setQuantity(equipment.quantity || 1)
        setUnit(equipment.unit || 'EA')
        setSerialNumber(equipment.serial_number || '')
        setStatus(equipment.status)
        setNotes(equipment.notes || '')
        setIsMaterial(equipment.is_material)
      } else {
        setId('')
        setOriginalIndex('')
        setName('')
        setCategory('')
        setSpec('')
        setLocation('메인 스튜디오')
        setSubLocation('')
        setQuantity(1)
        setUnit('EA')
        setSerialNumber('')
        setStatus('NORMAL')
        setNotes('')
        setIsMaterial(false)
      }
      setError(null)
    }
  }, [isOpen, equipment])

  // 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!id.trim()) {
      setError('일련번호를 입력해주세요')
      return
    }
    if (!name.trim()) {
      setError('장비명을 입력해주세요')
      return
    }
    if (!category) {
      setError('카테고리를 선택해주세요')
      return
    }

    setLoading(true)
    try {
      const data: EquipmentInsert = {
        original_index: originalIndex.trim() || id.trim(),
        name: name.trim(),
        category,
        spec: spec.trim() || null,
        location,
        sub_location: subLocation || null,
        quantity,
        unit,
        serial_number: serialNumber.trim() || null,
        status,
        notes: notes.trim() || null,
        is_material: isMaterial,
        image_url: null,
      }
      await onSubmit(data)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] mx-4 bg-[#12121a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <h2 className="text-lg font-bold text-white">
            {isEditMode ? '장비 수정' : '새 장비 등록'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="p-6 space-y-5">
            {/* 일련번호 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  일련번호 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  placeholder="MS-001-A"
                  disabled={isEditMode}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 transition-colors disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">원본 연번</label>
                <input
                  type="text"
                  value={originalIndex}
                  onChange={(e) => setOriginalIndex(e.target.value)}
                  placeholder="1"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 transition-colors"
                />
              </div>
            </div>

            {/* 장비명 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                장비명 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="PTZ Camera"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 transition-colors"
              />
            </div>

            {/* 카테고리 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                카테고리 <span className="text-red-400">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                      category === cat
                        ? 'bg-purple-500 text-white'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* 스펙 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">스펙/모델명</label>
              <input
                type="text"
                value={spec}
                onChange={(e) => setSpec(e.target.value)}
                placeholder="Sony PXW-Z150"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 transition-colors"
              />
            </div>

            {/* 위치 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">위치</label>
                <div className="flex flex-wrap gap-2">
                  {LOCATIONS.map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => setLocation(loc)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                        location === loc
                          ? 'bg-purple-500 text-white'
                          : 'bg-white/5 text-gray-400 hover:bg-white/10'
                      )}
                    >
                      {loc.replace('스튜디오', '')}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">세부 위치</label>
                <div className="flex flex-wrap gap-2">
                  {SUB_LOCATIONS.map((sub) => (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => setSubLocation(subLocation === sub ? '' : sub)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                        subLocation === sub
                          ? 'bg-purple-500 text-white'
                          : 'bg-white/5 text-gray-400 hover:bg-white/10'
                      )}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 수량 */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">수량</label>
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value) || 1)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">단위</label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="EA"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">시리얼 넘버</label>
                <input
                  type="text"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  placeholder="SN-12345"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 transition-colors"
                />
              </div>
            </div>

            {/* 상태 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">상태</label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(EQUIPMENT_STATUS_LABELS).map(([code, label]) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setStatus(code as EquipmentStatus)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                      status === code
                        ? 'bg-purple-500 text-white'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* 비고 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">비고</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="특이사항이 있으면 입력하세요"
                rows={2}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 transition-colors resize-none"
              />
            </div>

            {/* 자재 여부 */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsMaterial(!isMaterial)}
                className={cn(
                  'w-5 h-5 rounded border-2 transition-all flex items-center justify-center',
                  isMaterial
                    ? 'bg-cyan-500 border-cyan-500'
                    : 'border-white/20 hover:border-white/40'
                )}
              >
                {isMaterial && (
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
              <label className="text-sm text-gray-300 cursor-pointer" onClick={() => setIsMaterial(!isMaterial)}>
                자재 (소모품)
              </label>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10 bg-white/[0.02]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEditMode ? '수정' : '등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
