import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

function isAuthed(req: NextRequest) {
  const token = req.cookies.get('admin_auth')?.value
  return token && token === process.env.ADMIN_TOKEN
}

export async function GET(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')

  if (date) {
    // 特定日の予約 + ブロック
    const [resResult, blockResult] = await Promise.all([
      adminClient.from('reservations').select('*, members(name, phone)').eq('date', date).order('time'),
      adminClient.from('blocked_slots').select('*').eq('date', date).order('time'),
    ])
    if (resResult.error) return NextResponse.json({ error: resResult.error.message }, { status: 500 })
    return NextResponse.json({ reservations: resResult.data, blockedSlots: blockResult.data ?? [] })
  } else {
    // 全件（過去30日〜90日先）
    const today = new Date()
    const from = new Date(today); from.setDate(today.getDate() - 30)
    const to   = new Date(today); to.setDate(today.getDate() + 90)
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    const includeAll = searchParams.get('includeAll') === 'true'
    let query = adminClient
      .from('reservations')
      .select('*, members(name, phone)')
      .gte('date', fmt(from))
      .lte('date', fmt(to))
      .order('date')
      .order('time')
    if (!includeAll) query = query.neq('status', 'cancelled')
    const [resResult, blockResult] = await Promise.all([
      query,
      adminClient.from('blocked_slots').select('*').gte('date', fmt(from)).lte('date', fmt(to)).order('date').order('time'),
    ])
    if (resResult.error) return NextResponse.json({ error: resResult.error.message }, { status: 500 })
    return NextResponse.json({ reservations: resResult.data, blockedSlots: blockResult.data ?? [] })
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { type, name, phone, menu_id, menu_name, memo, date, time, block_minutes, stylist_id } = await req.json()
  if (!date || !time || !block_minutes) {
    return NextResponse.json({ error: '必須項目不足' }, { status: 400 })
  }

  // 予定（管理者メモ）
  if (type === 'memo') {
    const memoText = (memo ?? '').trim() || '（予定）'
    const { error } = await adminClient.from('reservations').insert({
      menu_id: '__memo__',
      menu_name: memoText,
      date, time,
      block_minutes: block_minutes ?? 30,
      status: 'confirmed',
      stylist_id: stylist_id || null,
    })
    if (error) return NextResponse.json({ error: '予定登録に失敗しました: ' + error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // 予約（管理者は空き確認スキップ・重複OK）
  if (!name) return NextResponse.json({ error: '氏名は必須です' }, { status: 400 })

  let member_id: string
  if (phone) {
    const { data: existing } = await adminClient.from('members').select('id').eq('phone', phone).single()
    if (existing) {
      member_id = existing.id
    } else {
      const { data: newMember, error: memberErr } = await adminClient
        .from('members').insert({ name, phone, grade: 'BRONZE' }).select('id').single()
      if (memberErr || !newMember) return NextResponse.json({ error: '会員登録に失敗しました' }, { status: 500 })
      member_id = newMember.id
    }
  } else {
    const { data: newMember, error: memberErr } = await adminClient
      .from('members').insert({ name, grade: 'BRONZE' }).select('id').single()
    if (memberErr || !newMember) return NextResponse.json({ error: '会員登録に失敗しました' }, { status: 500 })
    member_id = newMember.id
  }

  const { error } = await adminClient.from('reservations').insert({
    member_id, menu_id, menu_name, date, time, block_minutes,
    status: 'confirmed',
    stylist_id: stylist_id || null,
  })
  if (error) {
    console.error('[admin/reservations POST] insert error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, status, block_minutes, time } = body
  if (!id) return NextResponse.json({ error: '必須項目不足' }, { status: 400 })

  const updates: Record<string, unknown> = {}
  if (status !== undefined) updates.status = status
  if (block_minutes !== undefined) updates.block_minutes = block_minutes
  if (time !== undefined) updates.time = time
  if ('stylist_id' in body) updates.stylist_id = body.stylist_id

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: '更新項目なし' }, { status: 400 })
  }

  const { error } = await adminClient
    .from('reservations')
    .update(updates)
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
