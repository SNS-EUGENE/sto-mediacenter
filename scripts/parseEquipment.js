const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// 엑셀 파일 읽기
const workbook = XLSX.readFile(path.join(__dirname, '..', '장비 목록.xlsx'));
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet);

// 자재(materials) 분류 - System Installation 카테고리
const materialCategories = ['System Installation'];

// 결과 저장
const equipment = [];
const materials = [];

// 위치별 카운터
const counters = {
  'MS': 0, // 메인 스튜디오
  '1A': 0, // 1인 스튜디오 A
  '1B': 0, // 1인 스튜디오 B
};

// 같은 종류 그룹핑을 위한 맵
const groupMap = new Map();

// 서브인덱스 문자 (A-Z)
const subIndices = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// 데이터 처리
data.forEach((row, idx) => {
  const originalIndex = row['연번'] || idx + 1;
  const rawLocation = row['위치'] || '';
  const subLocation = row['위치 (상세)'] || row['위치(상세)'] || '';
  const name = row['물품명'] || '';
  const category = row['분류'] || '';
  const spec = row['내용 및 사양'] || row['내용및사양'] || '';
  const quantity = parseInt(row['수량']) || 1;
  const unit = row['단위'] || '';
  const rawSerialNumber = row['시리얼넘버'] || '';
  // 시리얼넘버를 줄바꿈으로 분리하여 배열로
  const serialNumbers = rawSerialNumber
    ? rawSerialNumber.split(/\r?\n/).map(s => s.trim()).filter(s => s)
    : [];
  const notes = row['기타'] || '';

  if (!name) return;

  // 자재 여부 확인
  const isMaterial = materialCategories.includes(category);

  // 상태 결정 (기타 필드에서 고장/수리 키워드 확인)
  let status = 'NORMAL';
  if (notes) {
    const lowerNotes = notes.toLowerCase();
    if (lowerNotes.includes('고장') || lowerNotes.includes('파손')) {
      status = 'BROKEN';
    } else if (lowerNotes.includes('수리중') || lowerNotes.includes('수리 중')) {
      status = 'REPAIRING';
    } else if (lowerNotes.includes('이상') || lowerNotes.includes('불량')) {
      status = 'MALFUNCTION';
    }
  }

  // 위치 매핑
  if (rawLocation.includes('메인') || rawLocation.includes('대형')) {
    // 메인 스튜디오
    const location = '메인 스튜디오';
    const locationCode = 'MS';

    if (isMaterial) {
      // 자재는 분할하지 않음
      counters[locationCode]++;
      const id = `${locationCode}-${String(counters[locationCode]).padStart(3, '0')}`;
      materials.push({
        id,
        originalIndex: String(originalIndex),
        name,
        category,
        spec,
        location,
        subLocation,
        quantity,
        unit,
        serialNumber: serialNumbers.join(', '),
        status,
        notes,
        isMaterial: true,
      });
    } else {
      // 장비는 수량만큼 분할
      if (quantity > 1) {
        // 같은 종류 그룹핑
        counters[locationCode]++;
        const baseNum = counters[locationCode];
        for (let i = 0; i < quantity; i++) {
          const id = `${locationCode}-${String(baseNum).padStart(3, '0')}-${subIndices[i]}`;
          equipment.push({
            id,
            originalIndex: String(originalIndex),
            name,
            category,
            spec,
            location,
            subLocation,
            quantity: 1,
            unit,
            serialNumber: serialNumbers[i] || '',
            status,
            notes,
            isMaterial: false,
          });
        }
      } else {
        counters[locationCode]++;
        const id = `${locationCode}-${String(counters[locationCode]).padStart(3, '0')}`;
        equipment.push({
          id,
          originalIndex: String(originalIndex),
          name,
          category,
          spec,
          location,
          subLocation,
          quantity: 1,
          unit,
          serialNumber: serialNumbers[0] || '',
          status,
          notes,
          isMaterial: false,
        });
      }
    }
  } else if (rawLocation.includes('1인')) {
    // 1인 스튜디오 - A/B로 분할 (조정실 제외)
    if (subLocation === '조정실') {
      // 조정실은 A에만 배치
      const location = '1인 스튜디오 A';
      const locationCode = '1A';

      if (isMaterial) {
        counters[locationCode]++;
        const id = `${locationCode}-${String(counters[locationCode]).padStart(3, '0')}`;
        materials.push({
          id,
          originalIndex: String(originalIndex),
          name,
          category,
          spec,
          location,
          subLocation,
          quantity,
          unit,
          serialNumber: serialNumbers.join(', '),
          status,
          notes,
          isMaterial: true,
        });
      } else {
        if (quantity > 1) {
          counters[locationCode]++;
          const baseNum = counters[locationCode];
          for (let i = 0; i < quantity; i++) {
            const id = `${locationCode}-${String(baseNum).padStart(3, '0')}-${subIndices[i]}`;
            equipment.push({
              id,
              originalIndex: String(originalIndex),
              name,
              category,
              spec,
              location,
              subLocation,
              quantity: 1,
              unit,
              serialNumber: serialNumbers[i] || '',
              status,
              notes,
              isMaterial: false,
            });
          }
        } else {
          counters[locationCode]++;
          const id = `${locationCode}-${String(counters[locationCode]).padStart(3, '0')}`;
          equipment.push({
            id,
            originalIndex: String(originalIndex),
            name,
            category,
            spec,
            location,
            subLocation,
            quantity: 1,
            unit,
            serialNumber: serialNumbers[0] || '',
            status,
            notes,
            isMaterial: false,
          });
        }
      }
    } else {
      // 스튜디오 A/B로 분할
      const qtyPerStudio = Math.ceil(quantity / 2);

      ['1A', '1B'].forEach((locationCode, studioIdx) => {
        const location = studioIdx === 0 ? '1인 스튜디오 A' : '1인 스튜디오 B';
        const detailSubLocation = studioIdx === 0 ? '스튜디오 A' : '스튜디오 B';
        const actualQty = studioIdx === 0 ? qtyPerStudio : quantity - qtyPerStudio;

        if (actualQty <= 0) return;

        if (isMaterial) {
          counters[locationCode]++;
          const id = `${locationCode}-${String(counters[locationCode]).padStart(3, '0')}`;
          materials.push({
            id,
            originalIndex: String(originalIndex),
            name,
            category,
            spec,
            location,
            subLocation: detailSubLocation,
            quantity: actualQty,
            unit,
            serialNumber: serialNumbers.join(', '),
            status,
            notes,
            isMaterial: true,
          });
        } else {
          if (actualQty > 1) {
            counters[locationCode]++;
            const baseNum = counters[locationCode];
            for (let i = 0; i < actualQty; i++) {
              const id = `${locationCode}-${String(baseNum).padStart(3, '0')}-${subIndices[i]}`;
              equipment.push({
                id,
                originalIndex: String(originalIndex),
                name,
                category,
                spec,
                location,
                subLocation: detailSubLocation,
                quantity: 1,
                unit,
                serialNumber: serialNumbers[studioIdx * qtyPerStudio + i] || '',
                status,
                notes,
                isMaterial: false,
              });
            }
          } else {
            counters[locationCode]++;
            const id = `${locationCode}-${String(counters[locationCode]).padStart(3, '0')}`;
            // A/B 분할 시 각각의 시리얼 인덱스
            const serialIdx = studioIdx === 0 ? 0 : qtyPerStudio;
            equipment.push({
              id,
              originalIndex: String(originalIndex),
              name,
              category,
              spec,
              location,
              subLocation: detailSubLocation,
              quantity: 1,
              unit,
              serialNumber: serialNumbers[serialIdx] || '',
              status,
              notes,
              isMaterial: false,
            });
          }
        }
      });
    }
  }
});

// 결과 출력
console.log('=== 파싱 결과 ===');
console.log(`장비: ${equipment.length}개`);
console.log(`자재: ${materials.length}개`);
console.log(`총계: ${equipment.length + materials.length}개`);

console.log('\n=== 위치별 통계 ===');
console.log(`메인 스튜디오: ${equipment.filter(e => e.location === '메인 스튜디오').length + materials.filter(e => e.location === '메인 스튜디오').length}개`);
console.log(`1인 스튜디오 A: ${equipment.filter(e => e.location === '1인 스튜디오 A').length + materials.filter(e => e.location === '1인 스튜디오 A').length}개`);
console.log(`1인 스튜디오 B: ${equipment.filter(e => e.location === '1인 스튜디오 B').length + materials.filter(e => e.location === '1인 스튜디오 B').length}개`);

console.log('\n=== 샘플 데이터 (처음 10개) ===');
equipment.slice(0, 10).forEach(e => {
  console.log(`${e.id}: ${e.name} (${e.location}${e.subLocation ? ' - ' + e.subLocation : ''})`);
});

// TypeScript 파일 생성
const allItems = [...equipment, ...materials];

const tsContent = `// 장비 데이터 - 자동 생성됨 (${new Date().toISOString().split('T')[0]})
// 원본: 장비 목록.xlsx

export interface EquipmentItem {
  id: string
  originalIndex: string
  name: string
  category: string
  spec: string
  location: string
  subLocation: string
  quantity: number
  unit: string
  serialNumber: string
  status: string
  notes: string
  isMaterial: boolean
}

// 전체 장비/자재 데이터
export const equipmentData: EquipmentItem[] = ${JSON.stringify(allItems, null, 2)}

// 장비만 필터링
export const equipmentOnly = equipmentData.filter(item => !item.isMaterial)

// 자재만 필터링
export const materialsOnly = equipmentData.filter(item => item.isMaterial)

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

// 카테고리별 장비 그룹
export function getEquipmentByCategory() {
  const grouped: Record<string, EquipmentItem[]> = {}

  equipmentData.forEach((eq) => {
    if (!grouped[eq.category]) {
      grouped[eq.category] = []
    }
    grouped[eq.category].push(eq)
  })

  return grouped
}
`;

fs.writeFileSync(
  path.join(__dirname, '..', 'lib', 'data', 'equipmentData.ts'),
  tsContent,
  'utf8'
);

console.log('\n✓ lib/data/equipmentData.ts 파일이 생성되었습니다.');
