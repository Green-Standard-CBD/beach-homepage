import { NextRequest, NextResponse } from 'next/server'
import { verifyMemberCookie } from '@/lib/memberCookie'

export async function GET(req: NextRequest) {
  const raw = req.cookies.get('line_member')?.value
  if (!raw) {
    return NextResponse.json({ error: 'no_session' }, { status: 404 })
  }

  const data = verifyMemberCookie(raw)
  if (!data) {
    return NextResponse.json({ error: 'invalid_session' }, { status: 400 })
  }
  const res = NextResponse.json({ ok: true, member: data })
  res.cookies.delete('line_member')
  return res
}
