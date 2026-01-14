'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import GlassCard from '@/components/ui/GlassCard'
import StatusBadge from '@/components/ui/StatusBadge'
import Select from '@/components/ui/Select'
import { getEquipments, getEquipmentStats } from '@/lib/supabase/queries'
import { EQUIPMENT_STATUS_LABELS } from '@/lib/constants'
import { Search, Camera, Lightbulb, Mic, Package, Monitor, Wifi, Cable, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Equipment } from '@/types/supabase'

// 카테고리별 아이콘
function getCategoryIcon(category: string) {
  const cat = category.toLowerCase()
  if (cat.includes('camera')) return Camera
  if (cat.includes('lighting')) return Lightbulb
  if (cat.includes('audio')) return Mic
  if (cat.includes('switcher') || cat.includes('monitor')) return Monitor
  if (cat.includes('intercom') || cat.includes('network')) return Wifi
  if (cat.includes('installation')) return Cable
  return Package
}

// 데이터 타입 옵션
const DATA_TYPES = [
  { value: 'all', label: '전체' },
  { value: 'equipment', label: '장비만' },
  { value: 'material', label: '자재만' },
]

export default function EquipmentsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [dataType, setDataType] = useState<string>('equipment')

  // Supabase 데이터 상태
  const [allEquipments, setAllEquipments] = useState<Equipment[]>([])
  const [stats, setStats] = useState<{
    total: number
    byStatus: Record<string, number>
    byLocation: Record<string, number>
    equipmentCount: number
    materialCount: number
  } | null>(null)
  const [loading, setLoading] = useState(true)

  // 데이터 로드
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [equipments, equipmentStats] = await Promise.all([
        getEquipments(),
        getEquipmentStats(),
      ])
      setAllEquipments(equipments)
      setStats(equipmentStats)
    } catch (err) {
      console.error('Failed to load equipments:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // 상태별 카운트
  const statusCounts = stats?.byStatus || {}

  // 위치 목록
  const locations = useMemo(() => {
    const locs = new Set(allEquipments.map((eq) => eq.location))
    return Array.from(locs).sort()
  }, [allEquipments])

  // 카테고리 목록
  const categories = useMemo(() => {
    const cats = new Set(allEquipments.map((eq) => eq.category))
    return Array.from(cats).filter(Boolean).sort()
  }, [allEquipments])

  // 장비만 / 자재만
  const equipmentOnly = useMemo(() => allEquipments.filter((eq) => !eq.is_material), [allEquipments])
  const materialsOnly = useMemo(() => allEquipments.filter((eq) => eq.is_material), [allEquipments])

  // 필터링된 장비 목록
  const filteredEquipments = useMemo(() => {
    // 데이터 타입 선택
    let baseData = allEquipments
    if (dataType === 'equipment') {
      baseData = equipmentOnly
    } else if (dataType === 'material') {
      baseData = materialsOnly
    }

    return baseData.filter((eq) => {
      // 검색어 필터
      if (searchTerm) {
        const search = searchTerm.toLowerCase()
        const matchesSearch =
          eq.name.toLowerCase().includes(search) ||
          eq.id.toLowerCase().includes(search) ||
          (eq.category?.toLowerCase().includes(search) ?? false) ||
          (eq.spec?.toLowerCase().includes(search) ?? false) ||
          eq.location.toLowerCase().includes(search)
        if (!matchesSearch) return false
      }

      // 상태 필터
      if (selectedStatus && eq.status !== selectedStatus) {
        return false
      }

      // 위치 필터
      if (selectedLocation && eq.location !== selectedLocation) {
        return false
      }

      // 카테고리 필터
      if (selectedCategory && eq.category !== selectedCategory) {
        return false
      }

      return true
    })
  }, [searchTerm, selectedStatus, selectedLocation, selectedCategory, dataType, allEquipments, equipmentOnly, materialsOnly])

  // 이슈가 있는 장비 (정상이 아닌 것)
  const issueEquipments = useMemo(() =>
    equipmentOnly.filter((eq) => eq.status !== 'NORMAL' && eq.status !== 'REPAIRED'),
    [equipmentOnly]
  )

  return (
    <AdminLayout>
      <div className="h-full flex flex-col overflow-hidden">
        {/* Header - Sticky */}
        <div className="flex-shrink-0 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-white mb-1">장비 관리</h1>
              <p className="text-sm text-gray-500">
                총 {allEquipments.length}개 (장비 {equipmentOnly.length}개, 자재 {materialsOnly.length}개)
              </p>
            </div>

            {/* Data Type Tabs */}
            <div className="flex gap-1 p-1 rounded-xl bg-white/5">
              {DATA_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setDataType(type.value)}
                  className={cn(
                    'px-4 py-2 text-sm rounded-lg transition-all',
                    dataType === type.value
                      ? 'bg-purple-500/30 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  )}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Status Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
            {Object.entries(EQUIPMENT_STATUS_LABELS).map(([code, label]) => {
              const count = statusCounts[code] || 0
              const isSelected = selectedStatus === code

              return (
                <button
                  key={code}
                  onClick={() => setSelectedStatus(isSelected ? null : code)}
                  className={cn(
                    'glass-card p-3 text-center transition-all',
                    isSelected
                      ? 'bg-purple-500/20 border-purple-500/30'
                      : 'hover:bg-white/[0.04]'
                  )}
                >
                  <p className="text-xl font-bold text-white mb-1">{count}</p>
                  <p className="text-xs text-gray-500">{label}</p>
                </button>
              )
            })}
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search Input */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="장비명, ID, 카테고리, 위치 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-colors"
              />
            </div>

            {/* Location Filter */}
            <Select
              value={selectedLocation || ''}
              onChange={(val) => setSelectedLocation(val || null)}
              placeholder="전체 위치"
              options={[
                { value: '', label: '전체 위치' },
                ...locations.map((loc) => ({
                  value: loc,
                  label: loc,
                })),
              ]}
            />

            {/* Category Filter */}
            <Select
              value={selectedCategory || ''}
              onChange={(val) => setSelectedCategory(val || null)}
              placeholder="전체 카테고리"
              options={[
                { value: '', label: '전체 카테고리' },
                ...categories.map((cat) => ({
                  value: cat,
                  label: cat,
                })),
              ]}
            />

            {/* Clear Filters */}
            {(selectedStatus || selectedLocation || selectedCategory || searchTerm) && (
              <button
                onClick={() => {
                  setSelectedStatus(null)
                  setSelectedLocation(null)
                  setSelectedCategory(null)
                  setSearchTerm('')
                }}
                className="px-4 py-2.5 text-sm text-red-400 hover:text-red-300 transition-colors whitespace-nowrap"
              >
                초기화
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-2 scrollbar-thin">
          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
              <span className="ml-2 text-gray-400">로딩 중...</span>
            </div>
          )}

          {/* Issue Alert */}
          {!loading && issueEquipments.length > 0 && dataType !== 'material' && (
            <GlassCard className="mb-4 border-yellow-500/20 bg-yellow-500/5">
              <h3 className="text-sm font-semibold text-yellow-400 mb-3">
                점검 필요 장비 ({issueEquipments.length}개)
              </h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {issueEquipments.slice(0, 6).map((eq) => (
                  <div
                    key={eq.id}
                    className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.02]"
                  >
                    <StatusBadge status={eq.status} type="equipment" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{eq.name}</p>
                      <p className="text-xs text-gray-500">{eq.id}</p>
                    </div>
                  </div>
                ))}
                {issueEquipments.length > 6 && (
                  <div className="flex items-center justify-center p-2 text-xs text-gray-500">
                    +{issueEquipments.length - 6}개 더
                  </div>
                )}
              </div>
            </GlassCard>
          )}

          {/* Results Count */}
          {!loading && (
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-500">
                {filteredEquipments.length}개 표시
              </p>
            </div>
          )}

          {/* Equipment Grid */}
          {!loading && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredEquipments.map((equipment) => {
              const Icon = getCategoryIcon(equipment.category)

              return (
                <GlassCard
                  key={equipment.id}
                  hover
                  className="relative overflow-hidden"
                >
                  {/* Status indicator */}
                  <div
                    className={cn(
                      'absolute top-0 right-0 w-2 h-2 rounded-bl-lg',
                      equipment.status === 'NORMAL' && 'bg-green-500',
                      equipment.status === 'BROKEN' && 'bg-red-500',
                      equipment.status === 'MALFUNCTION' && 'bg-orange-500',
                      equipment.status === 'REPAIRING' && 'bg-yellow-500',
                      equipment.status === 'REPAIRED' && 'bg-blue-500'
                    )}
                  />

                  {/* Material Badge */}
                  {equipment.is_material && (
                    <div className="absolute top-2 right-2">
                      <span className="px-1.5 py-0.5 text-[10px] rounded bg-cyan-500/20 text-cyan-400">
                        자재
                      </span>
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-white/5">
                      <Icon className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {equipment.name}
                      </p>
                      <p className="text-xs text-purple-400 font-mono">{equipment.id}</p>
                    </div>
                  </div>

                  {/* Spec */}
                  {equipment.spec && (
                    <p className="text-xs text-gray-400 mt-2 truncate">{equipment.spec}</p>
                  )}

                  <div className="mt-3 pt-3 border-t border-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <span className="text-xs text-gray-500">{equipment.location}</span>
                        {equipment.sub_location && (
                          <span className="text-xs text-gray-600"> · {equipment.sub_location}</span>
                        )}
                      </div>
                      <StatusBadge status={equipment.status} type="equipment" />
                    </div>

                    {/* Quantity for materials */}
                    {equipment.is_material && (equipment.quantity ?? 0) > 1 && (
                      <p className="text-xs text-gray-400">
                        수량: {equipment.quantity} {equipment.unit}
                      </p>
                    )}

                    {/* Category */}
                    <p className="text-[10px] text-gray-600 mt-1 truncate">
                      {equipment.category}
                    </p>

                    {equipment.notes && (
                      <p className="text-xs text-yellow-400/80 mt-1 truncate">{equipment.notes}</p>
                    )}
                  </div>
                </GlassCard>
              )
            })}
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredEquipments.length === 0 && (
            <GlassCard className="text-center py-12">
              <Package className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500">검색 결과가 없습니다</p>
            </GlassCard>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
