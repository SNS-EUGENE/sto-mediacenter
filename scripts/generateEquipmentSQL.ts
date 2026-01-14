// 장비 데이터를 SQL INSERT 문으로 변환하는 스크립트
import * as fs from 'fs'
import * as path from 'path'
import { equipmentData } from '../lib/data/equipmentData'

console.log(`총 ${equipmentData.length}개 장비 데이터 로드됨`)

// SQL 문자열 이스케이프
function escapeSQL(str: string | undefined): string {
  if (!str) return ''
  return String(str)
    .replace(/'/g, "''")
    .replace(/\r\n/g, '\\n')
    .replace(/\r/g, '\\n')
    .replace(/\n/g, '\\n')
}

// 위치 변환 (새 구조에 맞게)
function convertLocation(location: string): string {
  if (location === '1인 스튜디오 A') return '스튜디오 A'
  if (location === '1인 스튜디오 B') return '스튜디오 B'
  return location
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
    const location = convertLocation(eq.location)
    return `  ('${escapeSQL(eq.id)}', '${escapeSQL(eq.originalIndex)}', '${escapeSQL(eq.name)}', '${escapeSQL(eq.category)}', '${escapeSQL(eq.spec)}', '${escapeSQL(location)}', '${escapeSQL(eq.subLocation)}', ${eq.quantity}, '${escapeSQL(eq.unit)}', '${escapeSQL(eq.serialNumber)}', '${eq.status}', '${escapeSQL(eq.notes)}', ${eq.isMaterial})`
  })

  sql += values.join(',\n') + ';\n\n'
}

// 파일로 저장
const outputPath = path.join(__dirname, '../supabase/seed_equipments.sql')
fs.writeFileSync(outputPath, sql, 'utf-8')

console.log(`SQL 파일 생성 완료: ${outputPath}`)
console.log(`파일 크기: ${(sql.length / 1024).toFixed(2)} KB`)
