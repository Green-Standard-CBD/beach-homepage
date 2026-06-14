import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const ALL_TIMES = [
  '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00',
]

const MAX_END_MIN = 22 * 60

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')
  const block = parseInt(searchParams.get('block') ?? '60', 10)

  if (!date) return NextResponse.json({ error: 'date required' }, { status: 400 })

  const available: string[] = []

  for (const time of ALL_TIMES) {
    const [h, m] = time.split(':').map(Number)
    if (h * 60 + m + block > MAX_END_MIN) continue

    const { data } = await adminClient.rpc('is_slot_available', {
      p_date: date,
      p_time: time,
      p_block_minutes: block,
    })
    if (data === true) available.push(time)
  }

  return NextResponse.json({ slots: available })
}
