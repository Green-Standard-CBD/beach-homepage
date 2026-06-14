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

function addMonths(ym: string, n: number): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthDiff(from: string, to: string): number {
  const [fy, fm] = from.split('-').map(Number)
  const [ty, tm] = to.split('-').map(Number)
  return (ty - fy) * 12 + (tm - fm)
}

type Category = 'new' | 'returning' | 'regular' | 'returner'

const CATEGORY_LABELS: Record<Category, string> = {
  new: '新規',
  returning: '再来',
  regular: '固定',
  returner: 'リターン',
}

export async function GET(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const now = new Date()
  // default: 2 months ago (to have at least 2 months of follow-up)
  const defaultMonth = addMonths(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
    -2
  )
  const baseMonth = url.searchParams.get('month') ?? defaultMonth

  // Fetch ALL non-cancelled reservations (no date limit)
  const { data: allRes } = await adminClient
    .from('reservations')
    .select('id, date, member_id, status')
    .neq('status', 'cancelled')
    .order('date')

  const reservations = (allRes ?? []).filter(r => r.member_id && r.date)

  // Members who visited in baseMonth
  const baseVisitorIds = new Set(
    reservations
      .filter(r => r.date.startsWith(baseMonth))
      .map(r => r.member_id as string)
  )

  if (baseVisitorIds.size === 0) {
    // Return empty structure
    const emptyLags = Array.from({ length: 6 }, (_, i) => ({
      lag: i + 1,
      month: addMonths(baseMonth, i + 1),
      count: 0,
      rate: 0,
    }))
    const emptyCategory = (key: Category) => ({
      key,
      label: CATEGORY_LABELS[key],
      count: 0,
      pct: 0,
      lags: emptyLags,
      lost: { count: 0, rate: 0 },
    })
    return NextResponse.json({
      baseMonth,
      totalVisitors: 0,
      categories: (['new', 'returning', 'regular', 'returner'] as Category[]).map(emptyCategory),
      chartRates: [],
      chartCounts: [],
    })
  }

  // Classify each base-month visitor
  const classified: Record<Category, string[]> = { new: [], returning: [], regular: [], returner: [] }

  for (const memberId of baseVisitorIds) {
    // All previous visits (strictly before baseMonth)
    const prevVisits = reservations
      .filter(r => r.member_id === memberId && r.date < baseMonth + '-01')
      .sort((a, b) => a.date.localeCompare(b.date))

    if (prevVisits.length === 0) {
      classified.new.push(memberId)
      continue
    }

    // Check gap: last visit before this month
    const lastVisitMonth = prevVisits[prevVisits.length - 1].date.slice(0, 7)
    const gap = monthDiff(lastVisitMonth, baseMonth)

    if (gap >= 6) {
      classified.returner.push(memberId)
    } else if (prevVisits.length === 1) {
      classified.returning.push(memberId)
    } else {
      classified.regular.push(memberId)
    }
  }

  const totalVisitors = baseVisitorIds.size

  // Build category data with lag cohorts
  const categories = (['new', 'returning', 'regular', 'returner'] as Category[]).map(key => {
    const members = classified[key]
    const count = members.length
    const pct = totalVisitors > 0 ? Math.round(count / totalVisitors * 100) : 0

    const lags = Array.from({ length: 6 }, (_, i) => {
      const lag = i + 1
      const targetMonth = addMonths(baseMonth, lag)
      const cameBack = members.filter(id =>
        reservations.some(r => r.member_id === id && r.date.startsWith(targetMonth))
      ).length
      return {
        lag,
        month: targetMonth,
        count: cameBack,
        rate: count > 0 ? Math.round(cameBack / count * 100) : 0,
      }
    })

    // 失客 = 6ヶ月以内に一度も戻らなかった数
    const returnedAny = new Set(
      lags.flatMap(() => members.filter(id =>
        lags.some(l => reservations.some(r => r.member_id === id && r.date.startsWith(l.month)))
      ))
    ).size
    const lostCount = count - returnedAny
    return {
      key,
      label: CATEGORY_LABELS[key],
      count,
      pct,
      lags,
      lost: {
        count: lostCount,
        rate: count > 0 ? Math.round(lostCount / count * 100) : 0,
      },
    }
  })

  // Build chart data (1〜6ヶ月後 × rate/count per category)
  const chartRates = Array.from({ length: 6 }, (_, i) => {
    const lag = i + 1
    const entry: Record<string, number | string> = { lag: `${lag}ヶ月後` }
    for (const cat of categories) {
      entry[cat.key] = cat.lags[i]?.rate ?? 0
    }
    return entry
  })

  const chartCounts = Array.from({ length: 6 }, (_, i) => {
    const lag = i + 1
    const entry: Record<string, number | string> = { lag: `${lag}ヶ月後` }
    for (const cat of categories) {
      entry[cat.key] = cat.lags[i]?.count ?? 0
    }
    return entry
  })

  return NextResponse.json({
    baseMonth,
    totalVisitors,
    categories,
    chartRates,
    chartCounts,
  })
}
