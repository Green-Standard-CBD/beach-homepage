import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getMemberIdFromRequest } from '@/lib/memberCookie'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const memberId = getMemberIdFromRequest(req)
  if (!memberId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const today = new Date().toISOString().slice(0, 10)

  const { data, error } = await admin
    .from('reservations')
    .select('id, date, time, block_minutes, menu_name, status, source, hp_reservation_id')
    .eq('member_id', memberId)
    .gte('date', today)
    .neq('status', 'cancelled')
    .order('date')
    .order('time')

  if (error) return NextResponse.json({ reservations: [] })
  return NextResponse.json({ reservations: data ?? [] })
}
