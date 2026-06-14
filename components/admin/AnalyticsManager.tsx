'use client'

import { useState, useEffect, useCallback } from 'react'
import AdminTopNav from './AdminTopNav'
import {
  LineChart, Line, BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ComposedChart,
} from 'recharts'

type TopMember = {
  member_number: number
  name: string
  grade: string
  year_visits: number
  year_amount: number
  points: number
}

type GradeAvgStat = {
  grade: string
  count: number
  avgVisits: number
  avgAmount: number
  totalAmount: number
}

type AnalyticsData = {
  gradeDistribution: { grade: string; count: number }[]
  topMenus: { menu_name: string; count: number }[]
  monthly: { month: string; total: number; newCount: number; returnCount: number; returnRate: number }[]
  memberGrowth: { month: string; count: number; cumulative: number }[]
  totalMembers: number
  totalReservations: number
  topByVisits: TopMember[]
  topByAmount: TopMember[]
  gradeAvgStats: GradeAvgStat[]
}

type View = 'monthly' | 'menus' | 'grades' | 'members' | 'repeat' | 'vip'

type CohortLag = { lag: number; month: string; count: number; rate: number }
type CohortCategory = {
  key: 'new' | 'returning' | 'regular' | 'returner'
  label: string
  count: number
  pct: number
  lags: CohortLag[]
  lost: { count: number; rate: number }
}
type CohortData = {
  baseMonth: string
  totalVisitors: number
  categories: CohortCategory[]
  chartRates: Record<string, number | string>[]
  chartCounts: Record<string, number | string>[]
}

const GRADE_COLORS: Record<string, string> = {
  BRONZE: '#D97706',
  SILVER: '#9CA3AF',
  GOLD: '#CA8A04',
  PLATINUM: '#7C3AED',
}

const BEACH_COLORS = ['#8B7355', '#A89070', '#C4AB8B', '#D4BFAC', '#E2D5C8', '#F0EAE0']

const GRADE_ORDER = ['PLATINUM', 'GOLD', 'SILVER', 'BRONZE']

const CAT_COLORS: Record<string, string> = {
  new: '#C4AB8B',
  returning: '#8B7355',
  regular: '#5C4A35',
  returner: '#D97706',
}

const CAT_LABELS: Record<string, string> = {
  new: '新規',
  returning: '再来',
  regular: '固定',
  returner: 'リターン',
}

function addMonths(ym: string, n: number): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function fmtMonth(ym: string) {
  return ym.replace('-', '年') + '月'
}

function fmtYen(n: number) {
  return n.toLocaleString() + '円'
}

const SECTIONS: { label: string; items: { key: View; label: string }[] }[] = [
  {
    label: '集計',
    items: [
      { key: 'monthly', label: '月別来店数' },
      { key: 'menus',   label: 'メニュー別' },
      { key: 'grades',  label: 'グレード分布' },
      { key: 'members', label: '会員登録推移' },
    ],
  },
  {
    label: '分析',
    items: [
      { key: 'repeat', label: 'リピート分析' },
      { key: 'vip',    label: '優良顧客分析' },
    ],
  },
]

export default function AnalyticsManager() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>('monthly')
  const [vipTab, setVipTab] = useState<'visits' | 'amount'>('visits')

  // リピート分析
  const now = new Date()
  const defaultCohortMonth = addMonths(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
    -2
  )
  const [cohortMonth, setCohortMonth] = useState(defaultCohortMonth)
  const [cohortData, setCohortData] = useState<CohortData | null>(null)
  const [cohortLoading, setCohortLoading] = useState(false)
  const [repeatTab, setRepeatTab] = useState<string>('all')

  const fetchCohort = useCallback((month: string) => {
    setCohortLoading(true)
    fetch(`/api/admin/analytics/cohort?month=${month}`)
      .then(r => r.json())
      .then(d => setCohortData(d))
      .catch(() => {})
      .finally(() => setCohortLoading(false))
  }, [])

  useEffect(() => {
    fetch('/api/admin/analytics')
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (view === 'repeat') fetchCohort(cohortMonth)
  }, [view, cohortMonth, fetchCohort])

  return (
    <div className="min-h-screen flex flex-col bg-sand-100">
      <AdminTopNav />

      <div className="flex-1 flex">
        {/* 左サイドバー */}
        <div className="w-44 bg-white border-r border-sand-200 flex-shrink-0 pt-4">
          {SECTIONS.map(sec => (
            <div key={sec.label} className="mb-3">
              <div className="text-[9px] text-sand-400 tracking-widest px-4 py-1.5 bg-sand-50 border-y border-sand-100">
                ■ {sec.label}
              </div>
              {sec.items.map(v => (
                <button
                  key={v.key}
                  onClick={() => setView(v.key)}
                  className={`w-full text-left px-4 py-2.5 text-[12px] transition-colors border-l-2 ${
                    view === v.key
                      ? 'bg-sand-50 text-shore border-shore'
                      : 'text-sand-500 border-transparent hover:bg-sand-50 hover:text-sand-700'
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* メインコンテンツ */}
        <div className="flex-1 p-6 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center h-64 text-sand-400 text-sm">読み込み中…</div>
          )}

          {!loading && data && (
            <>
              {/* サマリーカード */}
              <div className="grid grid-cols-4 gap-3 mb-5">
                <SummaryCard label="総会員数" value={data.totalMembers} unit="名" />
                <SummaryCard label="直近1年 総来店数" value={data.totalReservations} unit="件" />
                <SummaryCard
                  label="直近1年 平均来店率"
                  value={(() => {
                    const recent3 = data.monthly.slice(-3).filter(m => m.total > 0)
                    if (!recent3.length) return 0
                    const avg = recent3.reduce((s, m) => s + m.returnRate, 0) / recent3.length
                    return Math.round(avg)
                  })()}
                  unit="%"
                  sub="直近3ヶ月リピート率"
                />
                <SummaryCard
                  label="今月来店数"
                  value={data.monthly[data.monthly.length - 1]?.total ?? 0}
                  unit="件"
                />
              </div>

              {/* 月別来店数 */}
              {view === 'monthly' && (
                <ChartCard title="月別来店数（直近12ヶ月）">
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={data.monthly} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2D5C8" />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickFormatter={v => v.slice(5) + '月'} />
                      <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ fontSize: 11, border: '1px solid #E2D5C8', borderRadius: 4 }}
                        formatter={(v, name) => [
                          `${v ?? 0}件`,
                          name === 'newCount' ? '新規' : name === 'returnCount' ? 'リピーター' : '合計'
                        ]}
                        labelFormatter={v => fmtMonth(String(v))}
                      />
                      <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }}
                        formatter={v => v === 'newCount' ? '新規' : 'リピーター'}
                      />
                      <Bar dataKey="newCount" stackId="a" fill="#C4AB8B" name="newCount" />
                      <Bar dataKey="returnCount" stackId="a" fill="#8B7355" name="returnCount" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>

                  <div className="mt-4 border-t border-sand-100 pt-4 overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-sand-50">
                          {['月', '来店計', '新規', 'リピーター', 'リピート率'].map(h => (
                            <th key={h} className="text-left text-[10px] text-sand-500 font-normal py-2 px-3 tracking-widest border border-sand-200">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.monthly.filter(m => m.total > 0).reverse().map(m => (
                          <tr key={m.month} className="hover:bg-sand-50">
                            <td className="py-2 px-3 text-[12px] border border-sand-100">{fmtMonth(m.month)}</td>
                            <td className="py-2 px-3 font-medium text-shore border border-sand-100">{m.total}件</td>
                            <td className="py-2 px-3 text-sand-500 border border-sand-100">{m.newCount}名</td>
                            <td className="py-2 px-3 text-sand-500 border border-sand-100">{m.returnCount}名</td>
                            <td className="py-2 px-3 border border-sand-100">
                              <span className={`text-[11px] font-medium ${m.returnRate >= 60 ? 'text-shore' : m.returnRate >= 40 ? 'text-amber-600' : 'text-sand-400'}`}>
                                {m.returnRate}%
                              </span>
                            </td>
                          </tr>
                        ))}
                        {data.monthly.every(m => m.total === 0) && (
                          <tr><td colSpan={5} className="text-center py-8 text-sand-400 text-sm">データがありません</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </ChartCard>
              )}

              {/* メニュー別 */}
              {view === 'menus' && (
                <ChartCard title="メニュー別予約数（上位10件）">
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart
                      data={data.topMenus}
                      layout="vertical"
                      margin={{ top: 0, right: 40, left: 10, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2D5C8" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: '#9CA3AF' }} allowDecimals={false} />
                      <YAxis
                        type="category"
                        dataKey="menu_name"
                        width={185}
                        tick={{ fontSize: 10, fill: '#6B7280' }}
                        tickFormatter={v => v.length > 20 ? v.slice(0, 20) + '…' : v}
                      />
                      <Tooltip
                        contentStyle={{ fontSize: 11, border: '1px solid #E2D5C8', borderRadius: 4 }}
                        formatter={v => [`${v ?? 0}件`, '予約数']}
                      />
                      <Bar dataKey="count" fill="#8B7355" radius={[0, 3, 3, 0]}>
                        {data.topMenus.map((_, i) => (
                          <Cell key={i} fill={BEACH_COLORS[Math.min(i, BEACH_COLORS.length - 1)]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>

                  <div className="mt-4 border-t border-sand-100 pt-4">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-sand-50">
                          {['順位', 'メニュー名', '予約数', '構成比'].map(h => (
                            <th key={h} className="text-left text-[10px] text-sand-500 font-normal py-2 px-3 tracking-widest border border-sand-200">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.topMenus.map((m, i) => {
                          const total = data.topMenus.reduce((s, x) => s + x.count, 0)
                          const pct = total > 0 ? Math.round(m.count / total * 100) : 0
                          return (
                            <tr key={m.menu_name} className="hover:bg-sand-50">
                              <td className="py-2 px-3 text-[11px] text-sand-400 border border-sand-100 w-12">{i + 1}</td>
                              <td className="py-2 px-3 text-[12px] border border-sand-100">{m.menu_name}</td>
                              <td className="py-2 px-3 font-medium text-shore border border-sand-100">{m.count}件</td>
                              <td className="py-2 px-3 border border-sand-100">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 bg-sand-100 rounded-full h-1.5 max-w-[80px]">
                                    <div className="bg-shore h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                                  </div>
                                  <span className="text-[11px] text-sand-500 w-8 text-right">{pct}%</span>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </ChartCard>
              )}

              {/* グレード分布 */}
              {view === 'grades' && (
                <div className="space-y-4">
                  <ChartCard title="会員グレード分布">
                    <div className="flex items-start gap-8">
                      <ResponsiveContainer width={240} height={240}>
                        <PieChart>
                          <Pie
                            data={data.gradeDistribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={105}
                            dataKey="count"
                            nameKey="grade"
                            label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                            labelLine={false}
                          >
                            {data.gradeDistribution.map((entry, i) => (
                              <Cell key={i} fill={GRADE_COLORS[entry.grade] ?? BEACH_COLORS[i]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ fontSize: 11, border: '1px solid #E2D5C8', borderRadius: 4 }}
                            formatter={(v, name) => [`${v ?? 0}名`, String(name)]}
                          />
                        </PieChart>
                      </ResponsiveContainer>

                      <div className="flex-1">
                        <table className="w-full text-sm border-collapse">
                          <thead>
                            <tr className="bg-sand-50">
                              {['グレード', '人数', '構成比', '平均来店数/年', '平均売上/年'].map(h => (
                                <th key={h} className="text-left text-[10px] text-sand-500 font-normal py-2 px-3 tracking-widest border border-sand-200">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {GRADE_ORDER.filter(g => data.gradeDistribution.find(x => x.grade === g)).map(g => {
                              const dist = data.gradeDistribution.find(x => x.grade === g)
                              const avg = data.gradeAvgStats.find(x => x.grade === g)
                              const total = data.gradeDistribution.reduce((s, x) => s + x.count, 0)
                              const pct = total > 0 && dist ? Math.round(dist.count / total * 100) : 0
                              return (
                                <tr key={g} className="hover:bg-sand-50">
                                  <td className="py-2 px-3 border border-sand-100">
                                    <span className="flex items-center gap-2">
                                      <span className="w-2 h-2 rounded-full" style={{ background: GRADE_COLORS[g] }} />
                                      <span className="text-[12px] font-medium">{g}</span>
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 font-medium text-shore border border-sand-100">{dist?.count ?? 0}名</td>
                                  <td className="py-2 px-3 text-sand-500 border border-sand-100">{pct}%</td>
                                  <td className="py-2 px-3 border border-sand-100">{avg?.avgVisits ?? 0}回</td>
                                  <td className="py-2 px-3 border border-sand-100">{fmtYen(avg?.avgAmount ?? 0)}</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </ChartCard>
                </div>
              )}

              {/* 会員登録推移 */}
              {view === 'members' && (
                <ChartCard title="会員登録推移（直近12ヶ月）">
                  <ResponsiveContainer width="100%" height={260}>
                    <ComposedChart data={data.memberGrowth} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2D5C8" />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickFormatter={v => v.slice(5) + '月'} />
                      <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#9CA3AF' }} allowDecimals={false} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#9CA3AF' }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ fontSize: 11, border: '1px solid #E2D5C8', borderRadius: 4 }}
                        labelFormatter={v => fmtMonth(String(v))}
                        formatter={(v, name) => [
                          `${v ?? 0}名`,
                          name === 'cumulative' ? '累計会員数' : '新規登録'
                        ]}
                      />
                      <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }}
                        formatter={v => v === 'cumulative' ? '累計会員数' : '新規登録'}
                      />
                      <Bar yAxisId="left" dataKey="count" fill="#C4AB8B" name="count" radius={[2, 2, 0, 0]} />
                      <Line yAxisId="right" type="monotone" dataKey="cumulative" stroke="#8B7355" strokeWidth={2} dot={{ r: 3 }} name="cumulative" />
                    </ComposedChart>
                  </ResponsiveContainer>

                  <div className="mt-4 border-t border-sand-100 pt-4 overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-sand-50">
                          {['月', '新規登録', '累計会員数'].map(h => (
                            <th key={h} className="text-left text-[10px] text-sand-500 font-normal py-2 px-3 tracking-widest border border-sand-200">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.memberGrowth.slice().reverse().map(m => (
                          <tr key={m.month} className="hover:bg-sand-50">
                            <td className="py-2 px-3 text-[12px] border border-sand-100">{fmtMonth(m.month)}</td>
                            <td className="py-2 px-3 font-medium text-shore border border-sand-100">+{m.count}名</td>
                            <td className="py-2 px-3 text-sand-500 border border-sand-100">{m.cumulative}名</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </ChartCard>
              )}

              {/* リピート分析 */}
              {view === 'repeat' && (
                <div className="space-y-4">
                  {/* 分析期間セレクター */}
                  <div className="bg-white rounded border border-sand-200 px-5 py-3 flex items-center gap-4">
                    <span className="text-[10px] text-sand-400 tracking-widest">分析期間</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCohortMonth(m => addMonths(m, -1))}
                        className="w-7 h-7 flex items-center justify-center rounded border border-sand-200 hover:bg-sand-50 text-sand-400 text-sm"
                      >◀</button>
                      <span className="text-[13px] font-medium text-[#2A2520] w-20 text-center">{fmtMonth(cohortMonth)}</span>
                      <button
                        onClick={() => setCohortMonth(m => addMonths(m, 1))}
                        className="w-7 h-7 flex items-center justify-center rounded border border-sand-200 hover:bg-sand-50 text-sand-400 text-sm"
                      >▶</button>
                    </div>
                    <span className="text-[11px] text-sand-400">に来店したお客様の再来店状況</span>
                    {cohortLoading && <span className="text-[10px] text-sand-400 ml-auto">読み込み中…</span>}
                  </div>

                  {/* 凡例 */}
                  <div className="bg-white rounded border border-sand-200 px-5 py-3">
                    <div className="flex flex-wrap gap-6 text-[11px]">
                      {(['new','returning','regular','returner'] as const).map(k => (
                        <span key={k} className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: CAT_COLORS[k] }} />
                          <span className="font-medium" style={{ color: CAT_COLORS[k] }}>{CAT_LABELS[k]}</span>
                          <span className="text-sand-400">
                            {k === 'new' ? '= 初めての来店' : k === 'returning' ? '= 2回目の来店' : k === 'regular' ? '= 3回目以上の来店' : '= 6ヶ月以上ぶりの再来店'}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {cohortData && !cohortLoading && (
                    <>
                      {/* 2グラフ横並び */}
                      <div className="grid grid-cols-2 gap-4">
                        <ChartCard title="再来店率">
                          {cohortData.chartRates.length === 0 ? (
                            <div className="flex items-center justify-center h-40 text-sand-400 text-sm">データなし</div>
                          ) : (
                            <ResponsiveContainer width="100%" height={220}>
                              <LineChart data={cohortData.chartRates} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E2D5C8" />
                                <XAxis dataKey="lag" tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                                <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                                <Tooltip
                                  contentStyle={{ fontSize: 11, border: '1px solid #E2D5C8', borderRadius: 4 }}
                                  formatter={(v, name) => [`${v ?? 0}%`, CAT_LABELS[String(name)] ?? String(name)]}
                                />
                                <Legend iconSize={10} wrapperStyle={{ fontSize: 10 }}
                                  formatter={v => CAT_LABELS[v] ?? v}
                                />
                                {(['new','returning','regular','returner'] as const).map(k => (
                                  <Line key={k} type="monotone" dataKey={k} stroke={CAT_COLORS[k]} strokeWidth={2} dot={{ r: 3 }} name={k} />
                                ))}
                              </LineChart>
                            </ResponsiveContainer>
                          )}
                        </ChartCard>

                        <ChartCard title="再来店客数">
                          {cohortData.chartCounts.length === 0 ? (
                            <div className="flex items-center justify-center h-40 text-sand-400 text-sm">データなし</div>
                          ) : (
                            <ResponsiveContainer width="100%" height={220}>
                              <BarChart data={cohortData.chartCounts} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E2D5C8" />
                                <XAxis dataKey="lag" tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} unit="人" />
                                <Tooltip
                                  contentStyle={{ fontSize: 11, border: '1px solid #E2D5C8', borderRadius: 4 }}
                                  formatter={(v, name) => [`${v ?? 0}人`, CAT_LABELS[String(name)] ?? String(name)]}
                                />
                                <Legend iconSize={10} wrapperStyle={{ fontSize: 10 }}
                                  formatter={v => CAT_LABELS[v] ?? v}
                                />
                                {(['new','returning','regular','returner'] as const).map(k => (
                                  <Bar key={k} dataKey={k} stackId="a" fill={CAT_COLORS[k]} name={k} />
                                ))}
                              </BarChart>
                            </ResponsiveContainer>
                          )}
                        </ChartCard>
                      </div>

                      {/* 来店区分タブ */}
                      <div className="bg-white rounded border border-sand-200 overflow-hidden">
                        <div className="bg-sand-50 border-b border-sand-200 px-5 py-2.5 flex items-center justify-between">
                          <span className="text-[11px] tracking-widest text-sand-500">■ {fmtMonth(cohortData.baseMonth)}来店 — 再来店コホート</span>
                          <div className="flex gap-1">
                            {(['all', 'new', 'returning', 'regular', 'returner'] as const).map(k => (
                              <button
                                key={k}
                                onClick={() => setRepeatTab(k)}
                                className="px-2.5 py-1 text-[10px] rounded transition-colors"
                                style={repeatTab === k ? { background: k === 'all' ? '#8B7355' : CAT_COLORS[k], color: 'white' } : { background: '#F0EAE0', color: '#9CA3AF' }}
                              >
                                {k === 'all' ? '全体' : CAT_LABELS[k]}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="p-5 overflow-x-auto">
                          {cohortData.totalVisitors === 0 ? (
                            <div className="text-center py-12 text-sand-400 text-sm">この月の来店データがありません</div>
                          ) : (
                            <table className="w-full text-sm border-collapse">
                              <thead>
                                <tr className="bg-sand-50">
                                  <th className="text-left text-[10px] text-sand-500 font-normal py-2 px-3 border border-sand-200 whitespace-nowrap">来店区分</th>
                                  <th className="text-left text-[10px] text-sand-500 font-normal py-2 px-3 border border-sand-200 whitespace-nowrap">来店者数</th>
                                  <th className="text-left text-[10px] text-sand-500 font-normal py-2 px-3 border border-sand-200 whitespace-nowrap">構成比</th>
                                  {[1,2,3,4,5,6].map(lag => (
                                    <th key={lag} className="text-center text-[10px] text-sand-500 font-normal py-2 px-2 border border-sand-200 whitespace-nowrap">
                                      {lag}ヶ月後<br/>
                                      <span className="text-[9px] text-sand-300">({fmtMonth(addMonths(cohortData.baseMonth, lag))})</span>
                                    </th>
                                  ))}
                                  <th className="text-center text-[10px] text-sand-500 font-normal py-2 px-2 border border-sand-200 whitespace-nowrap">失客</th>
                                </tr>
                              </thead>
                              <tbody>
                                {cohortData.categories
                                  .filter(cat => repeatTab === 'all' || cat.key === repeatTab)
                                  .map(cat => (
                                    <tr key={cat.key} className="hover:bg-sand-50">
                                      <td className="py-2 px-3 border border-sand-100">
                                        <span className="flex items-center gap-1.5">
                                          <span className="w-2 h-2 rounded-full" style={{ background: CAT_COLORS[cat.key] }} />
                                          <span className="text-[12px] font-medium">{cat.label}</span>
                                        </span>
                                      </td>
                                      <td className="py-2 px-3 font-medium text-shore border border-sand-100">{cat.count}名</td>
                                      <td className="py-2 px-3 text-sand-500 border border-sand-100">{cat.pct}%</td>
                                      {cat.lags.map(l => (
                                        <td key={l.lag} className="py-2 px-2 border border-sand-100 text-center">
                                          <div className="text-[12px] font-medium">{l.count}名</div>
                                          <div className={`text-[10px] ${l.rate >= 50 ? 'text-shore font-medium' : l.rate >= 30 ? 'text-amber-600' : 'text-sand-300'}`}>
                                            {l.rate}%
                                          </div>
                                        </td>
                                      ))}
                                      <td className="py-2 px-2 border border-sand-100 text-center bg-red-50">
                                        <div className="text-[12px] font-medium text-red-500">{cat.lost.count}名</div>
                                        <div className="text-[10px] text-red-400">{cat.lost.rate}%</div>
                                      </td>
                                    </tr>
                                  ))}
                                {/* 合計行 */}
                                {repeatTab === 'all' && (
                                  <tr className="bg-sand-50 font-medium">
                                    <td className="py-2 px-3 border border-sand-200 text-[12px]">合計</td>
                                    <td className="py-2 px-3 border border-sand-200 text-shore">{cohortData.totalVisitors}名</td>
                                    <td className="py-2 px-3 border border-sand-200 text-sand-500">100%</td>
                                    {[0,1,2,3,4,5].map(i => {
                                      const total = cohortData.categories.reduce((s, c) => s + (c.lags[i]?.count ?? 0), 0)
                                      const rate = cohortData.totalVisitors > 0 ? Math.round(total / cohortData.totalVisitors * 100) : 0
                                      return (
                                        <td key={i} className="py-2 px-2 border border-sand-200 text-center">
                                          <div className="text-[12px]">{total}名</div>
                                          <div className="text-[10px] text-sand-500">{rate}%</div>
                                        </td>
                                      )
                                    })}
                                    <td className="py-2 px-2 border border-sand-200 text-center bg-red-50">
                                      <div className="text-[12px] text-red-500">
                                        {cohortData.categories.reduce((s, c) => s + c.lost.count, 0)}名
                                      </div>
                                      <div className="text-[10px] text-red-400">
                                        {cohortData.totalVisitors > 0
                                          ? Math.round(cohortData.categories.reduce((s, c) => s + c.lost.count, 0) / cohortData.totalVisitors * 100)
                                          : 0}%
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* 優良顧客分析 */}
              {view === 'vip' && (
                <div className="space-y-4">
                  <div className="flex gap-2 mb-1">
                    <button
                      onClick={() => setVipTab('visits')}
                      className={`px-4 py-1.5 text-[12px] rounded border transition-colors ${vipTab === 'visits' ? 'bg-shore text-white border-shore' : 'bg-white text-sand-500 border-sand-200 hover:bg-sand-50'}`}
                    >
                      来店回数TOP
                    </button>
                    <button
                      onClick={() => setVipTab('amount')}
                      className={`px-4 py-1.5 text-[12px] rounded border transition-colors ${vipTab === 'amount' ? 'bg-shore text-white border-shore' : 'bg-white text-sand-500 border-sand-200 hover:bg-sand-50'}`}
                    >
                      売上TOP
                    </button>
                  </div>

                  <ChartCard title={vipTab === 'visits' ? '年間来店回数 上位10名' : '年間売上 上位10名'}>
                    {(() => {
                      const list = vipTab === 'visits' ? data.topByVisits : data.topByAmount
                      if (!list.length) {
                        return <div className="text-center py-12 text-sand-400 text-sm">データがありません</div>
                      }
                      return (
                        <table className="w-full text-sm border-collapse">
                          <thead>
                            <tr className="bg-sand-50">
                              {['順位', '会員番号', 'お名前', 'グレード', '来店回数/年', '売上/年', 'ポイント'].map(h => (
                                <th key={h} className="text-left text-[10px] text-sand-500 font-normal py-2 px-3 tracking-widest border border-sand-200">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {list.map((m, i) => (
                              <tr key={m.member_number} className={`hover:bg-sand-50 ${i === 0 ? 'bg-amber-50' : ''}`}>
                                <td className="py-2 px-3 border border-sand-100">
                                  <span className={`text-[12px] font-bold ${i === 0 ? 'text-amber-500' : i === 1 ? 'text-sand-400' : i === 2 ? 'text-amber-700' : 'text-sand-300'}`}>
                                    {i + 1}
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-[11px] text-sand-400 border border-sand-100">{m.member_number}</td>
                                <td className="py-2 px-3 text-[12px] font-medium border border-sand-100">{m.name}</td>
                                <td className="py-2 px-3 border border-sand-100">
                                  <span className="text-[10px] px-2 py-0.5 rounded-full" style={{
                                    background: GRADE_COLORS[m.grade] + '20',
                                    color: GRADE_COLORS[m.grade] ?? '#8B7355',
                                    border: `1px solid ${GRADE_COLORS[m.grade] ?? '#8B7355'}40`,
                                  }}>
                                    {m.grade}
                                  </span>
                                </td>
                                <td className="py-2 px-3 font-medium text-shore border border-sand-100">{m.year_visits}回</td>
                                <td className="py-2 px-3 border border-sand-100">{fmtYen(m.year_amount)}</td>
                                <td className="py-2 px-3 text-sand-500 border border-sand-100">{m.points.toLocaleString()}pt</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )
                    })()}
                  </ChartCard>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function SummaryCard({ label, value, unit, sub }: { label: string; value: number; unit: string; sub?: string }) {
  return (
    <div className="bg-white rounded border border-sand-200 p-4">
      <div className="text-[10px] text-sand-400 tracking-widest mb-1">{label}</div>
      <div className="text-2xl font-light text-[#2A2520]">
        {value.toLocaleString()}<span className="text-sm text-sand-400 ml-1">{unit}</span>
      </div>
      {sub && <div className="text-[9px] text-sand-300 mt-0.5">{sub}</div>}
    </div>
  )
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded border border-sand-200 overflow-hidden">
      <div className="bg-sand-50 border-b border-sand-200 px-5 py-2.5">
        <span className="text-[11px] tracking-widest text-sand-500">■ {title}</span>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}
