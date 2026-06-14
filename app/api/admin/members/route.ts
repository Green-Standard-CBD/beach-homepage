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

export async function GET(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)

  // 管理画面 顧客一覧 – all=true で全件返す
  if (searchParams.get('all') === 'true') {
    const { data, error } = await adminClient
      .from('members')
      .select('id, member_number, name, phone, birthday, grade, points, year_amount, year_visits, created_at, prefecture, city')
      .order('member_number', { ascending: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ members: data })
  }

  const phone = searchParams.get('phone')?.trim()
  const name  = searchParams.get('name')?.trim()

  if (!phone && !name) return NextResponse.json({ members: [] })

  if (phone) {
    const { data } = await adminClient
      .from('members').select('id, name, phone').eq('phone', phone).limit(1)
    return NextResponse.json({ members: data ?? [] })
  }

  const { data } = await adminClient
    .from('members').select('id, name, phone').ilike('name', `%${name}%`).limit(8)
  return NextResponse.json({ members: data ?? [] })
}
