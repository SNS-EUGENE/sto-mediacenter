'use client'

import { useState, useEffect, useCallback } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import GlassCard from '@/components/ui/GlassCard'
import KPIModal from '@/components/modals/KPIModal'
import { supabase } from '@/lib/supabase/client'
import { Plus, Presentation, Film, Gift, Edit, Trash2, Loader2, Calendar, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

// KPI 탭 타입
type KPITab = 'programs' | 'contents' | 'goods'

// 프로그램 타입 상수
const PROGRAM_TYPE_LABELS: Record<string, string> = {
  EXPERIENCE_DAY: '체험데이',
  LECTURE: '강연',
  CONSULTING: '컨설팅',
  OTHER: '기타',
}

// 미디어 타입 상수 (영상 송출 위치)
const MEDIA_TYPE_LABELS: Record<string, string> = {
  SPHERE: '구형',
  PILLAR: '기둥형',
  FACADE: '파사드',
}

// 프로그램 타입
interface Program {
  id: string
  name: string
  program_type: string | null
  description: string | null
  event_date: string
  participants_count: number
  status: string
  notes: string | null
}

// 콘텐츠 타입
interface Content {
  id: string
  title: string
  content_type: string | null
  media_type: string | null
  description: string | null
  production_date: string
  creator: string | null
  status: string
  url: string | null
}

// 굿즈/이벤트 타입
interface GoodsEvent {
  id: string
  name: string
  event_type: string | null
  description: string | null
  target_count: number
  achieved_count: number
  start_date: string | null
  end_date: string | null
  status: string
}

export default function KPIPage() {
  const [activeTab, setActiveTab] = useState<KPITab>('programs')
  const [loading, setLoading] = useState(true)

  // 데이터 상태
  const [programs, setPrograms] = useState<Program[]>([])
  const [contents, setContents] = useState<Content[]>([])
  const [goodsEvents, setGoodsEvents] = useState<GoodsEvent[]>([])

  // 모달 상태
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<Program | Content | GoodsEvent | null>(null)

  // 데이터 로드
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [programsRes, contentsRes, goodsRes] = await Promise.all([
        supabase.from('programs').select('*').order('event_date', { ascending: false }),
        supabase.from('contents').select('*').order('production_date', { ascending: false }),
        supabase.from('goods_events').select('*').order('start_date', { ascending: false }),
      ])

      if (programsRes.data) setPrograms(programsRes.data)
      if (contentsRes.data) setContents(contentsRes.data)
      if (goodsRes.data) setGoodsEvents(goodsRes.data)
    } catch (err) {
      console.error('Failed to load KPI data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // 통계 계산
  const stats = {
    programs: {
      total: programs.length,
      completed: programs.filter((p) => p.status === 'COMPLETED').length,
    },
    contents: {
      total: contents.length,
      completed: contents.filter((c) => c.status === 'COMPLETED' || c.status === 'PUBLISHED').length,
    },
    goods: {
      total: goodsEvents.length,
      rate: goodsEvents.length > 0
        ? Math.round(
            (goodsEvents.reduce((sum, g) => sum + g.achieved_count, 0) /
              Math.max(goodsEvents.reduce((sum, g) => sum + g.target_count, 0), 1)) *
              100
          )
        : 0,
    },
  }

  // 삭제 핸들러
  const handleDelete = async (id: string, table: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      await supabase.from(table).delete().eq('id', id)
      loadData()
    } catch (err) {
      console.error('Delete failed:', err)
    }
  }

  // 탭 설정
  const tabs = [
    {
      id: 'programs' as KPITab,
      label: '프로그램 운영',
      icon: <Presentation className="w-4 h-4" />,
      color: 'rose',
      count: stats.programs.completed,
      target: 60,
    },
    {
      id: 'contents' as KPITab,
      label: '콘텐츠 제작',
      icon: <Film className="w-4 h-4" />,
      color: 'orange',
      count: stats.contents.completed,
      target: 60,
    },
    {
      id: 'goods' as KPITab,
      label: '굿즈/이벤트',
      icon: <Gift className="w-4 h-4" />,
      color: 'emerald',
      count: stats.goods.rate,
      target: 100,
      isPercent: true,
    },
  ]

  return (
    <AdminLayout>
      <div className="h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-white mb-1">KPI 관리</h1>
            <p className="text-sm text-gray-500">프로그램, 콘텐츠, 굿즈 실적 관리</p>
          </div>

          <button
            onClick={() => {
              setEditItem(null)
              setShowModal(true)
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-500 text-white hover:bg-purple-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>새 항목 추가</span>
          </button>
        </div>

        {/* Tab KPI Summary */}
        <div className="flex-shrink-0 grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            const rate = tab.isPercent ? tab.count : Math.round((tab.count / tab.target) * 100)

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'p-2 sm:p-4 rounded-xl border transition-all text-left',
                  isActive
                    ? `bg-${tab.color}-500/20 border-${tab.color}-500/50`
                    : 'bg-white/5 border-white/10 hover:bg-white/[0.07]'
                )}
              >
                <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
                  <div className={cn('p-1 sm:p-1.5 rounded-lg', `bg-${tab.color}-500/20`)}>
                    {tab.icon}
                  </div>
                  <span className="text-xs sm:text-sm text-white font-medium truncate">{tab.label}</span>
                </div>
                <div className="flex items-baseline gap-1 sm:gap-2">
                  <span className="text-lg sm:text-2xl font-bold text-white">
                    {tab.count}
                    {tab.isPercent && '%'}
                  </span>
                  <span className="text-xs sm:text-sm text-gray-500 hidden xs:inline">/ {tab.target}{tab.isPercent ? '%' : '건'}</span>
                </div>
                <div className="h-1 sm:h-1.5 bg-white/10 rounded-full overflow-hidden mt-1.5 sm:mt-2">
                  <div
                    className={cn('h-full rounded-full', `bg-${tab.color}-500`)}
                    style={{ width: `${Math.min(rate, 100)}%` }}
                  />
                </div>
              </button>
            )
          })}
        </div>

        {/* Content List */}
        <GlassCard className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {/* Programs Tab */}
              {activeTab === 'programs' && (
                <div className="space-y-3">
                  {programs.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">등록된 프로그램이 없습니다</p>
                  ) : (
                    programs.map((program) => (
                      <div
                        key={program.id}
                        className="p-4 rounded-xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.05] transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className={cn(
                                'px-2 py-0.5 text-xs rounded-full',
                                program.status === 'COMPLETED'
                                  ? 'bg-green-500/20 text-green-400'
                                  : program.status === 'CANCELLED'
                                    ? 'bg-red-500/20 text-red-400'
                                    : 'bg-yellow-500/20 text-yellow-400'
                              )}>
                                {program.status === 'COMPLETED' ? '완료' : program.status === 'CANCELLED' ? '취소' : '예정'}
                              </span>
                              <span className="px-2 py-0.5 text-xs rounded-full bg-purple-500/20 text-purple-400">
                                {PROGRAM_TYPE_LABELS[program.program_type || 'OTHER'] || '기타'}
                              </span>
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {program.event_date}
                              </span>
                            </div>
                            <h3 className="text-white font-medium">{program.name}</h3>
                            {program.description && (
                              <p className="text-sm text-gray-400 mt-1 line-clamp-1">{program.description}</p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                              참석자: {program.participants_count}명
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setEditItem(program)
                                setShowModal(true)
                              }}
                              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(program.id, 'programs')}
                              className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Contents Tab */}
              {activeTab === 'contents' && (
                <div className="space-y-3">
                  {contents.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">등록된 콘텐츠가 없습니다</p>
                  ) : (
                    contents.map((content) => (
                      <div
                        key={content.id}
                        className="p-4 rounded-xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.05] transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className={cn(
                                'px-2 py-0.5 text-xs rounded-full',
                                content.status === 'PUBLISHED'
                                  ? 'bg-purple-500/20 text-purple-400'
                                  : content.status === 'COMPLETED'
                                    ? 'bg-green-500/20 text-green-400'
                                    : 'bg-yellow-500/20 text-yellow-400'
                              )}>
                                {content.status === 'PUBLISHED' ? '발행됨' : content.status === 'COMPLETED' ? '완료' : '진행중'}
                              </span>
                              {content.content_type && (
                                <span className="px-2 py-0.5 text-xs rounded-full bg-orange-500/20 text-orange-400">
                                  {content.content_type === 'VIDEO' ? '영상' : content.content_type === 'IMAGE' ? '이미지' : content.content_type === 'DOCUMENT' ? '문서' : content.content_type === 'DESIGN' ? '디자인' : '기타'}
                                </span>
                              )}
                              {content.media_type && (
                                <span className="px-2 py-0.5 text-xs rounded-full bg-cyan-500/20 text-cyan-400">
                                  {MEDIA_TYPE_LABELS[content.media_type] || content.media_type}
                                </span>
                              )}
                            </div>
                            <h3 className="text-white font-medium">{content.title}</h3>
                            {content.description && (
                              <p className="text-sm text-gray-400 mt-1 line-clamp-1">{content.description}</p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                              {content.production_date} {content.creator && `· ${content.creator}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setEditItem(content)
                                setShowModal(true)
                              }}
                              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(content.id, 'contents')}
                              className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Goods/Events Tab */}
              {activeTab === 'goods' && (
                <div className="space-y-3">
                  {goodsEvents.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">등록된 굿즈/이벤트가 없습니다</p>
                  ) : (
                    goodsEvents.map((item) => (
                      <div
                        key={item.id}
                        className="p-4 rounded-xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.05] transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={cn(
                                'px-2 py-0.5 text-xs rounded-full',
                                item.status === 'COMPLETED'
                                  ? 'bg-green-500/20 text-green-400'
                                  : item.status === 'CANCELLED'
                                    ? 'bg-red-500/20 text-red-400'
                                    : 'bg-cyan-500/20 text-cyan-400'
                              )}>
                                {item.status === 'COMPLETED' ? '완료' : item.status === 'CANCELLED' ? '취소' : '진행중'}
                              </span>
                              {item.event_type && (
                                <span className="text-xs text-gray-500">{item.event_type}</span>
                              )}
                            </div>
                            <h3 className="text-white font-medium">{item.name}</h3>
                            {item.description && (
                              <p className="text-sm text-gray-400 mt-1 line-clamp-1">{item.description}</p>
                            )}
                            <div className="flex items-center gap-4 mt-2">
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <CheckCircle className="w-3 h-3" />
                                달성: {item.achieved_count} / {item.target_count}
                              </div>
                              {item.start_date && (
                                <span className="text-xs text-gray-500">
                                  {item.start_date} ~ {item.end_date || ''}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setEditItem(item)
                                setShowModal(true)
                              }}
                              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id, 'goods_events')}
                              className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </GlassCard>

        {/* KPI Modal */}
        <KPIModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false)
            setEditItem(null)
          }}
          onSuccess={loadData}
          activeTab={activeTab}
          editItem={editItem}
        />
      </div>
    </AdminLayout>
  )
}
