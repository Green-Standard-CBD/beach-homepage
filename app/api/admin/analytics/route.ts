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

function fmt(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export async function GET(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const today = new Date()
  const from12m = new Date(today.getFullYear() - 1, today.getMonth(), 1)

  const [membersRes, reservationsRes] = await Promise.all([
    adminClient.from('members').select('id, member_number, name, grade, created_at, year_amount, year_visits, points, phone'),
    adminClient.from('reservations')
      .select('id, date, menu_id, menu_name, member_id, status')
      .gte('date', fmt(from12m))
      .neq('status', 'cancelled')
      .order('date'),
  ])

  const members = membersRes.data ?? []
  const reservations = reservationsRes.data ?? []

  // グレード分布
  const gradeCounts: Record<string, number> = {}
  members.forEach(m => { gradeCounts[m.grade] = (gradeCounts[m.grade] ?? 0) + 1 })
  const gradeDistribution = Object.entries(gradeCounts)
    .map(([grade, count]) => ({ grade, count }))
    .sort((a, b) => b.count - a.count)

  // メニュー別人気（上位10）
  const menuCounts: Record<string, number> = {}
  reservations.forEach(r => {
    const key = r.menu_name ?? r.menu_id ?? '不明'
    menuCounts[key] = (menuCounts[key] ?? 0) + 1
  })
  const topMenus = Object.entries(menuCounts)
    .map(([menu_name, count]) => ({ menu_name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // 月別来店数（過去12ヶ月）
  const monthly: { month: string; total: number; newCount: number; returnCount: number; returnRate: number }[] = []
  const firstVisit: Record<string, string> = {}
  members.forEach(m => {
    if (m.created_at) {
      const ym = m.created_at.slice(0, 7)
      if (!firstVisit[m.id] || ym < firstVisit[m.id]) firstVisit[m.id] = ym
    }
  })

  for (let i = 11; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const ym = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
    const monthRes = reservations.filter(r => r.date?.startsWith(ym))
    const newIds = new Set<string>()
    const returnIds = new Set<string>()
    monthRes.forEach(r => {
      if (!r.member_id) return
      const fv = firstVisit[r.member_id]
      if (fv && fv === ym) newIds.add(r.member_id)
      else returnIds.add(r.member_id)
    })
    const total = monthRes.length
    const returnCount = returnIds.size
    monthly.push({
      month: ym,
      total,
      newCount: newIds.size,
      returnCount,
      returnRate: total > 0 ? Math.round(returnCount / total * 100) : 0,
    })
  }

  // 会員登録推移（月別）
  const memberGrowth: { month: string; count: number; cumulative: number }[] = []
  let cumulative = 0
  for (let i = 11; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const ym = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
    const count = members.filter(m => m.created_at?.startsWith(ym)).length
    cumulative += count
    memberGrowth.push({ month: ym, count, cumulative })
  }

  // 優良顧客分析 — 来店回数TOP10 / 売上TOP10
  const topByVisits = [...members]
    .filter(m => (m.year_visits ?? 0) > 0)
    .sort((a, b) => (b.year_visits ?? 0) - (a.year_visits ?? 0))
    .slice(0, 10)
    .map(m => ({
      member_number: m.member_number,
      name: m.name,
      grade: m.grade,
      year_visits: m.year_visits ?? 0,
      year_amount: m.year_amount ?? 0,
      points: m.points ?? 0,
    }))

  const topByAmount = [...members]
    .filter(m => (m.year_amount ?? 0) > 0)
    .sort((a, b) => (b.year_amount ?? 0) - (a.year_amount ?? 0))
    .slice(0, 10)
    .map(m => ({
      member_number: m.member_number,
      name: m.name,
      grade: m.grade,
      year_visits: m.year_visits ?? 0,
      year_amount: m.year_amount ?? 0,
      points: m.points ?? 0,
    }))

  // グレード別平均来店回数
  const gradeStats: Record<string, { total: number; visits: number; amount: number }> = {}
  members.forEach(m => {
    if (!gradeStats[m.grade]) gradeStats[m.grade] = { total: 0, visits: 0, amount: 0 }
    gradeStats[m.grade].total += 1
    gradeStats[m.grade].visits += m.year_visits ?? 0
    gradeStats[m.grade].amount += m.year_amount ?? 0
  })
  const gradeAvgStats = Object.entries(gradeStats).map(([grade, s]) => ({
    grade,
    count: s.total,
    avgVisits: s.total > 0 ? Math.round(s.visits / s.total * 10) / 10 : 0,
    avgAmount: s.total > 0 ? Math.round(s.amount / s.total) : 0,
    totalAmount: s.amount,
  }))

  return NextResponse.json({
    gradeDistribution,
    topMenus,
    monthly,
    memberGrowth,
    totalMembers: members.length,
    totalReservations: reservations.length,
    topByVisits,
    topByAmount,
    gradeAvgStats,
  })
}
