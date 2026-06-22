import { NextRequest, NextResponse } from 'next/server'
import { verifyMemberCookie } from '@/lib/memberCookie'

export async function GET(req: NextRequest) {
  const raw = req.cookies.get('hp_member')?.value
  if (!raw) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const data = verifyMemberCookie(raw)
  if (!data?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  return NextResponse.json({ member: { id: data.id, name: data.name ?? '', phone: data.phone ?? '', email: data.email ?? '' } })
}
