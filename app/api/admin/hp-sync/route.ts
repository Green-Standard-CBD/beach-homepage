import { NextRequest, NextResponse } from 'next/server'

function isAuthed(req: NextRequest) {
  const token = req.cookies.get('admin_auth')?.value
  return token && token === process.env.ADMIN_TOKEN
}

// admin認証済みユーザーが手動でHPを同期するためのエンドポイント
export async function POST(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/cron/hotpepper-sync`, {
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
  })

  const json = await res.json()
  return NextResponse.json(json)
}
