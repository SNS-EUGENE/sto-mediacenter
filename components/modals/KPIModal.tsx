'use client'

import { useState, useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

// 타입 정의
interface Program {
  id?: string
  name: string
  description: string | null
  event_date: string
  participants_count: number
  status: string
  notes: string | null
}

interface Content {
  id?: string
  title: string
  content_type: string | null
  description: string | null
  production_date: string
  creator: string | null
  status: string
  url: string | null
}

interface GoodsEvent {
  id?: string
  name: string
  event_type: string | null
  description: string | null
  target_count: number
  achieved_count: number
  start_date: string | null
  end_date: string | null
  status: string
}

type KPITab = 'programs' | 'contents' | 'goods'
type KPIItem = Program | Content | GoodsEvent

interface KPIModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  activeTab: KPITab
  editItem?: KPIItem | null
}

export default function KPIModal({ isOpen, onClose, onSuccess, activeTab, editItem }: KPIModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 프로그램 폼
  const [programForm, setProgramForm] = useState<Program>({
    name: '',
    description: null,
    event_date: new Date().toISOString().split('T')[0],
    participants_count: 0,
    status: 'PLANNED',
    notes: null,
  })

  // 콘텐츠 폼
  const [contentForm, setContentForm] = useState<Content>({
    title: '',
    content_type: 'VIDEO',
    description: null,
    production_date: new Date().toISOString().split('T')[0],
    creator: null,
    status: 'IN_PROGRESS',
    url: null,
  })

  // 굿즈/이벤트 폼
  const [goodsForm, setGoodsForm] = useState<GoodsEvent>({
    name: '',
    event_type: 'EVENT',
    description: null,
    target_count: 0,
    achieved_count: 0,
    start_date: new Date().toISOString().split('T')[0],
    end_date: null,
    status: 'ACTIVE',
  })

  // 수정 모드일 때 데이터 로드
  useEffect(() => {
    if (editItem) {
      if (activeTab === 'programs') {
        setProgramForm(editItem as Program)
      } else if (activeTab === 'contents') {
        setContentForm(editItem as Content)
      } else {
        setGoodsForm(editItem as GoodsEvent)
      }
    } else {
      // 신규 등록시 초기화
      setProgramForm({
        name: '',
        description: null,
        event_date: new Date().toISOString().split('T')[0],
        participants_count: 0,
        status: 'PLANNED',
        notes: null,
      })
      setContentForm({
        title: '',
        content_type: 'VIDEO',
        description: null,
        production_date: new Date().toISOString().split('T')[0],
        creator: null,
        status: 'IN_PROGRESS',
        url: null,
      })
      setGoodsForm({
        name: '',
        event_type: 'EVENT',
        description: null,
        target_count: 0,
        achieved_count: 0,
        start_date: new Date().toISOString().split('T')[0],
        end_date: null,
        status: 'ACTIVE',
      })
    }
    setError(null)
  }, [editItem, activeTab, isOpen])

  // 저장 핸들러
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (activeTab === 'programs') {
        const data = { ...programForm }
        delete (data as { id?: string }).id
        if (editItem?.id) {
          // @ts-expect-error - KPI 테이블 타입 미정의
          const { error } = await supabase.from('programs').update(data).eq('id', editItem.id)
          if (error) throw error
        } else {
          // @ts-expect-error - KPI 테이블 타입 미정의
          const { error } = await supabase.from('programs').insert(data)
          if (error) throw error
        }
      } else if (activeTab === 'contents') {
        const data = { ...contentForm }
        delete (data as { id?: string }).id
        if (editItem?.id) {
          // @ts-expect-error - KPI 테이블 타입 미정의
          const { error } = await supabase.from('contents').update(data).eq('id', editItem.id)
          if (error) throw error
        } else {
          // @ts-expect-error - KPI 테이블 타입 미정의
          const { error } = await supabase.from('contents').insert(data)
          if (error) throw error
        }
      } else {
        const data = { ...goodsForm }
        delete (data as { id?: string }).id
        if (editItem?.id) {
          // @ts-expect-error - KPI 테이블 타입 미정의
          const { error } = await supabase.from('goods_events').update(data).eq('id', editItem.id)
          if (error) throw error
        } else {
          // @ts-expect-error - KPI 테이블 타입 미정의
          const { error } = await supabase.from('goods_events').insert(data)
          if (error) throw error
        }
      }

      onSuccess()
      onClose()
    } catch (err) {
      console.error('Save failed:', err)
      setError('저장에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const inputClass = 'w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500/50 transition-colors'
  const labelClass = 'block text-sm text-gray-400 mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[#1a1a24] rounded-2xl border border-white/10">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-white/10 bg-[#1a1a24]">
          <h3 className="text-lg font-semibold text-white">
            {editItem ? '항목 수정' : '새 항목 추가'} - {' '}
            {activeTab === 'programs' ? '프로그램' : activeTab === 'contents' ? '콘텐츠' : '굿즈/이벤트'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* 프로그램 폼 */}
          {activeTab === 'programs' && (
            <>
              <div>
                <label className={labelClass}>프로그램명 *</label>
                <input
                  type="text"
                  value={programForm.name}
                  onChange={(e) => setProgramForm({ ...programForm, name: e.target.value })}
                  className={inputClass}
                  required
                  placeholder="프로그램 이름을 입력하세요"
                />
              </div>
              <div>
                <label className={labelClass}>설명</label>
                <textarea
                  value={programForm.description || ''}
                  onChange={(e) => setProgramForm({ ...programForm, description: e.target.value || null })}
                  className={cn(inputClass, 'resize-none h-20')}
                  placeholder="프로그램 설명"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>행사일 *</label>
                  <input
                    type="date"
                    value={programForm.event_date}
                    onChange={(e) => setProgramForm({ ...programForm, event_date: e.target.value })}
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>참석자 수</label>
                  <input
                    type="number"
                    value={programForm.participants_count}
                    onChange={(e) => setProgramForm({ ...programForm, participants_count: parseInt(e.target.value) || 0 })}
                    className={inputClass}
                    min="0"
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>상태 *</label>
                <select
                  value={programForm.status}
                  onChange={(e) => setProgramForm({ ...programForm, status: e.target.value })}
                  className={inputClass}
                >
                  <option value="PLANNED">예정</option>
                  <option value="COMPLETED">완료</option>
                  <option value="CANCELLED">취소</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>비고</label>
                <textarea
                  value={programForm.notes || ''}
                  onChange={(e) => setProgramForm({ ...programForm, notes: e.target.value || null })}
                  className={cn(inputClass, 'resize-none h-16')}
                  placeholder="추가 메모"
                />
              </div>
            </>
          )}

          {/* 콘텐츠 폼 */}
          {activeTab === 'contents' && (
            <>
              <div>
                <label className={labelClass}>콘텐츠 제목 *</label>
                <input
                  type="text"
                  value={contentForm.title}
                  onChange={(e) => setContentForm({ ...contentForm, title: e.target.value })}
                  className={inputClass}
                  required
                  placeholder="콘텐츠 제목을 입력하세요"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>콘텐츠 유형</label>
                  <select
                    value={contentForm.content_type || 'VIDEO'}
                    onChange={(e) => setContentForm({ ...contentForm, content_type: e.target.value })}
                    className={inputClass}
                  >
                    <option value="VIDEO">영상</option>
                    <option value="IMAGE">이미지</option>
                    <option value="DOCUMENT">문서</option>
                    <option value="DESIGN">디자인</option>
                    <option value="OTHER">기타</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>제작일 *</label>
                  <input
                    type="date"
                    value={contentForm.production_date}
                    onChange={(e) => setContentForm({ ...contentForm, production_date: e.target.value })}
                    className={inputClass}
                    required
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>설명</label>
                <textarea
                  value={contentForm.description || ''}
                  onChange={(e) => setContentForm({ ...contentForm, description: e.target.value || null })}
                  className={cn(inputClass, 'resize-none h-20')}
                  placeholder="콘텐츠 설명"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>제작자</label>
                  <input
                    type="text"
                    value={contentForm.creator || ''}
                    onChange={(e) => setContentForm({ ...contentForm, creator: e.target.value || null })}
                    className={inputClass}
                    placeholder="담당자 이름"
                  />
                </div>
                <div>
                  <label className={labelClass}>상태 *</label>
                  <select
                    value={contentForm.status}
                    onChange={(e) => setContentForm({ ...contentForm, status: e.target.value })}
                    className={inputClass}
                  >
                    <option value="IN_PROGRESS">진행중</option>
                    <option value="COMPLETED">완료</option>
                    <option value="PUBLISHED">발행됨</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={labelClass}>URL</label>
                <input
                  type="url"
                  value={contentForm.url || ''}
                  onChange={(e) => setContentForm({ ...contentForm, url: e.target.value || null })}
                  className={inputClass}
                  placeholder="https://..."
                />
              </div>
            </>
          )}

          {/* 굿즈/이벤트 폼 */}
          {activeTab === 'goods' && (
            <>
              <div>
                <label className={labelClass}>이름 *</label>
                <input
                  type="text"
                  value={goodsForm.name}
                  onChange={(e) => setGoodsForm({ ...goodsForm, name: e.target.value })}
                  className={inputClass}
                  required
                  placeholder="굿즈/이벤트 이름"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>유형</label>
                  <select
                    value={goodsForm.event_type || 'EVENT'}
                    onChange={(e) => setGoodsForm({ ...goodsForm, event_type: e.target.value })}
                    className={inputClass}
                  >
                    <option value="GOODS">굿즈</option>
                    <option value="EVENT">이벤트</option>
                    <option value="PROMOTION">프로모션</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>상태 *</label>
                  <select
                    value={goodsForm.status}
                    onChange={(e) => setGoodsForm({ ...goodsForm, status: e.target.value })}
                    className={inputClass}
                  >
                    <option value="ACTIVE">진행중</option>
                    <option value="COMPLETED">완료</option>
                    <option value="CANCELLED">취소</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={labelClass}>설명</label>
                <textarea
                  value={goodsForm.description || ''}
                  onChange={(e) => setGoodsForm({ ...goodsForm, description: e.target.value || null })}
                  className={cn(inputClass, 'resize-none h-20')}
                  placeholder="상세 설명"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>목표 수량</label>
                  <input
                    type="number"
                    value={goodsForm.target_count}
                    onChange={(e) => setGoodsForm({ ...goodsForm, target_count: parseInt(e.target.value) || 0 })}
                    className={inputClass}
                    min="0"
                  />
                </div>
                <div>
                  <label className={labelClass}>달성 수량</label>
                  <input
                    type="number"
                    value={goodsForm.achieved_count}
                    onChange={(e) => setGoodsForm({ ...goodsForm, achieved_count: parseInt(e.target.value) || 0 })}
                    className={inputClass}
                    min="0"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>시작일</label>
                  <input
                    type="date"
                    value={goodsForm.start_date || ''}
                    onChange={(e) => setGoodsForm({ ...goodsForm, start_date: e.target.value || null })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>종료일</label>
                  <input
                    type="date"
                    value={goodsForm.end_date || ''}
                    onChange={(e) => setGoodsForm({ ...goodsForm, end_date: e.target.value || null })}
                    className={inputClass}
                  />
                </div>
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-50 transition-colors"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {editItem ? '수정' : '등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
