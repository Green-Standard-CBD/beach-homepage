'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import AdminTopNav from './AdminTopNav'

type Member = {
  id: string
  member_number: number | null
  name: string
  phone: string | null
  birthday: string | null
  grade: string
  points: number
  year_amount: number
  year_visits: number
  created_at: string
  prefecture: string | null
  city: string | null
}

type Reservation = {
  id: string
  date: string
  time: string
  menu_name: string
  status: string
  stylist_id: string | null
}

type Carte = {
  id: string
  date: string
  menu: string | null
  memo: string | null
  drink: string | null
}

type PointRecord = {
  id: string
  label: string
  points: number
  created_at: string
}

type MemberDetail = {
  member: Member & { postal_code?: string; address_line1?: string; pref_shampoo?: string; pref_music?: string }
  reservations: Reservation[]
  cartes: Carte[]
  pointHistory: PointRecord[]
}

const GRADE_STYLE: Record<string, string> = {
  BRONZE:   'bg-amber-100 text-amber-700 border border-amber-200',
  SILVER:   'bg-gray-100 text-gray-600 border border-gray-200',
  GOLD:     'bg-yellow-100 text-yellow-700 border border-yellow-200',
  PLATINUM: 'bg-purple-100 text-purple-700 border border-purple-200',
}

const STATUS_LABEL: Record<string, string> = {
  confirmed: '受付待ち',
  completed: '来店済',
  cancelled: 'キャンセル',
}
const STATUS_STYLE: Record<string, string> = {
  confirmed: 'text-shore',
  completed: 'text-sand-500',
  cancelled: 'text-red-400',
}

function formatDate(s: string | null) {
  if (!s) return '—'
  return s.replace(/-/g, '/').slice(0, 10)
}

function formatNum(n: number) {
  return n.toLocaleString('ja-JP')
}

export default function CustomersManager() {
  const router = useRouter()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [searchName, setSearchName] = useState('')
  const [searchPhone, setSearchPhone] = useState('')
  const [searchGrade, setSearchGrade] = useState('')
  const [searchMemberNumber, setSearchMemberNumber] = useState('')
  const [detail, setDetail] = useState<MemberDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailTab, setDetailTab] = useState<'info' | 'reservations' | 'cartes' | 'points'>('info')

  useEffect(() => {
    fetch('/api/admin/members?all=true')
      .then(r => r.json())
      .then(d => { if (d.members) setMembers(d.members) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    return members.filter(m => {
      const nameOk = !searchName || m.name.includes(searchName)
      const phoneOk = !searchPhone || (m.phone ?? '').includes(searchPhone)
      const gradeOk = !searchGrade || m.grade === searchGrade
      const numOk = !searchMemberNumber || String(m.member_number ?? '').includes(searchMemberNumber)
      return nameOk && phoneOk && gradeOk && numOk
    })
  }, [members, searchName, searchPhone, searchGrade, searchMemberNumber])

  async function openDetail(m: Member) {
    setDetailLoading(true)
    setDetail(null)
    setDetailTab('info')
    const res = await fetch(`/api/admin/members/${m.id}`)
    const d = await res.json()
    setDetail(d)
    setDetailLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col bg-sand-100">
      <AdminTopNav />

      <div className="flex-1 p-6 max-w-[1400px] mx-auto w-full">
        {/* 検索フォーム */}
        <div className="bg-white rounded border border-sand-200 p-4 mb-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <div className="text-[10px] text-sand-400 mb-1 tracking-widest">お名前</div>
              <input
                type="text"
                value={searchName}
                onChange={e => setSearchName(e.target.value)}
                placeholder="田中 花子"
                className="border border-sand-200 rounded px-3 py-1.5 text-sm w-40 focus:outline-none focus:border-shore"
              />
            </div>
            <div>
              <div className="text-[10px] text-sand-400 mb-1 tracking-widest">電話番号</div>
              <input
                type="text"
                value={searchPhone}
                onChange={e => setSearchPhone(e.target.value)}
                placeholder="090-xxxx-xxxx"
                className="border border-sand-200 rounded px-3 py-1.5 text-sm w-44 focus:outline-none focus:border-shore"
              />
            </div>
            <div>
              <div className="text-[10px] text-sand-400 mb-1 tracking-widest">グレード</div>
              <select
                value={searchGrade}
                onChange={e => setSearchGrade(e.target.value)}
                className="border border-sand-200 rounded px-3 py-1.5 text-sm w-36 focus:outline-none focus:border-shore bg-white"
              >
                <option value="">すべて</option>
                <option value="BRONZE">BRONZE</option>
                <option value="SILVER">SILVER</option>
                <option value="GOLD">GOLD</option>
                <option value="PLATINUM">PLATINUM</option>
              </select>
            </div>
            <div>
              <div className="text-[10px] text-sand-400 mb-1 tracking-widest">会員番号</div>
              <input
                type="text"
                value={searchMemberNumber}
                onChange={e => setSearchMemberNumber(e.target.value)}
                placeholder="1001"
                className="border border-sand-200 rounded px-3 py-1.5 text-sm w-28 focus:outline-none focus:border-shore"
              />
            </div>
            <button
              onClick={() => { setSearchName(''); setSearchPhone(''); setSearchGrade(''); setSearchMemberNumber('') }}
              className="px-4 py-1.5 text-sm text-sand-400 border border-sand-200 rounded hover:bg-sand-50 transition-colors"
            >
              条件クリア
            </button>
          </div>
        </div>

        {/* 件数 */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-sand-500">
            {loading ? '読み込み中…' : `${filtered.length}件 / 全${members.length}件`}
          </span>
          <button
            onClick={() => {
              const csv = [
                ['会員番号', '名前', 'グレード', '電話', 'ポイント', '来店回数', '年間売上', '登録日'],
                ...filtered.map(m => [
                  m.member_number ?? '', m.name, m.grade,
                  m.phone ?? '', m.points, m.year_visits, m.year_amount,
                  formatDate(m.created_at)
                ])
              ].map(r => r.join(',')).join('\n')
              const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a'); a.href = url; a.download = 'members.csv'; a.click()
            }}
            className="text-[11px] px-3 py-1 border border-sand-200 rounded text-sand-500 hover:bg-sand-50 transition-colors"
          >
            CSV出力
          </button>
        </div>

        {/* 一覧テーブル */}
        <div className="bg-white rounded border border-sand-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-sand-50 border-b border-sand-200">
              <tr>
                {['会員番号', '名前', 'グレード', '電話番号', 'ポイント', '来店回数', '年間売上', '登録日'].map(h => (
                  <th key={h} className="text-left text-[11px] text-sand-400 tracking-widest font-normal px-4 py-2.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={8} className="text-center py-12 text-sand-400 text-sm">読み込み中…</td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={8} className="text-center py-12 text-sand-400 text-sm">該当する会員はいません</td></tr>
              )}
              {filtered.map((m, i) => (
                <tr
                  key={m.id}
                  className={`border-b border-sand-100 cursor-pointer hover:bg-sand-50 transition-colors ${i % 2 === 1 ? 'bg-[#FDFAF6]' : ''}`}
                  onClick={() => openDetail(m)}
                >
                  <td className="px-4 py-3 text-sand-400 text-[11px]">
                    {m.member_number ? `#${String(m.member_number).padStart(4, '0')}` : '—'}
                  </td>
                  <td className="px-4 py-3 font-medium text-[#2A2520]">{m.name}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium tracking-widest ${GRADE_STYLE[m.grade] ?? 'bg-sand-100 text-sand-500'}`}>
                      {m.grade}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sand-500">{m.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-right text-shore font-medium">{formatNum(m.points)}<span className="text-[10px] text-sand-400 ml-0.5">pt</span></td>
                  <td className="px-4 py-3 text-right text-sand-600">{m.year_visits}<span className="text-[10px] text-sand-400 ml-0.5">回</span></td>
                  <td className="px-4 py-3 text-right text-sand-600">¥{formatNum(m.year_amount)}</td>
                  <td className="px-4 py-3 text-sand-400 text-[11px]">{formatDate(m.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 詳細モーダル */}
      {(detail || detailLoading) && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-start justify-end"
          onClick={e => { if (e.target === e.currentTarget) setDetail(null) }}
        >
          <div className="bg-white w-full max-w-2xl h-full overflow-y-auto shadow-2xl flex flex-col">
            {/* モーダルヘッダー */}
            <div className="bg-[#2A2520] text-cream px-6 py-4 flex items-center justify-between flex-shrink-0">
              <div>
                {detail && (
                  <>
                    <div className="font-medium tracking-wider">{detail.member.name}</div>
                    <div className="text-[11px] text-cream/50 mt-0.5">
                      {detail.member.member_number ? `#${String(detail.member.member_number).padStart(4,'0')} ` : ''}
                      <span className={`inline-block px-1.5 py-0 rounded text-[10px] ml-1 ${GRADE_STYLE[detail.member.grade] ?? ''}`}>
                        {detail.member.grade}
                      </span>
                    </div>
                  </>
                )}
                {detailLoading && <div className="text-sm text-cream/60">読み込み中…</div>}
              </div>
              <button onClick={() => setDetail(null)} className="text-cream/50 hover:text-cream text-xl leading-none">✕</button>
            </div>

            {/* タブ */}
            {detail && (
              <>
                <div className="flex border-b border-sand-200 flex-shrink-0">
                  {(['info', 'reservations', 'cartes', 'points'] as const).map(tab => {
                    const labels = { info: '基本情報', reservations: `予約履歴(${detail.reservations.length})`, cartes: `カルテ(${detail.cartes.length})`, points: 'ポイント' }
                    return (
                      <button
                        key={tab}
                        onClick={() => setDetailTab(tab)}
                        className={`px-4 py-2.5 text-[11px] tracking-widest border-b-2 transition-colors ${
                          detailTab === tab ? 'border-shore text-shore' : 'border-transparent text-sand-400 hover:text-sand-600'
                        }`}
                      >
                        {labels[tab]}
                      </button>
                    )
                  })}
                </div>

                <div className="flex-1 p-5 overflow-y-auto">
                  {/* 基本情報 */}
                  {detailTab === 'info' && (
                    <div className="space-y-4">

                      {/* 来店実績カード 4マス */}
                      <div className="grid grid-cols-4 gap-2">
                        <StatBox label="グレード">
                          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium tracking-widest ${GRADE_STYLE[detail.member.grade] ?? 'bg-sand-100 text-sand-500'}`}>
                            {detail.member.grade}
                          </span>
                        </StatBox>
                        <StatBox label="ポイント">
                          <span className="text-lg font-medium text-shore">{formatNum(detail.member.points)}</span>
                          <span className="text-[10px] text-sand-400 ml-0.5">pt</span>
                        </StatBox>
                        <StatBox label="来店回数">
                          <span className="text-lg font-medium text-[#2A2520]">{detail.member.year_visits}</span>
                          <span className="text-[10px] text-sand-400 ml-0.5">回</span>
                        </StatBox>
                        <StatBox label="年間売上">
                          <span className="text-[13px] font-medium text-[#2A2520]">¥{formatNum(detail.member.year_amount)}</span>
                        </StatBox>
                      </div>

                      {/* 基本情報グリッド */}
                      <div>
                        <div className="text-[10px] text-sand-400 tracking-widest mb-1.5">基本情報</div>
                        <div className="border border-sand-200 rounded overflow-hidden">
                          <InfoGrid>
                            <InfoCell label="氏名" value={detail.member.name} />
                            <InfoCell label="電話番号" value={detail.member.phone ?? '—'} />
                            <InfoCell label="誕生日" value={formatDate(detail.member.birthday)} />
                            <InfoCell label="会員番号" value={detail.member.member_number ? `#${String(detail.member.member_number).padStart(4,'0')}` : '—'} />
                            <InfoCell label="都道府県" value={detail.member.prefecture ?? '—'} />
                            <InfoCell label="市区町村" value={detail.member.city ?? '—'} />
                            <InfoCell label="初回登録日" value={formatDate(detail.member.created_at)} wide />
                          </InfoGrid>
                        </div>
                      </div>

                      {/* 施術設定グリッド */}
                      {(detail.member.pref_shampoo || detail.member.pref_music) && (
                        <div>
                          <div className="text-[10px] text-sand-400 tracking-widest mb-1.5">施術設定</div>
                          <div className="border border-sand-200 rounded overflow-hidden">
                            <InfoGrid>
                              <InfoCell label="シャンプー" value={detail.member.pref_shampoo ?? '—'} />
                              <InfoCell label="BGM" value={detail.member.pref_music ?? '—'} />
                            </InfoGrid>
                          </div>
                        </div>
                      )}

                    </div>
                  )}

                  {/* 予約履歴 */}
                  {detailTab === 'reservations' && (
                    <div>
                      {detail.reservations.length === 0 ? (
                        <div className="text-center py-12 text-sand-400 text-sm">予約履歴はありません</div>
                      ) : (
                        <table className="w-full text-sm">
                          <thead className="border-b border-sand-200">
                            <tr>
                              {['来店日', '時間', 'メニュー', 'ステータス'].map(h => (
                                <th key={h} className="text-left text-[10px] text-sand-400 pb-2 font-normal tracking-widest">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {detail.reservations.map(r => (
                              <tr key={r.id} className="border-b border-sand-100">
                                <td className="py-2.5 text-[12px]">{formatDate(r.date)}</td>
                                <td className="py-2.5 text-sand-500 text-[12px]">{r.time}</td>
                                <td className="py-2.5 text-[12px] max-w-[200px]">{r.menu_name}</td>
                                <td className="py-2.5">
                                  <span className={`text-[10px] ${STATUS_STYLE[r.status] ?? 'text-sand-400'}`}>
                                    {STATUS_LABEL[r.status] ?? r.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}

                  {/* カルテ */}
                  {detailTab === 'cartes' && (
                    <div className="space-y-3">
                      {detail.cartes.length === 0 ? (
                        <div className="text-center py-12 text-sand-400 text-sm">カルテはありません</div>
                      ) : detail.cartes.map(c => (
                        <div key={c.id} className="border border-sand-200 rounded p-3">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-[11px] text-sand-400">{formatDate(c.date)}</span>
                            {c.menu && <span className="text-[11px] font-medium">{c.menu}</span>}
                          </div>
                          {c.memo && <p className="text-sm text-sand-600 whitespace-pre-wrap">{c.memo}</p>}
                          {c.drink && <p className="text-[11px] text-sand-400 mt-1">ドリンク: {c.drink}</p>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ポイント履歴 */}
                  {detailTab === 'points' && (
                    <div>
                      <div className="text-right text-sm mb-3">
                        現在 <span className="text-shore font-bold text-lg">{formatNum(detail.member.points)}</span> pt
                      </div>
                      {detail.pointHistory.length === 0 ? (
                        <div className="text-center py-12 text-sand-400 text-sm">ポイント履歴はありません</div>
                      ) : (
                        <table className="w-full text-sm">
                          <thead className="border-b border-sand-200">
                            <tr>
                              {['日時', '内容', 'ポイント'].map(h => (
                                <th key={h} className="text-left text-[10px] text-sand-400 pb-2 font-normal tracking-widest">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {detail.pointHistory.map(p => (
                              <tr key={p.id} className="border-b border-sand-100">
                                <td className="py-2.5 text-[11px] text-sand-400">{formatDate(p.created_at)}</td>
                                <td className="py-2.5 text-[12px]">{p.label}</td>
                                <td className={`py-2.5 text-right font-medium ${p.points >= 0 ? 'text-shore' : 'text-red-400'}`}>
                                  {p.points >= 0 ? '+' : ''}{formatNum(p.points)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function StatBox({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-sand-200 rounded p-3 text-center">
      <div className="text-[9px] text-sand-400 tracking-widest mb-1.5">{label}</div>
      <div className="flex items-baseline justify-center gap-0.5">{children}</div>
    </div>
  )
}

function InfoGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2">{children}</div>
}

function InfoCell({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={`flex border-b border-sand-200 last:border-b-0 ${wide ? 'col-span-2' : ''}`}>
      <div className="bg-sand-50 text-[10px] text-sand-500 tracking-widest w-24 flex-shrink-0 px-3 py-2.5 flex items-center border-r border-sand-200">
        {label}
      </div>
      <div className="px-3 py-2.5 text-sm text-[#2A2520] flex-1">{value}</div>
    </div>
  )
}
