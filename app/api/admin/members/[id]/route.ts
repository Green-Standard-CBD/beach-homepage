import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

function isAuthed(req: NextRequest) {
  const token = req.cookies.get('admin_auth')?.value
  return token && token === process.env.ADMIN_TOKEN
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const [memberRes, reservationsRes, cartesRes, pointsRes] = await Promise.all([
    adminClient.from('members').select('*').eq('id', id).single(),
    adminClient.from('reservations')
      .select('id, date, time, menu_name, status, stylist_id, created_at')
      .eq('member_id', id)
      .order('date', { ascending: false })
      .limit(50),
    adminClient.from('cartes')
      .select('id, date, menu, memo, drink, created_at')
      .eq('member_id', id)
      .order('date', { ascending: false })
      .limit(30),
    adminClient.from('point_history')
      .select('id, label, points, created_at')
      .eq('member_id', id)
      .order('created_at', { ascending: false })
      .limit(30),
  ])

  if (memberRes.error) return NextResponse.json({ error: memberRes.error.message }, { status: 500 })

  return NextResponse.json({
    member: memberRes.data,
    reservations: reservationsRes.data ?? [],
    cartes: cartesRes.data ?? [],
    pointHistory: pointsRes.data ?? [],
  })
}
