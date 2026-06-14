import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const cookieValue = req.cookies.get('hp_member')?.value
  if (!cookieValue) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }
  try {
    const member = JSON.parse(cookieValue)
    return NextResponse.json({ ok: true, member })
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set('hp_member', '', { maxAge: 0, path: '/' })
  res.cookies.set('line_member', '', { maxAge: 0, path: '/' })
  return res
}
