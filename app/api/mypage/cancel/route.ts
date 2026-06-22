import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyMemberCookie } from '@/lib/memberCookie'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function getMember(req: NextRequest): { id: string; name: string } | null {
  const raw = req.cookies.get('hp_member')?.value
  const data = verifyMemberCookie(raw)
  return typeof data?.id === 'string' ? { id: data.id, name: typeof data.name === 'string' ? data.name : '' } : null
}

async function notifySho(text: string) {
  const token = process.env.LINE_MESSAGING_TOKEN
  const shoId = process.env.SHO_LINE_USER_ID
  if (!token || !shoId) return
  await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ to: shoId, messages: [{ type: 'text', text }] }),
  }).catch(() => {})
}

export async function POST(req: NextRequest) {
  const member = getMember(req)
  if (!member) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let reservation_id: string | undefined
  try {
    const body = await req.json()
    reservation_id = body.reservation_id
  } catch {
    return NextResponse.json({ error: 'invalid request body' }, { status: 400 })
  }
  if (!reservation_id) return NextResponse.json({ error: 'reservation_id required' }, { status: 400 })

  // 予約が本人のものか確認してからキャンセル
  const { data: reservation, error: fetchError } = await admin
    .from('reservations')
    .select('id, date, time, menu_name, status, member_id, source')
    .eq('id', reservation_id)
    .eq('member_id', member.id)
    .single()

  if (fetchError || !reservation) {
    return NextResponse.json({ error: '予約が見つかりません' }, { status: 404 })
  }
  if (reservation.status === 'cancelled') {
    return NextResponse.json({ error: 'すでにキャンセル済みです' }, { status: 400 })
  }
  if (reservation.source === 'hotpepper') {
    return NextResponse.json(
      { error: 'この予約はホットペッパー経由のため、お手数ですがホットペッパー、またはサロンへ直接ご連絡ください' },
      { status: 403 }
    )
  }

  const { error } = await admin
    .from('reservations')
    .update({ status: 'cancelled' })
    .eq('id', reservation_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await notifySho(
    `❌ マイページよりキャンセルがありました\n\nお名前：${member.name} 様\n日時：${reservation.date.replace(/-/g, '/')} ${reservation.time}〜\nメニュー：${reservation.menu_name ?? '不明'}`
  )

  return NextResponse.json({ ok: true })
}
