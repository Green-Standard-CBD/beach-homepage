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
    .from('members')
    .select('member_number, grade, points, year_amount, year_visits')
    .eq('id', memberId)
    .single()

  if (error || !data) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json({ member: data })
}
