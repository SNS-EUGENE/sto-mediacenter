// 장비 데이터를 SQL INSERT 문으로 변환하는 스크립트
const fs = require('fs')
const path = require('path')

// equipmentData.ts 파일 읽기
const dataPath = path.join(__dirname, '../lib/data/equipmentData.ts')
const content = fs.readFileSync(dataPath, 'utf-8')

// equipmentData 배열 추출 (정규식으로 파싱)
const match = content.match(/export const equipmentData: EquipmentItem\[\] = (\[[\s\S]*?\]);?\s*\/\/ 장비만/)
if (!match) {
  // 전체 배열 찾기
  const fullMatch = content.match(/export const equipmentData: EquipmentItem\[\] = (\[[\s\S]*\]);/)
  if (!fullMatch) {
    console.error('equipmentData를 찾을 수 없습니다')
    process.exit(1)
  }
}

// JSON 파싱을 위해 데이터 추출
const dataStartIndex = content.indexOf('export const equipmentData: EquipmentItem[] = [')
const dataStart = content.indexOf('[', dataStartIndex)

// equipmentOnly 시작점 찾기
const equipmentOnlyIndex = content.indexOf('// 장비만 (isMaterial: false)')
const dataEnd = equipmentOnlyIndex > 0
  ? content.lastIndexOf(']', equipmentOnlyIndex) + 1
  : content.indexOf('];', dataStart) + 1

let jsonStr = content.slice(dataStart, dataEnd)

// JSON으로 파싱 가능하게 정리
jsonStr = jsonStr
  .replace(/,\s*\]/g, ']')  // trailing comma 제거
  .replace(/\r\n/g, '\\n')  // 줄바꿈 이스케이프

let equipmentData
try {
  equipmentData = JSON.parse(jsonStr)
} catch (e) {
  console.error('JSON 파싱 실패:', e.message)
  // 대안: eval 사용 (신뢰할 수 있는 소스이므로)
  try {
    equipmentData = eval(jsonStr)
  } catch (e2) {
    console.error('eval도 실패:', e2.message)
    process.exit(1)
  }
}

console.log(`총 ${equipmentData.length}개 장비 데이터 로드됨`)

// SQL 문자열 이스케이프
function escapeSQL(str) {
  if (!str) return ''
  return str
    .replace(/'/g, "''")  // 작은따옴표 이스케이프
    .replace(/\r\n/g, '\n')  // CRLF -> LF
    .replace(/\r/g, '\n')    // CR -> LF
}

// SQL INSERT 문 생성
let sql = `-- 장비 데이터 INSERT (자동 생성: ${new Date().toISOString().split('T')[0]})
-- 총 ${equipmentData.length}개

INSERT INTO equipments (id, original_index, name, category, spec, location, sub_location, quantity, unit, serial_number, status, notes, is_material)
VALUES
`

const values = equipmentData.map(eq => {
  return `  ('${escapeSQL(eq.id)}', '${escapeSQL(eq.originalIndex)}', '${escapeSQL(eq.name)}', '${escapeSQL(eq.category)}', '${escapeSQL(eq.spec)}', '${escapeSQL(eq.location)}', '${escapeSQL(eq.subLocation)}', ${eq.quantity}, '${escapeSQL(eq.unit)}', '${escapeSQL(eq.serialNumber)}', '${eq.status}', '${escapeSQL(eq.notes)}', ${eq.isMaterial})`
})

sql += values.join(',\n') + ';\n'

// 파일로 저장
const outputPath = path.join(__dirname, '../supabase/seed_equipments.sql')
fs.writeFileSync(outputPath, sql, 'utf-8')

console.log(`SQL 파일 생성 완료: ${outputPath}`)
console.log(`파일 크기: ${(sql.length / 1024).toFixed(2)} KB`)
