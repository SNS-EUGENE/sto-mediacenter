// Supabase 연동 테스트 스크립트
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://chckrcfxspglgakntedr.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoY2tyY2Z4c3BnbGdha250ZWRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NTc1OTgsImV4cCI6MjA4MzMzMzU5OH0.1jPjnNOrJUuV70uCrd2XW_0qhwHUgRrfymkRroQqNG8'

const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  console.log('=== Supabase 연동 테스트 ===\n')

  // 1. 스튜디오 조회
  console.log('1. 스튜디오 조회...')
  const { data: studios, error: studioError } = await supabase
    .from('studios')
    .select('*')
    .order('id')

  if (studioError) {
    console.error('  오류:', studioError.message)
  } else {
    console.log(`  성공! ${studios.length}개 스튜디오`)
    studios.forEach(s => console.log(`    - ${s.id}: ${s.name}`))
  }

  // 2. 장비 조회
  console.log('\n2. 장비 조회...')
  const { data: equipments, error: eqError, count: eqCount } = await supabase
    .from('equipments')
    .select('*', { count: 'exact', head: true })

  if (eqError) {
    console.error('  오류:', eqError.message)
  } else {
    // count만 가져오기
    const { count } = await supabase
      .from('equipments')
      .select('*', { count: 'exact', head: true })
    console.log(`  성공! 총 ${count}개 장비/자재`)
  }

  // 3. 예약 조회
  console.log('\n3. 예약 조회...')
  const { count: bookingCount, error: bookingError } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })

  if (bookingError) {
    console.error('  오류:', bookingError.message)
  } else {
    console.log(`  성공! 총 ${bookingCount}개 예약`)
  }

  // 4. 최근 예약 5개 조회
  console.log('\n4. 최근 예약 5개...')
  const { data: recentBookings, error: recentError } = await supabase
    .from('bookings')
    .select('rental_date, applicant_name, event_name, status')
    .order('rental_date', { ascending: false })
    .limit(5)

  if (recentError) {
    console.error('  오류:', recentError.message)
  } else {
    recentBookings.forEach(b => {
      console.log(`    - ${b.rental_date} | ${b.applicant_name} | ${b.event_name}`)
    })
  }

  console.log('\n=== 테스트 완료 ===')
}

test().catch(console.error)
