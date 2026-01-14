// 장비 데이터를 SQL INSERT 문으로 변환하는 스크립트 (ESM)
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// equipmentData.ts 파일 읽기
const dataPath = path.join(__dirname, '../lib/data/equipmentData.ts')
const content = fs.readFileSync(dataPath, 'utf-8')

// 배열 데이터 추출 - 첫 번째 배열만
const arrayStart = content.indexOf('export const equipmentData: EquipmentItem[] = [')
const bracketStart = content.indexOf('[', arrayStart)

// 배열 끝 찾기 (중첩 대괄호 고려)
let depth = 0
let arrayEnd = bracketStart
for (let i = bracketStart; i < content.length; i++) {
  if (content[i] === '[') depth++
  if (content[i] === ']') depth--
  if (depth === 0) {
    arrayEnd = i + 1
    break
  }
}

let jsonStr = content.slice(bracketStart, arrayEnd)

// JSON으로 변환 가능하게 정리
jsonStr = jsonStr
  .replace(/,(\s*[}\]])/g, '$1')  // trailing comma 제거

// Function으로 파싱 (eval 대신)
let equipmentData
try {
  const fn = new Function(`return ${jsonStr}`)
  equipmentData = fn()
} catch (e) {
  console.error('파싱 실패:', e.message)
  process.exit(1)
}

console.log(`총 ${equipmentData.length}개 장비 데이터 로드됨`)

// SQL 문자열 이스케이프
function escapeSQL(str) {
  if (!str) return ''
  return String(str)
    .replace(/'/g, "''")
    .replace(/\r\n/g, '\\n')
    .replace(/\r/g, '\\n')
    .replace(/\n/g, '\\n')
}

// SQL INSERT 문 생성 - 배치로 나누기 (100개씩)
const BATCH_SIZE = 100
let sql = `-- 장비 데이터 INSERT (자동 생성: ${new Date().toISOString().split('T')[0]})
-- 총 ${equipmentData.length}개

`

for (let i = 0; i < equipmentData.length; i += BATCH_SIZE) {
  const batch = equipmentData.slice(i, i + BATCH_SIZE)

  sql += `-- Batch ${Math.floor(i / BATCH_SIZE) + 1}\n`
  sql += `INSERT INTO equipments (id, original_index, name, category, spec, location, sub_location, quantity, unit, serial_number, status, notes, is_material)\nVALUES\n`

  const values = batch.map(eq => {
    return `  ('${escapeSQL(eq.id)}', '${escapeSQL(eq.originalIndex)}', '${escapeSQL(eq.name)}', '${escapeSQL(eq.category)}', '${escapeSQL(eq.spec)}', '${escapeSQL(eq.location)}', '${escapeSQL(eq.subLocation)}', ${eq.quantity}, '${escapeSQL(eq.unit)}', '${escapeSQL(eq.serialNumber)}', '${eq.status}', '${escapeSQL(eq.notes)}', ${eq.isMaterial})`
  })

  sql += values.join(',\n') + ';\n\n'
}

// 파일로 저장
const outputPath = path.join(__dirname, '../supabase/seed_equipments.sql')
fs.writeFileSync(outputPath, sql, 'utf-8')

console.log(`SQL 파일 생성 완료: ${outputPath}`)
console.log(`파일 크기: ${(sql.length / 1024).toFixed(2)} KB`)
