import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const raw = req.cookies.get('hp_member')?.value
  if (!raw) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  try {
    const data = JSON.parse(raw)
    if (!data.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    return NextResponse.json({ member: { id: data.id, name: data.name ?? '', phone: data.phone ?? '', email: data.email ?? '' } })
  } catch {
    return NextResponse.json({ error: 'invalid_session' }, { status: 400 })
  }
}
