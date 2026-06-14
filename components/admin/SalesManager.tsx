'use client'

import { useState, useEffect } from 'react'
import AdminTopNav from './AdminTopNav'

type DayData = {
  date: string
  dow: string
  resCount: number
  estRevenue: number
  orderRevenue: number
}

type MonthData = {
  month: string
  resCount: number
  estRevenue: number
  orderRevenue: number
}

type SalesData = {
  today: {
    date: string
    resCount: number
    completedCount: number
    confirmedCount: number
    estRevenue: number
    orderRevenue: number
  }
  weekly: DayData[]
  monthly: MonthData[]
}

function fmt(n: number) { return n.toLocaleString('ja-JP') }

export default function SalesManager() {
  const [data, setData] = useState<SalesData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/sales')
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-sand-100">
        <AdminTopNav />
        <div className="flex-1 flex items-center justify-center text-sand-400 text-sm">読み込み中…</div>
      </div>
    )
  }

  if (!data) return null

  const { today, weekly, monthly } = data

  // 月別グラフ用 最大値
  const maxMonthRes = Math.max(...monthly.map(m => m.resCount), 1)

  // 週間グリッドを2行（前週 7 日 + 今週 7 日）に分割
  const week1 = weekly.slice(0, 7)
  const week2 = weekly.slice(7)

  function dowColor(dow: string) {
    if (dow === '日') return 'text-red-400'
    if (dow === '土') return 'text-blue-400'
    return 'text-sand-500'
  }

  function todayColor(ds: string) {
    return ds === today.date ? 'bg-shore/10 border-shore/40' : 'bg-white border-sand-200'
  }

  return (
    <div className="min-h-screen flex flex-col bg-sand-100">
      <AdminTopNav />

      <div className="flex-1 p-6 max-w-[1200px] mx-auto w-full space-y-5">

        {/* 本日の売上 */}
        <div className="bg-white rounded border border-sand-200 overflow-hidden">
          <div className="bg-sand-50 border-b border-sand-200 px-5 py-2.5">
            <span className="text-[11px] tracking-widest text-sand-500">本日の売上　</span>
            <span className="text-[11px] text-sand-400">
              {today.date.replace(/-/g, '/')}（{['日','月','火','水','木','金','土'][new Date(today.date).getDay()]}）
            </span>
          </div>
          <div className="p-5 flex gap-6 flex-wrap">
            <div className="flex gap-6">
              <SummaryCard label="予約件数" value={`${today.resCount}件`} sub={`来店済 ${today.completedCount} / 確定 ${today.confirmedCount}`} />
              <SummaryCard label="施術売上（推定）" value={`¥${fmt(today.estRevenue)}`} sub="メニュー定価合計" accent />
              <SummaryCard label="EC売上" value={`¥${fmt(today.orderRevenue)}`} sub="ショップ受注" />
            </div>
            <div className="ml-auto flex items-end gap-2 text-right">
              <div>
                <div className="text-[10px] text-sand-400 tracking-widest">純売上（推定）</div>
                <div className="text-2xl font-light text-[#2A2520] mt-0.5">
                  ¥{fmt(today.estRevenue + today.orderRevenue)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 週間売上状況 */}
        <div className="bg-white rounded border border-sand-200 overflow-hidden">
          <div className="bg-sand-50 border-b border-sand-200 px-5 py-2.5">
            <span className="text-[11px] tracking-widest text-sand-500">週間売上状況</span>
            <span className="text-[10px] text-sand-400 ml-2">過去14日間</span>
          </div>
          <div className="p-4 space-y-2">
            {[week1, week2].map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 gap-1.5">
                {week.map(d => (
                  <div key={d.date} className={`border rounded p-2 text-center ${todayColor(d.date)}`}>
                    <div className={`text-[10px] ${dowColor(d.dow)}`}>
                      {d.date.slice(5).replace('-', '/')}（{d.dow}）
                    </div>
                    <div className="text-lg font-light text-[#2A2520] mt-1">
                      {d.resCount > 0 ? <span className="text-shore font-medium">{d.resCount}</span> : <span className="text-sand-300">0</span>}
                      <span className="text-[10px] text-sand-400 ml-0.5">件</span>
                    </div>
                    <div className="text-[10px] text-sand-400 mt-0.5">
                      {d.estRevenue > 0 ? `¥${fmt(d.estRevenue)}` : '—'}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* 月別来店数推移 */}
        <div className="bg-white rounded border border-sand-200 overflow-hidden">
          <div className="bg-sand-50 border-b border-sand-200 px-5 py-2.5">
            <span className="text-[11px] tracking-widest text-sand-500">月別来店数推移</span>
            <span className="text-[10px] text-sand-400 ml-2">過去6ヶ月</span>
          </div>
          <div className="p-5">
            {/* バーチャート */}
            <div className="flex items-end gap-3 h-40">
              {monthly.map(m => {
                const h = maxMonthRes > 0 ? Math.round((m.resCount / maxMonthRes) * 120) : 0
                return (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                    <div className="text-[10px] text-sand-500 font-medium">{m.resCount}</div>
                    <div
                      className="w-full bg-shore/70 rounded-t transition-all"
                      style={{ height: `${Math.max(h, m.resCount > 0 ? 4 : 0)}px` }}
                    />
                    <div className="text-[9px] text-sand-400">{m.month.slice(5)}月</div>
                  </div>
                )
              })}
            </div>

            {/* 数値テーブル */}
            <div className="mt-4 border-t border-sand-100 pt-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-sand-100">
                    {['月', '予約件数', '施術売上（推定）', 'EC売上'].map(h => (
                      <th key={h} className="text-left text-[10px] text-sand-400 font-normal pb-2 tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {monthly.map(m => (
                    <tr key={m.month} className="border-b border-sand-100">
                      <td className="py-2 text-[12px]">{m.month.replace('-', '年')}月</td>
                      <td className="py-2 font-medium text-shore">{m.resCount}件</td>
                      <td className="py-2 text-sand-600">¥{fmt(m.estRevenue)}</td>
                      <td className="py-2 text-sand-600">¥{fmt(m.orderRevenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <p className="text-[10px] text-sand-400 text-center">
          ※ 施術売上はメニュー定価の合計です。実際の金額と異なる場合があります。
        </p>
      </div>
    </div>
  )
}

function SummaryCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="min-w-[120px]">
      <div className="text-[10px] text-sand-400 tracking-widest mb-1">{label}</div>
      <div className={`text-xl font-light ${accent ? 'text-shore' : 'text-[#2A2520]'}`}>{value}</div>
      {sub && <div className="text-[10px] text-sand-400 mt-0.5">{sub}</div>}
    </div>
  )
}
