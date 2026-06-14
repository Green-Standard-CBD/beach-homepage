import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

function isAuthed(req: NextRequest) {
  const token = req.cookies.get('admin_auth')?.value
  return token && token === process.env.ADMIN_TOKEN
}

// メニュー単価
const MENU_PRICES: Record<string, number> = {
  cut: 4500, bang_cut: 700, color: 6300, highlight: 5300,
  perm: 7300, straight: 13800, treatment_s: 4500,
  treatment_premium_s: 7000, head_spa_s: 5000,
  head_spa_30_s: 6000, head_spa_60_s: 9000,
  cut_tr: 5500, cut_color_tr: 11500, cut_str_tr: 17800, cut_spa: 8500,
}

function fmt(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export async function GET(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const today = new Date()
  const todayStr = fmt(today)

  // 過去90日〜今日
  const from90 = new Date(today); from90.setDate(today.getDate() - 90)
  // 過去14日（週間グリッド用）
  const from14 = new Date(today); from14.setDate(today.getDate() - 13)

  const [resAll, ordersAll] = await Promise.all([
    adminClient.from('reservations')
      .select('id, date, time, menu_id, menu_name, status, member_id')
      .gte('date', fmt(from90))
      .lte('date', todayStr)
      .neq('status', 'cancelled')
      .order('date'),
    adminClient.from('orders')
      .select('id, total, subtotal, status, created_at, member_id')
      .gte('created_at', from90.toISOString())
      .order('created_at'),
  ])

  const reservations = resAll.data ?? []
  const orders = ordersAll.data ?? []

  // 本日
  const todayRes = reservations.filter(r => r.date === todayStr)
  const todayOrders = orders.filter(o => o.created_at?.startsWith(todayStr))
  const todayEstRev = todayRes.reduce((s, r) => s + (MENU_PRICES[r.menu_id] ?? 0), 0)
  const todayOrderRev = todayOrders.reduce((s, o) => s + (o.total ?? 0), 0)

  // 14日間グリッド
  const weekly: { date: string; dow: string; resCount: number; estRevenue: number; orderRevenue: number }[] = []
  const DOW = ['日','月','火','水','木','金','土']
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today); d.setDate(today.getDate() - i)
    const ds = fmt(d)
    const dayRes = reservations.filter(r => r.date === ds)
    const dayOrders = orders.filter(o => o.created_at?.startsWith(ds))
    weekly.push({
      date: ds,
      dow: DOW[d.getDay()],
      resCount: dayRes.length,
      estRevenue: dayRes.reduce((s, r) => s + (MENU_PRICES[r.menu_id] ?? 0), 0),
      orderRevenue: dayOrders.reduce((s, o) => s + (o.total ?? 0), 0),
    })
  }

  // 月別（過去6ヶ月）
  const monthly: { month: string; resCount: number; estRevenue: number; orderRevenue: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const ym = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
    const monthRes = reservations.filter(r => r.date?.startsWith(ym))
    const monthOrders = orders.filter(o => o.created_at?.startsWith(ym))
    monthly.push({
      month: ym,
      resCount: monthRes.length,
      estRevenue: monthRes.reduce((s, r) => s + (MENU_PRICES[r.menu_id] ?? 0), 0),
      orderRevenue: monthOrders.reduce((s, o) => s + (o.total ?? 0), 0),
    })
  }

  return NextResponse.json({
    today: {
      date: todayStr,
      resCount: todayRes.length,
      completedCount: todayRes.filter(r => r.status === 'completed').length,
      confirmedCount: todayRes.filter(r => r.status === 'confirmed').length,
      estRevenue: todayEstRev,
      orderRevenue: todayOrderRev,
    },
    weekly,
    monthly,
  })
}
