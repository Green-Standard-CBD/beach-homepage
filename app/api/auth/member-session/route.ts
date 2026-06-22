import { NextRequest, NextResponse } from 'next/server'
import { verifyMemberCookie } from '@/lib/memberCookie'

export async function GET(req: NextRequest) {
  const cookieValue = req.cookies.get('hp_member')?.value
  const member = verifyMemberCookie(cookieValue)
  if (!member) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }
  return NextResponse.json({ ok: true, member })
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set('hp_member', '', { maxAge: 0, path: '/' })
  res.cookies.set('line_member', '', { maxAge: 0, path: '/' })
  return res
}
