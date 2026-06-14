import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const raw = req.cookies.get('line_member')?.value
  if (!raw) {
    return NextResponse.json({ error: 'no_session' }, { status: 404 })
  }

  try {
    const data = JSON.parse(raw)
    const res = NextResponse.json({ ok: true, member: data })
    res.cookies.delete('line_member')
    return res
  } catch {
    return NextResponse.json({ error: 'invalid_session' }, { status: 400 })
  }
}
