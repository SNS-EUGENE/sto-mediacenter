'use client'

import { useState, useMemo } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import GlassCard from '@/components/ui/GlassCard'
import StatusBadge from '@/components/ui/StatusBadge'
import {
  equipmentData,
  getEquipmentStatusCounts,
} from '@/lib/data/equipmentData'
import { EQUIPMENT_STATUS_LABELS } from '@/lib/constants'
import { Search, Camera, Lightbulb, Mic, Video, Package } from 'lucide-react'
import { cn } from '@/lib/utils'

// 장비 카테고리 아이콘
function getEquipmentIcon(name: string) {
  const nameLower = name.toLowerCase()
  if (nameLower.includes('sony') || nameLower.includes('cam')) return Camera
  if (nameLower.includes('aputure') || nameLower.includes('light') || nameLower.includes('elgato') || nameLower.includes('led')) return Lightbulb
  if (nameLower.includes('rode') || nameLower.includes('mic')) return Mic
  if (nameLower.includes('dji') || nameLower.includes('gimbal') || nameLower.includes('atomos')) return Video
  return Package
}

export default function EquipmentsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null)

  // 상태별 카운트
  const statusCounts = getEquipmentStatusCounts()

  // 위치 목록
  const locations = useMemo(() => {
    const locs = new Set(equipmentData.map((eq) => eq.location))
    return Array.from(locs)
  }, [])

  // 필터링된 장비 목록
  const filteredEquipments = useMemo(() => {
    return equipmentData.filter((eq) => {
      // 검색어 필터
      if (searchTerm) {
        const search = searchTerm.toLowerCase()
        const matchesSearch =
          eq.name.toLowerCase().includes(search) ||
          eq.serialAlias.toLowerCase().includes(search) ||
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

      return true
    })
  }, [searchTerm, selectedStatus, selectedLocation])

  // 이슈가 있는 장비 (정상이 아닌 것)
  const issueEquipments = equipmentData.filter(
    (eq) => eq.status !== 'NORMAL' && eq.status !== 'REPAIRED'
  )

  return (
    <AdminLayout>
      <div className="h-[calc(100vh-120px)] lg:h-[calc(100vh-64px)] flex flex-col">
        {/* Header - Sticky */}
        <div className="flex-shrink-0 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-white mb-1">장비 관리</h1>
              <p className="text-sm text-gray-500">
                총 {equipmentData.length}개의 장비
              </p>
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
                placeholder="장비명, 시리얼, 위치 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-colors"
              />
            </div>

            {/* Location Filter */}
            <select
              value={selectedLocation || ''}
              onChange={(e) => setSelectedLocation(e.target.value || null)}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-colors"
            >
              <option value="">전체 위치</option>
              {locations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>

            {/* Clear Filters */}
            {(selectedStatus || selectedLocation || searchTerm) && (
              <button
                onClick={() => {
                  setSelectedStatus(null)
                  setSelectedLocation(null)
                  setSearchTerm('')
                }}
                className="px-4 py-2.5 text-sm text-red-400 hover:text-red-300 transition-colors"
              >
                초기화
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-2">
          {/* Issue Alert */}
          {issueEquipments.length > 0 && (
            <GlassCard className="mb-4 border-yellow-500/20 bg-yellow-500/5">
              <h3 className="text-sm font-semibold text-yellow-400 mb-3">
                점검 필요 장비 ({issueEquipments.length}개)
              </h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {issueEquipments.map((eq) => (
                  <div
                    key={eq.id}
                    className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.02]"
                  >
                    <StatusBadge status={eq.status} type="equipment" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{eq.name}</p>
                      <p className="text-xs text-gray-500">{eq.serialAlias}</p>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          {/* Equipment Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredEquipments.map((equipment) => {
              const Icon = getEquipmentIcon(equipment.name)

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

                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-white/5">
                      <Icon className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {equipment.name}
                      </p>
                      <p className="text-xs text-gray-500">{equipment.serialAlias}</p>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-500">{equipment.location}</span>
                      <StatusBadge status={equipment.status} type="equipment" />
                    </div>
                    {equipment.notes && (
                      <p className="text-xs text-gray-400 truncate">{equipment.notes}</p>
                    )}
                    {equipment.lastChecked && (
                      <p className="text-[10px] text-gray-600 mt-1">
                        최근 점검: {equipment.lastChecked}
                      </p>
                    )}
                  </div>
                </GlassCard>
              )
            })}
          </div>

          {/* Empty State */}
          {filteredEquipments.length === 0 && (
            <GlassCard className="text-center py-12">
              <p className="text-gray-500">검색 결과가 없습니다</p>
            </GlassCard>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
