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

  const { data, error } = await admin
    .from('members')
    .select('member_number, grade, points, year_amount, year_visits')
    .eq('id', memberId)
    .single()

  if (error || !data) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json({ member: data })
}
