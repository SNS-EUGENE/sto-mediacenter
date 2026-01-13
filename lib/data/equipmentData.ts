// 장비 샘플 데이터
export interface EquipmentItem {
  id: string
  name: string
  serialAlias: string
  location: string
  status: string
  imageUrl?: string
  notes?: string
  lastChecked?: string
}

// 샘플 장비 데이터
export const equipmentData: EquipmentItem[] = [
  {
    id: 'eq-001',
    name: 'Sony FX3',
    serialAlias: 'CAM-001',
    location: '대형 스튜디오',
    status: 'NORMAL',
    lastChecked: '2026-01-10',
  },
  {
    id: 'eq-002',
    name: 'Sony A7S III',
    serialAlias: 'CAM-002',
    location: '1인 스튜디오 A',
    status: 'NORMAL',
    lastChecked: '2026-01-10',
  },
  {
    id: 'eq-003',
    name: 'Sony A7S III',
    serialAlias: 'CAM-003',
    location: '1인 스튜디오 B',
    status: 'REPAIRING',
    notes: '렌즈 마운트 수리 중',
    lastChecked: '2026-01-08',
  },
  {
    id: 'eq-004',
    name: 'Aputure 600d Pro',
    serialAlias: 'LIGHT-001',
    location: '대형 스튜디오',
    status: 'NORMAL',
    lastChecked: '2026-01-10',
  },
  {
    id: 'eq-005',
    name: 'Aputure 600d Pro',
    serialAlias: 'LIGHT-002',
    location: '대형 스튜디오',
    status: 'NORMAL',
    lastChecked: '2026-01-10',
  },
  {
    id: 'eq-006',
    name: 'Aputure 300d II',
    serialAlias: 'LIGHT-003',
    location: '1인 스튜디오 A',
    status: 'MALFUNCTION',
    notes: '팬 소음 발생',
    lastChecked: '2026-01-09',
  },
  {
    id: 'eq-007',
    name: 'Aputure 300d II',
    serialAlias: 'LIGHT-004',
    location: '1인 스튜디오 B',
    status: 'NORMAL',
    lastChecked: '2026-01-10',
  },
  {
    id: 'eq-008',
    name: 'Rode NTG5',
    serialAlias: 'MIC-001',
    location: '대형 스튜디오',
    status: 'NORMAL',
    lastChecked: '2026-01-10',
  },
  {
    id: 'eq-009',
    name: 'Rode Wireless GO II',
    serialAlias: 'MIC-002',
    location: '대형 스튜디오',
    status: 'NORMAL',
    lastChecked: '2026-01-10',
  },
  {
    id: 'eq-010',
    name: 'Rode Wireless GO II',
    serialAlias: 'MIC-003',
    location: '1인 스튜디오 A',
    status: 'BROKEN',
    notes: '수신기 고장 - 교체 필요',
    lastChecked: '2026-01-07',
  },
  {
    id: 'eq-011',
    name: 'DJI RS 3 Pro',
    serialAlias: 'GIMBAL-001',
    location: '대형 스튜디오',
    status: 'NORMAL',
    lastChecked: '2026-01-10',
  },
  {
    id: 'eq-012',
    name: 'DJI RS 3',
    serialAlias: 'GIMBAL-002',
    location: '1인 스튜디오 A',
    status: 'REPAIRED',
    notes: '모터 교체 완료',
    lastChecked: '2026-01-10',
  },
  {
    id: 'eq-013',
    name: 'Manfrotto 504X',
    serialAlias: 'TRIPOD-001',
    location: '대형 스튜디오',
    status: 'NORMAL',
    lastChecked: '2026-01-10',
  },
  {
    id: 'eq-014',
    name: 'Manfrotto 504X',
    serialAlias: 'TRIPOD-002',
    location: '대형 스튜디오',
    status: 'NORMAL',
    lastChecked: '2026-01-10',
  },
  {
    id: 'eq-015',
    name: 'Manfrotto Befree',
    serialAlias: 'TRIPOD-003',
    location: '1인 스튜디오 A',
    status: 'NORMAL',
    lastChecked: '2026-01-10',
  },
  {
    id: 'eq-016',
    name: 'Manfrotto Befree',
    serialAlias: 'TRIPOD-004',
    location: '1인 스튜디오 B',
    status: 'NORMAL',
    lastChecked: '2026-01-10',
  },
  {
    id: 'eq-017',
    name: 'Elgato Key Light Air',
    serialAlias: 'LED-001',
    location: '1인 스튜디오 A',
    status: 'NORMAL',
    lastChecked: '2026-01-10',
  },
  {
    id: 'eq-018',
    name: 'Elgato Key Light Air',
    serialAlias: 'LED-002',
    location: '1인 스튜디오 B',
    status: 'NORMAL',
    lastChecked: '2026-01-10',
  },
  {
    id: 'eq-019',
    name: 'Atomos Ninja V',
    serialAlias: 'MON-001',
    location: '대형 스튜디오',
    status: 'NORMAL',
    lastChecked: '2026-01-10',
  },
  {
    id: 'eq-020',
    name: 'Green Screen',
    serialAlias: 'BG-001',
    location: '대형 스튜디오',
    status: 'NORMAL',
    lastChecked: '2026-01-10',
  },
]

// 장비 상태별 카운트
export function getEquipmentStatusCounts() {
  const counts: Record<string, number> = {
    NORMAL: 0,
    BROKEN: 0,
    MALFUNCTION: 0,
    REPAIRING: 0,
    REPAIRED: 0,
  }

  equipmentData.forEach((eq) => {
    counts[eq.status] = (counts[eq.status] || 0) + 1
  })

  return counts
}

// 위치별 장비 그룹
export function getEquipmentByLocation() {
  const grouped: Record<string, EquipmentItem[]> = {}

  equipmentData.forEach((eq) => {
    if (!grouped[eq.location]) {
      grouped[eq.location] = []
    }
    grouped[eq.location].push(eq)
  })

  return grouped
}
