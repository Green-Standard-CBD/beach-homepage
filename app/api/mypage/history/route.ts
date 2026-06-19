import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function getMemberId(req: NextRequest): string | null {
  const raw = req.cookies.get('hp_member')?.value
  if (!raw) return null
  try { return JSON.parse(raw).id ?? null } catch { return null }
}

export async function GET(req: NextRequest) {
  const memberId = getMemberId(req)
  if (!memberId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const today = new Date().toISOString().slice(0, 10)

  const { data, error } = await admin
    .from('reservations')
    .select('id, date, time, block_minutes, menu_name, status, source')
    .eq('member_id', memberId)
    .lt('date', today)
    .in('status', ['completed', 'cancelled'])
    .order('date', { ascending: false })
    .limit(30)

  if (error) return NextResponse.json({ history: [] })
  return NextResponse.json({ history: data ?? [] })
}
