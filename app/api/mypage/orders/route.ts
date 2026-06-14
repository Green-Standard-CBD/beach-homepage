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

  const { data, error } = await admin
    .from('orders')
    .select('id, created_at, status, items, subtotal, shipping, total')
    .eq('member_id', memberId)
    .order('created_at', { ascending: false })
    .limit(30)

  if (error) return NextResponse.json({ orders: [] })
  return NextResponse.json({ orders: data ?? [] })
}
