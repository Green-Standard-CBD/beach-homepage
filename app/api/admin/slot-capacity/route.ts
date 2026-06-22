import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function isAuthed(req: NextRequest) {
  const token = req.cookies.get('admin_auth')?.value
  return token && token === process.env.ADMIN_TOKEN
}

// GET /api/admin/slot-capacity?date=2026-06-16
export async function GET(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const date = req.nextUrl.searchParams.get('date')
  if (!date) return NextResponse.json({ error: 'date required' }, { status: 400 })

  const { data, error } = await supabase
    .from('slot_capacity')
    .select('time, capacity')
    .eq('date', date)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const result: Record<string, number> = {}
  for (const row of data ?? []) result[row.time] = row.capacity
  return NextResponse.json(result)
}

// POST /api/admin/slot-capacity
// body: { date: string, capacities: Record<string, number> }  // capacities key = "HH:MM"（30分刻み）
export async function POST(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { date, capacities } = await req.json()
  if (!date || !capacities) return NextResponse.json({ error: 'invalid body' }, { status: 400 })

  const rows = Object.entries(capacities).map(([time, capacity]) => ({
    date,
    time,
    capacity: Number(capacity),
  }))

  const { error } = await supabase
    .from('slot_capacity')
    .upsert(rows, { onConflict: 'date,time' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
