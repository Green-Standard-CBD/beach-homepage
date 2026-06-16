import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const ALL_TIMES = [
  '10:00','10:30','11:00','11:30',
  '12:00','12:30','13:00','13:30',
  '14:00','14:30','15:00','15:30',
  '16:00','16:30','17:00','17:30','18:00',
]
const MAX_END_MIN = 22 * 60

function timeToMin(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function overlaps(aStart: number, aBlock: number, bStart: number, bBlock: number) {
  return aStart < bStart + bBlock && bStart < aStart + aBlock
}

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const start = searchParams.get('start')
  const block = parseInt(searchParams.get('block') ?? '60', 10)
  if (!start) return NextResponse.json({ error: 'start required' }, { status: 400 })

  const startDate = new Date(start + 'T00:00:00')
  const dates: string[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startDate)
    d.setDate(d.getDate() + i)
    return toDateStr(d)
  })

  const [{ data: reservations }, { data: blocked }, { data: capacityRows }] = await Promise.all([
    admin.from('reservations')
      .select('date, time, block_minutes')
      .gte('date', dates[0])
      .lte('date', dates[6])
      .neq('status', 'cancelled'),
    admin.from('blocked_slots')
      .select('date, time, block_minutes')
      .gte('date', dates[0])
      .lte('date', dates[6]),
    admin.from('slot_capacity')
      .select('date, hour, capacity')
      .gte('date', dates[0])
      .lte('date', dates[6]),
  ])

  // 予約・ブロック済み時間のマップを構築
  const occupied: Record<string, { start: number; block: number }[]> = {}
  for (const date of dates) occupied[date] = []
  for (const r of reservations ?? []) {
    occupied[r.date]?.push({ start: timeToMin(r.time), block: r.block_minutes })
  }
  for (const b of blocked ?? []) {
    occupied[b.date]?.push({ start: timeToMin(b.time), block: b.block_minutes })
  }

  // 残り受付可能数（管理者設定） date → hour → capacity
  const slotCap: Record<string, Record<number, number>> = {}
  for (const row of capacityRows ?? []) {
    if (!slotCap[row.date]) slotCap[row.date] = {}
    slotCap[row.date][row.hour] = row.capacity
  }

  const now = new Date()
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const todayStr = toDateStr(now)

  const availability: Record<string, Record<string, boolean>> = {}
  for (const date of dates) {
    availability[date] = {}
    const isThu = new Date(date + 'T00:00:00').getDay() === 4
    for (const time of ALL_TIMES) {
      const startMin = timeToMin(time)
      if (isThu)                                    { availability[date][time] = false; continue }
      if (date < todayStr)                          { availability[date][time] = false; continue }
      if (date === todayStr && startMin <= nowMin)  { availability[date][time] = false; continue }
      if (startMin + block > MAX_END_MIN)           { availability[date][time] = false; continue }
      // 残り受付可能数が設定されている時間帯はその値を優先
      const hour = Math.floor(startMin / 60)
      if (slotCap[date]?.[hour] !== undefined) {
        availability[date][time] = slotCap[date][hour] > 0
        continue
      }
      const conflict = (occupied[date] ?? []).some(o => overlaps(startMin, block, o.start, o.block))
      availability[date][time] = !conflict
    }
  }

  return NextResponse.json({ availability })
}
