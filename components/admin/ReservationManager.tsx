'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import AdminTopNav from './AdminTopNav'

// ─── 型 ───────────────────────────────────────────────────────
type Status = 'confirmed' | 'completed' | 'cancelled'

type Reservation = {
  id: string
  member_id: string | null
  menu_id: string
  menu_name: string
  date: string
  time: string
  block_minutes: number
  status: Status
  created_at: string
  stylist_id?: string | null
  source?: string | null
  guest_name?: string | null
  hp_reservation_id?: string | null
  members: { name: string; phone: string } | null
}

type Stylist = {
  id: string
  name: string
  is_free: boolean
  active: boolean
  display_order: number
}

type BlockedSlot = {
  id: string
  date: string
  time: string
  block_minutes: number
  reason: string | null
}

// ─── 定数 ─────────────────────────────────────────────────────
const DAY_START    = 9 * 60    // 9:00
const DAY_END      = 24 * 60   // 24:00（セルは24時まで、ラベルは23時まで）
const HOURS        = (DAY_END - DAY_START) / 60  // 15
const SLOT_W_STD   = 108       // px / 1時間（標準）
const SLOT_W_SHORT = 66        // px / 1時間（短縮）
const ROW_H        = 72        // px / 行高さ
const LABEL_W      = 88        // px / 左ラベル列

const DEFAULT_STYLISTS: Stylist[] = [
  { id: 'fujino', name: '藤野 翔', is_free: false, active: true, display_order: 0 },
  { id: 'free',   name: 'フリー',  is_free: true,  active: true, display_order: 99 },
]

// 時間ラベル（1時間ごと、09:00〜18:00）
const HOUR_LABELS: string[] = Array.from({ length: HOURS }, (_, i) => {
  const h = Math.floor(DAY_START / 60) + i
  return `${String(h).padStart(2, '0')}:00`
})

const DOW = ['日', '月', '火', '水', '木', '金', '土']

type AdminMenuItem = { id: string; name: string; price_label: string; block_minutes: number }
const ADMIN_MENUS: AdminMenuItem[] = [
  { id: 'cut',                 name: 'カット',                             price_label: '¥4,500',        block_minutes: 90 },
  { id: 'bang_cut',            name: '前髪カット',                         price_label: '¥700',          block_minutes: 30 },
  { id: 'color',               name: 'カラー',                             price_label: '¥6,300〜',      block_minutes: 120 },
  { id: 'highlight',           name: 'テクニカルカラー',                   price_label: '¥3,800〜6,800', block_minutes: 120 },
  { id: 'perm',                name: 'パーマ',                             price_label: '¥7,300〜',      block_minutes: 120 },
  { id: 'straight',            name: '縮毛矯正',                           price_label: '¥13,800〜',     block_minutes: 240 },
  { id: 'treatment_s',         name: 'トリートメント',                     price_label: '¥4,500',        block_minutes: 60 },
  { id: 'treatment_premium_s', name: 'プレミアムトリートメント',           price_label: '¥7,000',        block_minutes: 90 },
  { id: 'head_spa_s',          name: 'ヘッドスパ (20分)',                  price_label: '¥5,000',        block_minutes: 60 },
  { id: 'head_spa_30_s',       name: 'ヘッドスパ (30分)',                  price_label: '¥6,000',        block_minutes: 60 },
  { id: 'head_spa_60_s',       name: 'ヘッドスパ (60分)',                  price_label: '¥9,000',        block_minutes: 90 },
  { id: 'cut_tr',              name: 'カット＋トリートメント',             price_label: '¥5,500',        block_minutes: 120 },
  { id: 'cut_color_tr',        name: 'カット＋カラー＋トリートメント',     price_label: '¥11,500',       block_minutes: 210 },
  { id: 'cut_str_tr',          name: 'カット＋縮毛矯正＋トリートメント',   price_label: '¥17,800',       block_minutes: 300 },
  { id: 'cut_spa',             name: 'カット＋ヘッドスパ (20分)',          price_label: '¥8,500',        block_minutes: 120 },
]

const TIME_OPTIONS: string[] = Array.from({ length: (22 - 9) * 2 + 1 }, (_, i) => {
  const m = 9 * 60 + i * 30
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
})

const STATUS_STYLE: Record<Status, string> = {
  confirmed: 'bg-shore text-cream',
  completed:  'bg-sand-400 text-cream',
  cancelled:  'bg-sand-100 text-sand-300 line-through',
}
const STATUS_BADGE: Record<Status, string> = {
  confirmed: 'bg-shore/10 text-shore border border-shore/30',
  completed:  'bg-sand-100 text-sand-500',
  cancelled:  'bg-red-50 text-red-400',
}
const STATUS_LABEL: Record<Status, string> = {
  confirmed: '受付待ち',
  completed:  '来店済',
  cancelled:  'キャンセル',
}

// ─── ユーティリティ ────────────────────────────────────────────
function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function formatDateLong(ds: string) {
  const d = new Date(ds + 'T00:00:00')
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${DOW[d.getDay()]}）`
}
function addDays(ds: string, n: number) {
  const d = new Date(ds + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function toDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}
function buildCalendar(year: number, month: number): (number | null)[] {
  const first = new Date(year, month, 1).getDay()
  const days  = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = Array(first).fill(null)
  for (let d = 1; d <= days; d++) cells.push(d)
  return cells
}
function timeToMin(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}
function endTimeStr(time: string, block: number) {
  const total = timeToMin(time) + block
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

// ─── メインコンポーネント ──────────────────────────────────────
export default function ReservationManager() {
  const router = useRouter()
  const [date, setDate]               = useState(todayStr)
  const [viewMode, setViewMode]       = useState<'standard' | 'short'>('standard')
  const [view, setView]               = useState<'schedule' | 'list'>('schedule')
  const [stylists, setStylists]       = useState<Stylist[]>(DEFAULT_STYLISTS)
  const [reservations, setRes]        = useState<Reservation[]>([])
  const [loading, setLoading]         = useState(true)
  const [selected, setSelected]       = useState<Reservation | null>(null)
  const [activeTab, setActiveTab]     = useState('詳細')
  const [updating, setUpdating]       = useState(false)
  const [cancelConfirm, setCancelConfirm] = useState(false)
  const [weeklyStaff, setWeeklyStaff] = useState<Stylist | null>(null)
  const [weeklyRes, setWeeklyRes]     = useState<Record<string, Reservation[]>>({})
  const [weeklyLoading, setWeeklyLoading] = useState(false)
  const [listTab, setListTab]         = useState<'search' | 'all' | 'unread' | Status>('search')
  // 全日付横断の未読予約（グローバル）
  const [allUnread, setAllUnread]     = useState<Reservation[]>([])
  // 予約一覧用：全件（全日付・全ステータス）
  const [allReservations, setAllRes]  = useState<Reservation[]>([])
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([])
  const [containerW, setContainerW]   = useState(0)
  const [newResModal, setNewResModal] = useState<{ stylist: Stylist; time: string } | null>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [hpSyncing, setHpSyncing] = useState(false)
  const [hpLastSync, setHpLastSync] = useState<string | null>(null)
  const mainAreaRef = useRef<HTMLDivElement>(null)

  // localStorage で既読IDを永続管理
  const READ_KEY = 'beach_admin_read_ids'
  function getReadIds(): Set<string> {
    try { return new Set(JSON.parse(localStorage.getItem(READ_KEY) ?? '[]')) }
    catch { return new Set() }
  }
  function saveReadIds(ids: Set<string>) {
    localStorage.setItem(READ_KEY, JSON.stringify([...ids]))
  }

  useEffect(() => {
    if (!mainAreaRef.current) return
    const ro = new ResizeObserver(([e]) => setContainerW(e.contentRect.width))
    ro.observe(mainAreaRef.current)
    return () => ro.disconnect()
  }, [])

  const slotW = viewMode === 'standard'
    ? SLOT_W_STD
    : containerW > 0 ? Math.floor((containerW - LABEL_W) / HOURS) : SLOT_W_SHORT

  // 全日付横断の未読を取得・更新
  const fetchAllUnread = useCallback(async () => {
    const res = await fetch('/api/admin/reservations')
    if (!res.ok) return
    const json = await res.json()
    const all: Reservation[] = json.reservations ?? []
    const readIds = getReadIds()
    setAllUnread(all.filter(r => !readIds.has(r.id)))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 予約一覧用：全件（全ステータス含む）
  const fetchAllReservations = useCallback(async () => {
    const res = await fetch('/api/admin/reservations?includeAll=true')
    if (!res.ok) return
    const json = await res.json()
    setAllRes(json.reservations ?? [])
  }, [])

  // 特定日の予約取得
  const fetchRes = useCallback(async (d: string) => {
    setLoading(true)
    const res = await fetch(`/api/admin/reservations?date=${d}`)
    if (res.status === 401) { router.push('/admin/login'); return }
    const json = await res.json()
    setRes(json.reservations ?? [])
    setBlockedSlots(json.blockedSlots ?? [])
    setLoading(false)
  }, [router])

  useEffect(() => {
    fetch('/api/admin/staff').then(r => r.ok ? r.json() : null).then(json => {
      if (json?.stylists?.length) setStylists(json.stylists)
    }).catch(() => {})
    fetchAllUnread()
    fetchAllReservations()
  }, [fetchAllUnread, fetchAllReservations])

  useEffect(() => { fetchRes(date) }, [date, fetchRes])

  // HP手動同期（admin認証済みエンドポイント経由）
  async function runHpSync() {
    setHpSyncing(true)
    try {
      const res = await fetch('/api/admin/hp-sync', { method: 'POST' })
      const json = await res.json()
      const now = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
      setHpLastSync(`${now} (新着${json.inserted ?? 0}件)`)
      if ((json.inserted ?? 0) > 0 || (json.cancelled ?? 0) > 0) {
        fetchRes(date)
        fetchAllUnread()
        fetchAllReservations()
      }
    } catch {
      setHpLastSync('エラー')
    } finally {
      setHpSyncing(false)
    }
  }

  async function updateStatus(id: string, status: Status) {
    setUpdating(true)
    try {
      const res = await fetch('/api/admin/reservations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? '更新に失敗しました')
      }
      setRes(prev => prev.map(r => r.id === id ? { ...r, status } : r))
      if (selected?.id === id) setSelected(prev => prev ? { ...prev, status } : null)
    } catch (e) {
      alert(`更新に失敗しました\n${(e as Error).message ?? ''}`)
    } finally {
      setUpdating(false)
    }
  }

  async function moveReservation(id: string, time: string, stylistId: string | null) {
    setRes(prev => prev.map(r => r.id === id ? { ...r, time, stylist_id: stylistId } : r))
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, time, stylist_id: stylistId } : null)
    await fetch('/api/admin/reservations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, time, stylist_id: stylistId }),
    })
  }

  async function updateBlockMinutes(id: string, block_minutes: number) {
    await fetch('/api/admin/reservations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, block_minutes }),
    })
    setRes(prev => prev.map(r => r.id === id ? { ...r, block_minutes } : r))
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, block_minutes } : null)
  }

  async function leftResizeReservation(id: string, time: string, block_minutes: number) {
    await fetch('/api/admin/reservations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, time, block_minutes }),
    })
    setRes(prev => prev.map(r => r.id === id ? { ...r, time, block_minutes } : r))
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, time, block_minutes } : null)
  }

  async function updateBlockedSlot(id: string, updates: { time?: string; block_minutes?: number }) {
    setBlockedSlots(prev => prev.map(bs => bs.id === id ? { ...bs, ...updates } : bs))
    await fetch('/api/admin/blocked_slots', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    })
  }

  async function deleteBlockedSlot(id: string) {
    setBlockedSlots(prev => prev.filter(bs => bs.id !== id))
    await fetch(`/api/admin/blocked_slots?id=${id}`, { method: 'DELETE' })
  }

  function openPopup(r: Reservation) { setSelected(r); setActiveTab('詳細'); setCancelConfirm(false) }
  function closePopup() { setSelected(null); setCancelConfirm(false) }

  function getResForStylist(s: Stylist) {
    return s.is_free
      ? reservations.filter(r => !r.stylist_id && r.status !== 'cancelled')
      : reservations.filter(r => r.stylist_id === s.id && r.status !== 'cancelled')
  }

  function markAsRead(id: string) {
    const ids = getReadIds(); ids.add(id); saveReadIds(ids)
    setAllUnread(prev => prev.filter(r => r.id !== id))
  }
  function markAllAsRead() {
    const ids = getReadIds()
    allUnread.forEach(r => ids.add(r.id)); saveReadIds(ids)
    setAllUnread([])
  }

  async function openWeeklyView(stylist: Stylist) {
    setWeeklyStaff(stylist)
    setWeeklyLoading(true)
    closePopup()
    const days = Array.from({ length: 7 }, (_, i) => addDays(date, i))
    const results = await Promise.all(
      days.map(d =>
        fetch(`/api/admin/reservations?date=${d}`)
          .then(r => r.ok ? r.json() : { reservations: [] })
          .catch(() => ({ reservations: [] }))
      )
    )
    const map: Record<string, Reservation[]> = {}
    days.forEach((d, i) => { map[d] = results[i].reservations ?? [] })
    setWeeklyRes(map)
    setWeeklyLoading(false)
  }

  const counts = {
    total:     reservations.length,
    confirmed: reservations.filter(r => r.status === 'confirmed').length,
    completed: reservations.filter(r => r.status === 'completed').length,
    cancelled: reservations.filter(r => r.status === 'cancelled').length,
  }

  const quickDates = Array.from({ length: 13 }, (_, i) => addDays(date, i - 6))

  return (
    <div className="h-screen flex flex-col bg-sand-100 select-none"
      onClick={(e) => { if (!(e.target as HTMLElement).closest('[data-popup]')) closePopup() }}>

      <AdminTopNav />

      {/* ── サブヘッダー ── */}
      <header className="bg-[#3a3430] text-cream px-5 py-2 flex items-center gap-3 flex-shrink-0">
        {weeklyStaff ? (
          <>
            <button onClick={() => { setWeeklyStaff(null); setWeeklyRes({}) }}
              className="text-[11px] border border-cream/30 px-3 py-1.5 rounded hover:bg-white/15 transition-colors">
              ◀ 戻る
            </button>
            <span className="text-sm font-medium">{weeklyStaff.name} の週間スケジュール</span>
            <span className="text-xs text-cream/50 ml-1">
              {date.replace(/-/g, '/')}〜{addDays(date, 6).replace(/-/g, '/')}
            </span>
          </>
        ) : (
          <>
            <div className="flex items-center gap-1">
              <button onClick={() => setDate(d => addDays(d, -1))}
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/15 transition-colors text-sm">◀</button>
              <div className="relative">
                <button
                  onClick={() => setShowDatePicker(v => !v)}
                  className="text-sm font-medium px-2 min-w-[190px] text-center hover:bg-white/15 rounded py-1 transition-colors">
                  {formatDateLong(date)}
                </button>
                {showDatePicker && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowDatePicker(false)} />
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 shadow-2xl bg-white rounded">
                      <MiniCalendar
                        value={date}
                        onChange={(d) => { setDate(d); setShowDatePicker(false) }}
                      />
                    </div>
                  </>
                )}
              </div>
              <button onClick={() => setDate(d => addDays(d, 1))}
                className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/15 transition-colors text-sm">▶</button>
            </div>
            <button onClick={() => setDate(todayStr())}
              className="text-[11px] border border-cream/30 px-3 py-1.5 rounded hover:bg-white/15 transition-colors">
              今日
            </button>
            {/* 標準/短縮 */}
            <div className="flex rounded overflow-hidden border border-cream/30 text-[11px]">
              <button onClick={() => setViewMode('standard')}
                className={`px-3 py-1.5 transition-colors ${
                  viewMode === 'standard' ? 'bg-cream/20 text-cream' : 'text-cream/50 hover:text-cream/80'
                }`}>標準</button>
              <button onClick={() => setViewMode('short')}
                className={`px-3 py-1.5 border-l border-cream/30 transition-colors ${
                  viewMode === 'short' ? 'bg-cream/20 text-cream' : 'text-cream/50 hover:text-cream/80'
                }`}>短縮</button>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {/* HP手動同期ボタン */}
              <div className="flex flex-col items-end">
                <button
                  onClick={runHpSync}
                  disabled={hpSyncing}
                  className="text-[11px] bg-orange-500/80 border border-orange-300/40 px-4 py-1.5 rounded hover:bg-orange-500 transition-colors text-white disabled:opacity-50"
                >
                  {hpSyncing ? '同期中...' : 'HP同期'}
                </button>
                {hpLastSync && (
                  <span className="text-[9px] text-cream/50 mt-0.5">{hpLastSync}</span>
                )}
              </div>
              <button onClick={() => { fetchRes(date); fetchAllUnread(); fetchAllReservations() }}
                className="text-[11px] bg-cream/10 border border-cream/30 px-4 py-1.5 rounded hover:bg-cream/20 transition-colors">
                更新
              </button>
            </div>
          </>
        )}
      </header>

      {/* ── 予約アラート ── */}
      {!weeklyStaff && (
        <div
          onClick={() => {
            if (allUnread.length > 0) { setView('list'); setListTab('unread') }
          }}
          className={`flex items-center gap-2.5 px-5 py-1.5 flex-shrink-0 transition-colors ${
            allUnread.length > 0
              ? 'bg-red-600 cursor-pointer hover:bg-red-700'
              : 'bg-[#c8bdb2]'
          }`}>
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
            allUnread.length > 0 ? 'bg-white animate-pulse' : 'bg-white/40'
          }`} />
          <span className={`text-[11px] font-medium tracking-wider ${
            allUnread.length > 0 ? 'text-white' : 'text-white/60'
          }`}>
            {allUnread.length > 0
              ? `予約アラート　未読の予約が ${allUnread.length} 件あります　→ クリックして確認`
              : '予約アラート'}
          </span>
        </div>
      )}

      {/* ── サブタブ + 集計 ── */}
      {!weeklyStaff && (
        <div className="bg-white border-b border-sand-200 flex items-center flex-shrink-0">
          <div className="flex">
            {(['schedule', 'list'] as const).map((v) => (
              <button key={v} onClick={() => {
                  setView(v)
                  if (v === 'schedule') setListTab('search')
                }}
                className={`px-5 py-2.5 text-[11px] tracking-[0.15em] border-b-2 transition-colors ${
                  view === v
                    ? 'border-shore text-shore font-semibold'
                    : 'border-transparent text-sand-400 hover:text-sand-500'
                }`}>
                {v === 'schedule' ? 'スケジュール' : '予約一覧'}
              </button>
            ))}
          </div>
          <div className="ml-auto flex gap-5 px-5 text-[11px] text-sand-400">
            <span>計 <strong className="text-shore">{counts.total}</strong>件</span>
            <span>確定 <strong className="text-shore">{counts.confirmed}</strong></span>
            <span>来店済 <strong className="text-sand-500">{counts.completed}</strong></span>
            <span>キャンセル <strong className="text-red-400">{counts.cancelled}</strong></span>
          </div>
        </div>
      )}

      {/* ── メインエリア ── */}
      <div ref={mainAreaRef} className="flex-1 overflow-hidden relative">
        {loading && !weeklyStaff ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-sand-400 tracking-wider">読み込み中...</p>
          </div>
        ) : weeklyStaff ? (
          <WeeklyView
            stylist={weeklyStaff}
            date={date}
            weeklyRes={weeklyRes}
            loading={weeklyLoading}
            slotW={slotW}
            selected={selected}
            onSelect={openPopup}
          />
        ) : view === 'schedule' ? (
          <ScheduleView
            stylists={stylists}
            getResForStylist={getResForStylist}
            selected={selected}
            onSelect={openPopup}
            slotW={slotW}
            onStaffClick={openWeeklyView}
            onResize={updateBlockMinutes}
            onLeftResize={leftResizeReservation}
            onMove={moveReservation}
            onBsUpdate={updateBlockedSlot}
            onBsDelete={deleteBlockedSlot}
            onNewRes={(stylist, time) => { closePopup(); setNewResModal({ stylist, time }) }}
            date={date}
            blockedSlots={blockedSlots}
          />
        ) : (
          <ListView
            reservations={allReservations}
            allUnread={allUnread}
            stylists={stylists}
            onStatusChange={updateStatus}
            updating={updating}
            tab={listTab}
            onTabChange={setListTab}
            onMarkAsRead={markAsRead}
            onMarkAllAsRead={markAllAsRead}
          />
        )}

        {/* 新規登録モーダル */}
        {newResModal && (
          <NewReservationModal
            stylists={stylists}
            date={date}
            defaultStylistId={newResModal.stylist.is_free ? '' : newResModal.stylist.id}
            defaultTime={newResModal.time}
            onClose={() => setNewResModal(null)}
            onSaved={() => { setNewResModal(null); fetchRes(date); fetchAllUnread(); fetchAllReservations() }}
          />
        )}

        {/* 予約ポップアップ */}
        {selected && (
          <div data-popup className="absolute top-4 left-1/2 -translate-x-1/2 z-50 w-[380px]"
            onClick={e => e.stopPropagation()}>
            <ReservationPopup
              reservation={selected}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onClose={closePopup}
              onStatusChange={updateStatus}
              cancelConfirm={cancelConfirm}
              onCancelRequest={() => setCancelConfirm(true)}
              onCancelExecute={async () => { await updateStatus(selected.id, 'cancelled'); closePopup() }}
              onCancelAbort={() => setCancelConfirm(false)}
              updating={updating}
            />
          </div>
        )}
      </div>

      {/* ── 下部日付ナビ ── */}
      {!weeklyStaff && (
        <div className="bg-white border-t border-sand-200 flex items-center px-3 py-2 gap-1 overflow-x-auto flex-shrink-0">
          <button onClick={() => setDate(d => addDays(d, -7))}
            className="text-xs text-sand-400 hover:text-shore px-2 flex-shrink-0">◀</button>
          {quickDates.map((d) => {
            const dt = new Date(d + 'T00:00:00')
            const dow = DOW[dt.getDay()]
            const isToday    = d === todayStr()
            const isSelected = d === date
            const isSun = dt.getDay() === 0
            const isSat = dt.getDay() === 6
            return (
              <button key={d} onClick={() => setDate(d)}
                className={`flex flex-col items-center px-2.5 py-1 rounded text-xs flex-shrink-0 min-w-[44px] transition-colors ${
                  isSelected ? 'bg-shore text-cream' : 'hover:bg-sand-100'
                } ${!isSelected && isSun ? 'text-red-400' : ''} ${!isSelected && isSat ? 'text-blue-400' : ''}`}>
                <span className={`text-[9px] ${isSelected ? 'text-cream/70' : 'text-sand-400'}`}>{dow}</span>
                <span className="font-medium leading-tight">{dt.getDate()}</span>
                {isToday && !isSelected && <div className="w-1 h-1 rounded-full bg-shore mt-0.5" />}
              </button>
            )
          })}
          <button onClick={() => setDate(d => addDays(d, 7))}
            className="text-xs text-sand-400 hover:text-shore px-2 flex-shrink-0">▶</button>
        </div>
      )}
    </div>
  )
}

// ─── 時間ヘッダー（共通） ──────────────────────────────────────
function TimeHeader({ slotW }: { slotW: number }) {
  return (
    <div className="flex sticky top-0 z-20 bg-sand-50 border-b-2 border-sand-200">
      <div style={{ width: LABEL_W, minWidth: LABEL_W }}
        className="sticky left-0 z-30 bg-sand-50 border-r-2 border-sand-200 flex-shrink-0" />
      {HOUR_LABELS.map((t) => (
        <div key={t} style={{ width: slotW, minWidth: slotW }}
          className="relative flex-shrink-0 border-r border-sand-300 py-2 overflow-hidden">
          <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[11px] text-sand-500 font-medium whitespace-nowrap">
            {t}
          </span>
          {/* 30分点線 */}
          <div className="absolute top-0 bottom-0 border-r border-dashed border-sand-200"
            style={{ left: slotW / 2 }} />
        </div>
      ))}
    </div>
  )
}

// ─── グリッド縦線（共通） ──────────────────────────────────────
function GridLines({ slotW }: { slotW: number }) {
  return (
    <>
      {HOUR_LABELS.map((_, i) => (
        <div key={`solid-${i}`} className="absolute top-0 bottom-0 border-r border-sand-300"
          style={{ left: i * slotW }} />
      ))}
      {/* 右端の閉じ線（24:00境界） */}
      <div className="absolute top-0 bottom-0 border-r-2 border-sand-300"
        style={{ left: HOURS * slotW }} />
      {HOUR_LABELS.map((_, i) => (
        <div key={`dash-${i}`} className="absolute top-0 bottom-0 border-r border-dashed border-sand-200"
          style={{ left: i * slotW + slotW / 2 }} />
      ))}
    </>
  )
}

// ─── 残り受付可能数 行 ──────────────────────────────────────────
function CapacityRows({ slotW, date, allReservations, blockedSlots }: {
  slotW: number
  date: string
  allReservations: Reservation[]
  blockedSlots: BlockedSlot[]
}) {
  // 30分刻みの時刻キー（"HH:MM"）。受付可能枠はホットペッパーと同じく30分単位で設定する
  const halfSlots = Array.from({ length: HOURS * 2 }, (_, i) => {
    const m = DAY_START + i * 30
    return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
  })
  const halfSlotW = slotW / 2
  const [expanded, setExpanded] = useState(false)
  const [saved, setSaved] = useState<Record<string, number>>({})
  const [editing, setEditing] = useState<Record<string, number>>({})
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    fetch(`/api/admin/slot-capacity?date=${date}`)
      .then(r => r.json())
      .then(data => { setSaved(data); setEditing(data) })
      .catch(() => {})
  }, [date])

  function countAtSlot(t: string) {
    const startMin = timeToMin(t)
    const endMin = startMin + 30
    return allReservations.filter(r => {
      const rs = timeToMin(r.time)
      return rs < endMin && rs + r.block_minutes > startMin
    }).length
  }

  // 予約・終日ブロック問わず「枠が埋まっているか」（藤野翔とフリーは同一枠なので合算）
  function isOccupiedAtSlot(t: string) {
    if (countAtSlot(t) > 0) return true
    const startMin = timeToMin(t)
    const endMin = startMin + 30
    return blockedSlots.some(bs => {
      const bs_ = timeToMin(bs.time)
      return bs_ < endMin && bs_ + bs.block_minutes > startMin
    })
  }

  function defaultCapacity(t: string) {
    return isOccupiedAtSlot(t) ? 0 : 1
  }

  function handleChange(t: string, delta: number) {
    setEditing(prev => {
      const base = prev[t] !== undefined ? prev[t] : defaultCapacity(t)
      return { ...prev, [t]: Math.max(0, base + delta) }
    })
  }

  async function handleSave() {
    const res = await fetch('/api/admin/slot-capacity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, capacities: editing }),
    })
    if (!res.ok) { alert('保存に失敗しました'); return }
    setSaved({ ...editing })
    setShowConfirm(false)
    setExpanded(false)
  }

  return (
    <>
      {/* 予約数 row */}
      <div className="flex border-b border-sand-200 bg-sand-50/60">
        <div style={{ width: LABEL_W, minWidth: LABEL_W }}
          className="sticky left-0 z-10 bg-sand-50 border-r-2 border-sand-300 flex-shrink-0 flex items-center justify-center py-1">
          <span className="text-[10px] text-sand-400 tracking-wide">予約数</span>
        </div>
        {halfSlots.map((t, i) => (
          <div key={t} style={{ width: halfSlotW, minWidth: halfSlotW }}
            className={`flex items-center justify-center border-r py-1 ${i % 2 === 0 ? 'border-dashed border-sand-200' : 'border-solid border-sand-200'}`}>
            <span className="text-[11px] text-sand-500">{countAtSlot(t)}</span>
          </div>
        ))}
      </div>

      {/* 残り受付可能数 row — 折りたたみ状態 */}
      {!expanded && (
        <div className="flex border-b-2 border-sand-200 bg-sand-50/60">
          <div style={{ width: LABEL_W, minWidth: LABEL_W }}
            className="sticky left-0 z-10 bg-sand-50 border-r-2 border-sand-300 flex-shrink-0 flex items-center justify-between px-1.5 py-1">
            <span className="text-[9px] text-sand-400 tracking-wide leading-tight">残り受付<br/>可能数</span>
            <button onClick={() => setExpanded(true)}
              className="text-sand-400 hover:text-shore text-[10px] ml-1">▼</button>
          </div>
          {halfSlots.map((t, i) => {
            const val = saved[t] !== undefined ? saved[t] : defaultCapacity(t)
            return (
              <div key={t} style={{ width: halfSlotW, minWidth: halfSlotW }}
                className={`flex items-center justify-center border-r py-1 ${i % 2 === 0 ? 'border-dashed border-sand-200' : 'border-solid border-sand-200'}`}>
                <span className={`text-[11px] font-medium ${val === 0 ? 'text-red-500' : 'text-shore'}`}>{val}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* 残り受付可能数 row — +/- 編集状態 */}
      {expanded && (
        <div className="flex border-b-2 border-shore/30 bg-sand-50/60">
          <div style={{ width: LABEL_W, minWidth: LABEL_W }}
            className="sticky left-0 z-10 bg-sand-50 border-r-2 border-sand-300 flex-shrink-0 flex flex-col items-center justify-center gap-1.5 py-1.5">
            <button onClick={() => { setEditing({ ...saved }); setExpanded(false) }}
              className="text-[10px] px-3 py-0.5 border border-sand-300 rounded bg-white hover:bg-sand-50 text-sand-500 w-14">
              戻す
            </button>
            <button onClick={() => setShowConfirm(true)}
              className="text-[10px] px-3 py-0.5 border border-shore rounded bg-shore text-white hover:bg-shore/80 w-14">
              設定
            </button>
          </div>
          {halfSlots.map((t, i) => {
            const val = editing[t] !== undefined ? editing[t] : defaultCapacity(t)
            return (
              <div key={t} style={{ width: halfSlotW, minWidth: halfSlotW }}
                className={`flex flex-col items-center border-r py-0.5 gap-px ${i % 2 === 0 ? 'border-dashed border-sand-200' : 'border-solid border-sand-200'}`}>
                <button onClick={() => handleChange(t, 1)}
                  className="w-full text-[11px] bg-shore/70 hover:bg-shore text-white leading-none py-0.5 font-bold">＋</button>
                <span className={`text-[12px] font-bold py-0.5 ${val === 0 ? 'text-red-500' : 'text-shore'}`}>{val}</span>
                <button onClick={() => handleChange(t, -1)}
                  className="w-full text-[11px] bg-shore/70 hover:bg-shore text-white leading-none py-0.5 font-bold">−</button>
              </div>
            )
          })}
        </div>
      )}

      {/* 確認ダイアログ */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl shadow-xl p-6 w-80">
            <p className="text-sm text-shore mb-6">残り受付可能数を設定します。よろしいですか？</p>
            <div className="flex justify-end gap-4">
              <button onClick={() => setShowConfirm(false)}
                className="text-sm text-sand-400 px-4 py-2 hover:text-shore">キャンセル</button>
              <button onClick={handleSave}
                className="text-sm text-shore font-medium px-4 py-2 hover:underline">OK</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── レーン割り当て（重複予約を縦に積み上げる） ──────────────────
function assignLanes(rList: Reservation[], overrides: Record<string, number>): Map<string, number> {
  const sorted = [...rList].sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? ''))
  const laneEnds: number[] = []
  const map = new Map<string, number>()
  for (const r of sorted) {
    const start = timeToMin(r.time)
    const end = start + (overrides[r.id] ?? r.block_minutes)
    let lane = laneEnds.findIndex(e => e <= start)
    if (lane === -1) lane = laneEnds.length
    laneEnds[lane] = end
    map.set(r.id, lane)
  }
  return map
}

// ─── スケジュールビュー ────────────────────────────────────────
function assignBsLanes(bsList: BlockedSlot[], overrides: Record<string, number>): Map<string, number> {
  const laneEnds: number[] = []
  const map = new Map<string, number>()
  for (const bs of bsList) {
    const start = timeToMin(bs.time)
    const end = start + (overrides[bs.id] ?? bs.block_minutes)
    let lane = laneEnds.findIndex(e => e <= start)
    if (lane === -1) lane = laneEnds.length
    laneEnds[lane] = end
    map.set(bs.id, lane)
  }
  return map
}

type LaneEntry = { id: string; start: number; end: number }
function assignLanesGeneric(items: LaneEntry[]): Map<string, number> {
  const sorted = [...items].sort((a, b) => a.start - b.start)
  const laneEnds: number[] = []
  const map = new Map<string, number>()
  for (const item of sorted) {
    let lane = laneEnds.findIndex(e => e <= item.start)
    if (lane === -1) lane = laneEnds.length
    laneEnds[lane] = item.end
    map.set(item.id, lane)
  }
  return map
}

function ScheduleView({
  stylists, getResForStylist, selected, onSelect, slotW, onStaffClick, onResize, onLeftResize, onMove, onBsUpdate, onBsDelete, onNewRes, date, blockedSlots,
}: {
  stylists: Stylist[]
  getResForStylist: (s: Stylist) => Reservation[]
  selected: Reservation | null
  onSelect: (r: Reservation) => void
  slotW: number
  onStaffClick: (s: Stylist) => void
  onResize: (id: string, block_minutes: number) => void
  onLeftResize: (id: string, time: string, block_minutes: number) => void
  onMove: (id: string, time: string, stylistId: string | null) => void
  onBsUpdate: (id: string, updates: { time?: string; block_minutes?: number }) => void
  onBsDelete: (id: string) => void
  onNewRes: (stylist: Stylist, time: string) => void
  date: string
  blockedSlots: BlockedSlot[]
}) {
  const totalW  = HOURS * slotW
  const isThuDay = new Date(date + 'T00:00:00').getDay() === 4

  // ドラッグ中の情報はrefで管理（stale closure回避）
  const dragRef = useRef<{
    id: string
    time: string
    startX: number
    startBlock: number
    maxBlock: number
    currentBlock: number
  } | null>(null)
  const justResizedRef = useRef(false)
  // 描画用のライブblock_minutes（id → minutes）
  const [liveBlocks, setLiveBlocks] = useState<Record<string, number>>({})
  const [resizeConfirm, setResizeConfirm] = useState<{ id: string; time: string; oldBlock: number; newBlock: number } | null>(null)

  // 左端リサイズ
  const leftDragRef = useRef<{
    id: string; origTime: string; origBlock: number
    startX: number; currentTime: string; currentBlock: number
  } | null>(null)
  const [liveLeftResizes, setLiveLeftResizes] = useState<Record<string, { time: string; block: number }>>({})
  const [leftResizeConfirm, setLeftResizeConfirm] = useState<{ id: string; origTime: string; origBlock: number; newTime: string; newBlock: number } | null>(null)

  // 移動ドラッグ
  const moveRef = useRef<{
    id: string
    reservation: Reservation
    startX: number
    startY: number
    startMin: number
    currentMin: number
    currentStylistId: string | null
    moved: boolean
  } | null>(null)
  const justMovedRef = useRef(false)
  const [liveMove, setLiveMove] = useState<{ reservation: Reservation; time: string; stylistId: string | null } | null>(null)
  const [moveConfirm, setMoveConfirm] = useState<{ id: string; reservation: Reservation; newTime: string; newStylistId: string | null } | null>(null)

  // blocked_slots 用 resize/move
  const bsDragRef = useRef<{ id: string; time: string; startX: number; startBlock: number; maxBlock: number; currentBlock: number } | null>(null)
  const [liveBsBlocks, setLiveBsBlocks] = useState<Record<string, number>>({})
  const [bsResizeConfirm, setBsResizeConfirm] = useState<{ id: string; time: string; oldBlock: number; newBlock: number } | null>(null)
  const bsMoveRef = useRef<{ id: string; bs: BlockedSlot; startX: number; startY: number; startMin: number; currentMin: number; moved: boolean } | null>(null)
  const [liveBsMove, setLiveBsMove] = useState<{ bs: BlockedSlot; time: string } | null>(null)
  const [bsMoveConfirm, setBsMoveConfirm] = useState<{ id: string; bs: BlockedSlot; newTime: string } | null>(null)
  const [selectedBs, setSelectedBs] = useState<BlockedSlot | null>(null)

  // ブロック枠 左端リサイズ
  const bsLeftDragRef = useRef<{
    id: string; origTime: string; origBlock: number
    startX: number; currentTime: string; currentBlock: number
  } | null>(null)
  const [liveLeftBsResizes, setLiveLeftBsResizes] = useState<Record<string, { time: string; block: number }>>({})
  const [bsLeftResizeConfirm, setBsLeftResizeConfirm] = useState<{ id: string; origTime: string; origBlock: number; newTime: string; newBlock: number } | null>(null)

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragRef.current) return
      const { id, startX, startBlock, maxBlock } = dragRef.current
      const deltaPx = e.clientX - startX
      const deltaMin = Math.round(deltaPx / slotW * 60 / 30) * 30
      const newBlock = Math.max(30, Math.min(maxBlock, startBlock + deltaMin))
      dragRef.current.currentBlock = newBlock
      setLiveBlocks(prev => ({ ...prev, [id]: newBlock }))
    }

    function onUp() {
      if (!dragRef.current) return
      const { id, time, startBlock, currentBlock } = dragRef.current
      dragRef.current = null
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      justResizedRef.current = true
      if (currentBlock === startBlock) {
        setLiveBlocks(prev => { const n = { ...prev }; delete n[id]; return n })
        return
      }
      setResizeConfirm({ id, time, oldBlock: startBlock, newBlock: currentBlock })
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [slotW, onResize])

  useEffect(() => {
    function onLeftMove(e: MouseEvent) {
      if (!leftDragRef.current) return
      const { origTime, origBlock, startX } = leftDragRef.current
      const origStartMin = timeToMin(origTime)
      const origEndMin = origStartMin + origBlock
      const deltaPx = e.clientX - startX
      const deltaMin = Math.round(deltaPx / slotW * 60 / 30) * 30
      const newStartMin = Math.max(DAY_START, Math.min(origStartMin + origBlock - 30, origStartMin + deltaMin))
      const newBlock = origEndMin - newStartMin
      const h = Math.floor(newStartMin / 60)
      const m = newStartMin % 60
      const newTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      leftDragRef.current.currentTime = newTime
      leftDragRef.current.currentBlock = newBlock
      setLiveLeftResizes(prev => ({ ...prev, [leftDragRef.current!.id]: { time: newTime, block: newBlock } }))
    }
    function onLeftUp() {
      if (!leftDragRef.current) return
      const { id, origTime, origBlock, currentTime, currentBlock } = leftDragRef.current
      leftDragRef.current = null
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      justResizedRef.current = true
      if (currentTime === origTime) {
        setLiveLeftResizes(prev => { const n = { ...prev }; delete n[id]; return n })
        return
      }
      setLeftResizeConfirm({ id, origTime, origBlock, newTime: currentTime, newBlock: currentBlock })
    }
    window.addEventListener('mousemove', onLeftMove)
    window.addEventListener('mouseup', onLeftUp)
    return () => {
      window.removeEventListener('mousemove', onLeftMove)
      window.removeEventListener('mouseup', onLeftUp)
    }
  }, [slotW, onLeftResize])

  useEffect(() => {
    function onBsResizeMove(e: MouseEvent) {
      if (!bsDragRef.current) return
      const { id, startX, startBlock, maxBlock } = bsDragRef.current
      const deltaPx = e.clientX - startX
      const deltaMin = Math.round(deltaPx / slotW * 60 / 30) * 30
      const newBlock = Math.max(30, Math.min(maxBlock, startBlock + deltaMin))
      bsDragRef.current.currentBlock = newBlock
      setLiveBsBlocks(prev => ({ ...prev, [id]: newBlock }))
    }
    function onBsResizeUp() {
      if (!bsDragRef.current) return
      const { id, time, startBlock, currentBlock } = bsDragRef.current
      bsDragRef.current = null
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      justResizedRef.current = true
      if (currentBlock === startBlock) {
        setLiveBsBlocks(prev => { const n = { ...prev }; delete n[id]; return n })
        return
      }
      setBsResizeConfirm({ id, time, oldBlock: startBlock, newBlock: currentBlock })
    }
    window.addEventListener('mousemove', onBsResizeMove)
    window.addEventListener('mouseup', onBsResizeUp)
    return () => {
      window.removeEventListener('mousemove', onBsResizeMove)
      window.removeEventListener('mouseup', onBsResizeUp)
    }
  }, [slotW])

  useEffect(() => {
    function getStylistIdAtPoint(x: number, y: number): string | null | undefined {
      const el = document.elementFromPoint(x, y)
      const row = el?.closest('[data-stylist-id]')
      if (!row) return undefined
      const val = row.getAttribute('data-stylist-id')
      return val === '' ? null : val
    }

    function onMoveMove(e: MouseEvent) {
      if (!moveRef.current) return
      const { reservation, startX, startY, startMin } = moveRef.current
      const deltaPx = e.clientX - startX
      const deltaMin = Math.round(deltaPx / slotW * 60 / 30) * 30
      const newMin = Math.max(DAY_START, Math.min(DAY_END - reservation.block_minutes, startMin + deltaMin))
      const h = Math.floor(newMin / 60)
      const m = newMin % 60
      const newTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      const stylistAtPoint = getStylistIdAtPoint(e.clientX, e.clientY)
      const newStylistId = stylistAtPoint !== undefined ? stylistAtPoint : moveRef.current.currentStylistId
      const hasMoved = Math.abs(e.clientX - startX) > 5 || Math.abs(e.clientY - startY) > 5
      moveRef.current.moved = hasMoved
      moveRef.current.currentMin = newMin
      moveRef.current.currentStylistId = newStylistId
      if (hasMoved) {
        document.body.style.cursor = 'grabbing'
        setLiveMove(prev =>
          prev?.time === newTime && prev?.stylistId === newStylistId ? prev
            : { reservation, time: newTime, stylistId: newStylistId }
        )
      }
    }

    function onMoveUp() {
      if (!moveRef.current) return
      const { id, reservation, currentMin, currentStylistId, moved } = moveRef.current
      moveRef.current = null
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      setLiveMove(null)
      if (!moved) { onSelect(reservation); return }
      justMovedRef.current = true
      const h = Math.floor(currentMin / 60)
      const m = currentMin % 60
      const newTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      const oldStylistId = reservation.stylist_id ?? null
      if (newTime === reservation.time && currentStylistId === oldStylistId) return
      setMoveConfirm({ id, reservation, newTime, newStylistId: currentStylistId })
    }

    window.addEventListener('mousemove', onMoveMove)
    window.addEventListener('mouseup', onMoveUp)
    return () => {
      window.removeEventListener('mousemove', onMoveMove)
      window.removeEventListener('mouseup', onMoveUp)
    }
  }, [slotW, onSelect])

  useEffect(() => {
    function onBsMoveMove(e: MouseEvent) {
      if (!bsMoveRef.current) return
      const { bs, startX, startY, startMin } = bsMoveRef.current
      const deltaPx = e.clientX - startX
      const deltaMin = Math.round(deltaPx / slotW * 60 / 30) * 30
      const newMin = Math.max(DAY_START, Math.min(DAY_END - bs.block_minutes, startMin + deltaMin))
      const h = Math.floor(newMin / 60)
      const m = newMin % 60
      const newTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      const hasMoved = Math.abs(e.clientX - startX) > 5 || Math.abs(e.clientY - startY) > 5
      bsMoveRef.current.moved = hasMoved
      bsMoveRef.current.currentMin = newMin
      if (hasMoved) {
        document.body.style.cursor = 'grabbing'
        setLiveBsMove(prev => prev?.time === newTime ? prev : { bs, time: newTime })
      }
    }
    function onBsMoveUp() {
      if (!bsMoveRef.current) return
      const { id, bs, currentMin, moved } = bsMoveRef.current
      bsMoveRef.current = null
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      setLiveBsMove(null)
      if (!moved) return
      justMovedRef.current = true
      const h = Math.floor(currentMin / 60)
      const m = currentMin % 60
      const newTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      if (newTime === bs.time) return
      setBsMoveConfirm({ id, bs, newTime })
    }
    window.addEventListener('mousemove', onBsMoveMove)
    window.addEventListener('mouseup', onBsMoveUp)
    return () => {
      window.removeEventListener('mousemove', onBsMoveMove)
      window.removeEventListener('mouseup', onBsMoveUp)
    }
  }, [slotW])

  useEffect(() => {
    function onBsLeftMove(e: MouseEvent) {
      if (!bsLeftDragRef.current) return
      const { origTime, origBlock, startX } = bsLeftDragRef.current
      const origStartMin = timeToMin(origTime)
      const origEndMin = origStartMin + origBlock
      const deltaPx = e.clientX - startX
      const deltaMin = Math.round(deltaPx / slotW * 60 / 30) * 30
      const newStartMin = Math.max(DAY_START, Math.min(origStartMin + origBlock - 30, origStartMin + deltaMin))
      const newBlock = origEndMin - newStartMin
      const h = Math.floor(newStartMin / 60)
      const m = newStartMin % 60
      const newTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      bsLeftDragRef.current.currentTime = newTime
      bsLeftDragRef.current.currentBlock = newBlock
      setLiveLeftBsResizes(prev => ({ ...prev, [bsLeftDragRef.current!.id]: { time: newTime, block: newBlock } }))
    }
    function onBsLeftUp() {
      if (!bsLeftDragRef.current) return
      const { id, origTime, origBlock, currentTime, currentBlock } = bsLeftDragRef.current
      bsLeftDragRef.current = null
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      justResizedRef.current = true
      if (currentTime === origTime) {
        setLiveLeftBsResizes(prev => { const n = { ...prev }; delete n[id]; return n })
        return
      }
      setBsLeftResizeConfirm({ id, origTime, origBlock, newTime: currentTime, newBlock: currentBlock })
    }
    window.addEventListener('mousemove', onBsLeftMove)
    window.addEventListener('mouseup', onBsLeftUp)
    return () => {
      window.removeEventListener('mousemove', onBsLeftMove)
      window.removeEventListener('mouseup', onBsLeftUp)
    }
  }, [slotW])

  function startMove(e: React.MouseEvent, r: Reservation) {
    if (dragRef.current) return
    e.stopPropagation()
    moveRef.current = {
      id: r.id, reservation: r,
      startX: e.clientX, startY: e.clientY,
      startMin: timeToMin(r.time), currentMin: timeToMin(r.time),
      currentStylistId: r.stylist_id ?? null, moved: false,
    }
    document.body.style.userSelect = 'none'
  }

  function startResize(e: React.MouseEvent, r: Reservation) {
    e.stopPropagation()
    e.preventDefault()
    const maxBlock = DAY_END - timeToMin(r.time)
    dragRef.current = { id: r.id, time: r.time, startX: e.clientX, startBlock: r.block_minutes, maxBlock, currentBlock: r.block_minutes }
    setLiveBlocks(prev => ({ ...prev, [r.id]: r.block_minutes }))
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  function startLeftResize(e: React.MouseEvent, r: Reservation) {
    e.stopPropagation()
    e.preventDefault()
    leftDragRef.current = { id: r.id, origTime: r.time, origBlock: r.block_minutes, startX: e.clientX, currentTime: r.time, currentBlock: r.block_minutes }
    setLiveLeftResizes(prev => ({ ...prev, [r.id]: { time: r.time, block: r.block_minutes } }))
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  function startBsMove(e: React.MouseEvent, bs: BlockedSlot) {
    if (bsDragRef.current) return
    e.stopPropagation()
    bsMoveRef.current = {
      id: bs.id, bs,
      startX: e.clientX, startY: e.clientY,
      startMin: timeToMin(bs.time), currentMin: timeToMin(bs.time),
      moved: false,
    }
    document.body.style.userSelect = 'none'
  }

  function startBsResize(e: React.MouseEvent, bs: BlockedSlot) {
    e.stopPropagation()
    e.preventDefault()
    const maxBlock = DAY_END - timeToMin(bs.time)
    bsDragRef.current = { id: bs.id, time: bs.time, startX: e.clientX, startBlock: bs.block_minutes, maxBlock, currentBlock: bs.block_minutes }
    setLiveBsBlocks(prev => ({ ...prev, [bs.id]: bs.block_minutes }))
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  function startBsLeftResize(e: React.MouseEvent, bs: BlockedSlot) {
    e.stopPropagation()
    e.preventDefault()
    bsLeftDragRef.current = { id: bs.id, origTime: bs.time, origBlock: bs.block_minutes, startX: e.clientX, currentTime: bs.time, currentBlock: bs.block_minutes }
    setLiveLeftBsResizes(prev => ({ ...prev, [bs.id]: { time: bs.time, block: bs.block_minutes } }))
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  return (
    <div className="h-full overflow-auto">
      <div style={{ minWidth: LABEL_W + totalW }}>
        <TimeHeader slotW={slotW} />
        <CapacityRows
          slotW={slotW}
          date={date}
          allReservations={stylists.filter(s => s.active).flatMap(s => getResForStylist(s))}
          blockedSlots={blockedSlots}
        />

        {stylists
          .filter(s => s.active)
          .sort((a, b) => a.display_order - b.display_order)
          .map((stylist) => {
            const sRes = getResForStylist(stylist)
            let laneMap: Map<string, number>
            let bsLaneMap: Map<string, number>
            let numLanes: number
            if (stylist.is_free) {
              const combined = assignLanesGeneric([
                ...sRes.map(r => {
                  const ld = liveLeftResizes[r.id]
                  const s = ld ? timeToMin(ld.time) : timeToMin(r.time)
                  const b = ld ? ld.block : (liveBlocks[r.id] ?? r.block_minutes)
                  return { id: `r:${r.id}`, start: s, end: s + b }
                }),
                ...blockedSlots.map(bs => {
                  const ld = liveLeftBsResizes[bs.id]
                  const s = ld ? timeToMin(ld.time) : timeToMin(bs.time)
                  const b = ld ? ld.block : (liveBsBlocks[bs.id] ?? bs.block_minutes)
                  return { id: `bs:${bs.id}`, start: s, end: s + b }
                }),
              ])
              laneMap = new Map(sRes.map(r => [r.id, combined.get(`r:${r.id}`) ?? 0]))
              bsLaneMap = new Map(blockedSlots.map(bs => [bs.id, combined.get(`bs:${bs.id}`) ?? 0]))
              numLanes = combined.size === 0 ? 1 : Math.max(...combined.values()) + 1
            } else {
              laneMap = assignLanes(sRes, liveBlocks)
              bsLaneMap = new Map()
              numLanes = sRes.length === 0 ? 1 : Math.max(...sRes.map(r => (laneMap.get(r.id) ?? 0))) + 1
            }
            const rowH = ROW_H * numLanes
            return (
              <div key={stylist.id} className="flex border-b border-sand-200">
                {/* スタッフ名（sticky・クリックで週間表示） */}
                <div
                  style={{ width: LABEL_W, minWidth: LABEL_W, height: rowH }}
                  className="sticky left-0 z-10 flex-shrink-0 flex flex-col items-center justify-center border-r-2 border-sand-300 px-2 transition-colors bg-white cursor-pointer hover:bg-shore/5 group"
                  onClick={(e) => { e.stopPropagation(); onStaffClick(stylist) }}>
                  <span className="text-[11px] font-medium text-center leading-tight text-shore group-hover:underline">{stylist.name}</span>
                  <span className="text-[10px] text-sand-300 mt-0.5">受付可能数: 1</span>
                </div>

                {/* 予約エリア */}
                <div
                  data-stylist-id={stylist.is_free ? '' : stylist.id}
                  className="relative flex-shrink-0 cursor-cell"
                  style={{ width: totalW, height: rowH }}
                  onClick={(e) => {
                    if (justResizedRef.current) { justResizedRef.current = false; return }
                    if (justMovedRef.current) { justMovedRef.current = false; return }
                    const rect = e.currentTarget.getBoundingClientRect()
                    const x = e.clientX - rect.left
                    const totalMins = Math.floor(x / slotW * 60 / 30) * 30 + DAY_START
                    if (totalMins >= DAY_END) return
                    const h = Math.floor(totalMins / 60)
                    const m = totalMins % 60
                    onNewRes(stylist, `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
                  }}
                >
                  <GridLines slotW={slotW} />
                  {stylist.is_free && <div className="absolute inset-0 bg-sand-50/60" />}
                  {isThuDay && <div className="absolute inset-0 bg-gray-400/40 pointer-events-none" />}

                  {sRes.map((r) => {
                    const liveLeftData = liveLeftResizes[r.id]
                    const baseStartMin = timeToMin(r.time)
                    if (baseStartMin < DAY_START || baseStartMin >= DAY_END) return null
                    const liveBlock = liveLeftData ? liveLeftData.block : (liveBlocks[r.id] ?? r.block_minutes)
                    const isDragging = r.id in liveBlocks
                    const isLeftResizing = r.id in liveLeftResizes
                    const isMoving = liveMove?.reservation.id === r.id
                    const startMin = liveLeftData ? timeToMin(liveLeftData.time) : baseStartMin
                    const left  = (startMin - DAY_START) / 60 * slotW + 2
                    const width = Math.min(liveBlock / 60 * slotW - 4, totalW - left - 2)
                    const isSelected = selected?.id === r.id
                    const isMemo = r.menu_id === '__memo__'
                    const lane = laneMap.get(r.id) ?? 0
                    return (
                      <div key={r.id}
                        style={{ left, width, top: 6 + lane * ROW_H, height: ROW_H - 12 }}
                        className={`absolute rounded overflow-hidden group/block transition-opacity ${
                          (isDragging || isLeftResizing) ? 'shadow-lg ring-2 ring-white/50' : ''
                        } ${isMoving ? 'opacity-30' : ''}`}>
                        <button
                          onMouseDown={(e) => startMove(e, r)}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            width: '100%', height: '100%',
                            ...(isMemo ? {
                              backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(0,0,0,0.12) 6px, rgba(0,0,0,0.12) 12px)',
                            } : {}),
                          }}
                          className={`text-left px-2 py-1 transition-all cursor-grab active:cursor-grabbing ${
                            isMemo
                              ? 'bg-gray-400/70 border-2 border-gray-500 text-white'
                              : STATUS_STYLE[r.status]
                          } ${isSelected ? 'ring-2 ring-offset-1 ring-sand-400 shadow-lg' : 'hover:opacity-90 shadow-sm'}`}>
                          {isMemo ? (
                            <>
                              <p className="text-[10px] font-bold truncate leading-tight tracking-wider">⊘ BLOCK</p>
                              {width > 80 && <p className="text-[10px] truncate leading-tight opacity-90">{r.menu_name}</p>}
                            </>
                          ) : (
                            <>
                              <p className="text-[11px] font-semibold truncate leading-tight">
                                {r.source === 'hotpepper' && <span className="mr-1 text-[9px] font-bold px-1 rounded bg-orange-200 text-orange-700">HP</span>}
                                {r.source === 'hotpepper' ? (r.guest_name ?? '—') : (r.members?.name ?? '—')} 様
                              </p>
                              <p className="text-[10px] opacity-75 truncate leading-tight">{r.menu_name}</p>
                              {width > 100 && <p className="text-[10px] opacity-60">{r.time}〜{endTimeStr(r.time, liveBlock)}</p>}
                            </>
                          )}
                        </button>
                        {/* リサイズハンドル（左端・開始時間） */}
                        <div
                          onMouseDown={(e) => startLeftResize(e, r)}
                          className="absolute left-0 top-0 h-full w-3 cursor-col-resize flex items-center justify-center opacity-0 group-hover/block:opacity-100 transition-opacity z-10"
                          title="ドラッグで開始時間を変更">
                          <div className="flex gap-[2px]">
                            <div className="w-[2px] h-4 rounded-full bg-white/70" />
                            <div className="w-[2px] h-4 rounded-full bg-white/70" />
                          </div>
                        </div>
                        {/* リサイズハンドル（右端） */}
                        <div
                          onMouseDown={(e) => startResize(e, r)}
                          className="absolute right-0 top-0 h-full w-3 cursor-col-resize flex items-center justify-center opacity-0 group-hover/block:opacity-100 transition-opacity z-10"
                          title="ドラッグで時間を変更">
                          <div className="flex gap-[2px]">
                            <div className="w-[2px] h-4 rounded-full bg-white/70" />
                            <div className="w-[2px] h-4 rounded-full bg-white/70" />
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  {/* アプリ ブロック枠（フリー行のみ） */}
                  {stylist.is_free && blockedSlots.map((bs) => {
                    const liveLeftBsData = liveLeftBsResizes[bs.id]
                    const baseStartMin = timeToMin(bs.time)
                    if (baseStartMin < DAY_START || baseStartMin >= DAY_END) return null
                    const startMin = liveLeftBsData ? timeToMin(liveLeftBsData.time) : baseStartMin
                    const liveBlock = liveLeftBsData ? liveLeftBsData.block : (liveBsBlocks[bs.id] ?? bs.block_minutes)
                    const isMoving = liveBsMove?.bs.id === bs.id
                    const isLeftResizing = bs.id in liveLeftBsResizes
                    const bsLane = bsLaneMap.get(bs.id) ?? 0
                    const left = (startMin - DAY_START) / 60 * slotW + 2
                    const width = Math.min(liveBlock / 60 * slotW - 4, totalW - left - 2)
                    return (
                      <div key={bs.id}
                        style={{ left, width, top: 6 + bsLane * ROW_H, height: ROW_H - 12 }}
                        className={`absolute rounded overflow-hidden group/bs ${isMoving ? 'opacity-30' : ''} ${isLeftResizing ? 'shadow-lg ring-2 ring-white/50' : ''}`}>
                        <button
                          onMouseDown={(e) => startBsMove(e, bs)}
                          onClick={(e) => { e.stopPropagation(); setSelectedBs(bs) }}
                          style={{
                            width: '100%', height: '100%',
                            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(0,0,0,0.15) 6px, rgba(0,0,0,0.15) 12px)',
                          }}
                          className="text-left px-2 py-1 bg-gray-400/70 border-2 border-gray-500 text-white cursor-grab active:cursor-grabbing hover:opacity-90 shadow-sm transition-all">
                          <p className="text-[10px] font-bold truncate leading-tight tracking-wider">⊘ BLOCK</p>
                          {width > 80 && <p className="text-[10px] text-white/80 truncate leading-tight">{bs.reason ?? 'ブロック'}</p>}
                        </button>
                        <div
                          onMouseDown={(e) => startBsLeftResize(e, bs)}
                          className="absolute left-0 top-0 h-full w-3 cursor-col-resize flex items-center justify-center opacity-0 group-hover/bs:opacity-100 transition-opacity z-10">
                          <div className="flex gap-[2px]">
                            <div className="w-[2px] h-4 rounded-full bg-white/70" />
                            <div className="w-[2px] h-4 rounded-full bg-white/70" />
                          </div>
                        </div>
                        <div
                          onMouseDown={(e) => startBsResize(e, bs)}
                          className="absolute right-0 top-0 h-full w-3 cursor-col-resize flex items-center justify-center opacity-0 group-hover/bs:opacity-100 transition-opacity z-10">
                          <div className="flex gap-[2px]">
                            <div className="w-[2px] h-4 rounded-full bg-white/70" />
                            <div className="w-[2px] h-4 rounded-full bg-white/70" />
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  {/* 移動ゴーストブロック */}
                  {liveMove && (() => {
                    const isThisRow = stylist.is_free ? liveMove.stylistId === null : liveMove.stylistId === stylist.id
                    if (!isThisRow) return null
                    const gs = timeToMin(liveMove.time)
                    if (gs < DAY_START || gs >= DAY_END) return null
                    const gl = (gs - DAY_START) / 60 * slotW + 2
                    const gw = Math.min(liveMove.reservation.block_minutes / 60 * slotW - 4, totalW - gl - 2)
                    const ghostLane = laneMap.get(liveMove.reservation.id) ?? 0
                    return (
                      <div key="ghost"
                        style={{ left: gl, width: gw, top: 6 + ghostLane * ROW_H, height: ROW_H - 12, pointerEvents: 'none' }}
                        className="absolute rounded bg-shore/40 border-2 border-dashed border-shore" />
                    )
                  })()}
                  {/* アプリ BLOCKの移動ゴースト（フリー行のみ） */}
                  {stylist.is_free && liveBsMove && (() => {
                    const gs = timeToMin(liveBsMove.time)
                    if (gs < DAY_START || gs >= DAY_END) return null
                    const gl = (gs - DAY_START) / 60 * slotW + 2
                    const gw = Math.min(liveBsMove.bs.block_minutes / 60 * slotW - 4, totalW - gl - 2)
                    return (
                      <div key="bs-ghost"
                        style={{ left: gl, width: gw, top: 6, height: ROW_H - 12, pointerEvents: 'none' }}
                        className="absolute rounded bg-gray-400/40 border-2 border-dashed border-gray-500" />
                    )
                  })()}
                </div>
              </div>
            )
          })}
      </div>

      {moveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setMoveConfirm(null)}>
          <div className="bg-white rounded shadow-2xl w-[300px] p-5" onClick={e => e.stopPropagation()}>
            <p className="text-sm font-semibold text-shore mb-3">移動します。よろしいですか？</p>
            <div className="text-[11px] space-y-2 mb-5 bg-sand-50 rounded p-3">
              <div className="flex justify-between text-sand-400">
                <span>変更前</span>
                <span>
                  {stylists.find(s => s.id === (moveConfirm.reservation.stylist_id ?? null))?.name ?? 'フリー'}・
                  {moveConfirm.reservation.time}〜{endTimeStr(moveConfirm.reservation.time, moveConfirm.reservation.block_minutes)}
                </span>
              </div>
              <div className="flex justify-between text-shore font-semibold">
                <span>変更後</span>
                <span>
                  {stylists.find(s => s.id === moveConfirm.newStylistId)?.name ?? 'フリー'}・
                  {moveConfirm.newTime}〜{endTimeStr(moveConfirm.newTime, moveConfirm.reservation.block_minutes)}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setMoveConfirm(null)}
                className="flex-1 py-2 border border-sand-200 rounded text-sand-400 text-[11px] hover:bg-sand-50 transition-colors">
                キャンセル
              </button>
              <button onClick={() => {
                onMove(moveConfirm.id, moveConfirm.newTime, moveConfirm.newStylistId)
                setMoveConfirm(null)
              }}
                className="flex-1 py-2 bg-shore text-cream rounded text-[11px] hover:bg-shore/80 transition-colors">
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {resizeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => {
            setLiveBlocks(prev => { const n = { ...prev }; delete n[resizeConfirm.id]; return n })
            setResizeConfirm(null)
          }}>
          <div className="bg-white rounded shadow-2xl w-[300px] p-5" onClick={e => e.stopPropagation()}>
            <p className="text-sm font-semibold text-shore mb-3">変更します。よろしいですか？</p>
            <div className="text-[11px] space-y-2 mb-5 bg-sand-50 rounded p-3">
              <div className="flex justify-between text-sand-400">
                <span>変更前</span>
                <span>{resizeConfirm.time}〜{endTimeStr(resizeConfirm.time, resizeConfirm.oldBlock)}</span>
              </div>
              <div className="flex justify-between text-shore font-semibold">
                <span>変更後</span>
                <span>{resizeConfirm.time}〜{endTimeStr(resizeConfirm.time, resizeConfirm.newBlock)}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setLiveBlocks(prev => { const n = { ...prev }; delete n[resizeConfirm.id]; return n })
                  setResizeConfirm(null)
                }}
                className="flex-1 py-2 border border-sand-200 rounded text-sand-400 text-[11px] hover:bg-sand-50 transition-colors">
                キャンセル
              </button>
              <button
                onClick={() => {
                  onResize(resizeConfirm.id, resizeConfirm.newBlock)
                  setLiveBlocks(prev => { const n = { ...prev }; delete n[resizeConfirm.id]; return n })
                  setResizeConfirm(null)
                }}
                className="flex-1 py-2 bg-shore text-cream rounded text-[11px] hover:bg-shore/80 transition-colors">
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {bsResizeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => {
            setLiveBsBlocks(prev => { const n = { ...prev }; delete n[bsResizeConfirm.id]; return n })
            setBsResizeConfirm(null)
          }}>
          <div className="bg-white rounded shadow-2xl w-[300px] p-5" onClick={e => e.stopPropagation()}>
            <p className="text-sm font-semibold text-shore mb-3">ブロック時間を変更しますか？</p>
            <div className="text-[11px] space-y-2 mb-5 bg-sand-50 rounded p-3">
              <div className="flex justify-between text-sand-400">
                <span>変更前</span>
                <span>{bsResizeConfirm.time}〜{endTimeStr(bsResizeConfirm.time, bsResizeConfirm.oldBlock)}</span>
              </div>
              <div className="flex justify-between text-shore font-semibold">
                <span>変更後</span>
                <span>{bsResizeConfirm.time}〜{endTimeStr(bsResizeConfirm.time, bsResizeConfirm.newBlock)}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => {
                setLiveBsBlocks(prev => { const n = { ...prev }; delete n[bsResizeConfirm.id]; return n })
                setBsResizeConfirm(null)
              }} className="flex-1 py-2 border border-sand-200 rounded text-sand-400 text-[11px] hover:bg-sand-50 transition-colors">
                キャンセル
              </button>
              <button onClick={() => {
                onBsUpdate(bsResizeConfirm.id, { block_minutes: bsResizeConfirm.newBlock })
                setLiveBsBlocks(prev => { const n = { ...prev }; delete n[bsResizeConfirm.id]; return n })
                setBsResizeConfirm(null)
              }} className="flex-1 py-2 bg-shore text-cream rounded text-[11px] hover:bg-shore/80 transition-colors">
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {bsMoveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setBsMoveConfirm(null)}>
          <div className="bg-white rounded shadow-2xl w-[300px] p-5" onClick={e => e.stopPropagation()}>
            <p className="text-sm font-semibold text-shore mb-3">ブロックを移動しますか？</p>
            <div className="text-[11px] space-y-2 mb-5 bg-sand-50 rounded p-3">
              <div className="flex justify-between text-sand-400">
                <span>変更前</span>
                <span>{bsMoveConfirm.bs.time}〜{endTimeStr(bsMoveConfirm.bs.time, bsMoveConfirm.bs.block_minutes)}</span>
              </div>
              <div className="flex justify-between text-shore font-semibold">
                <span>変更後</span>
                <span>{bsMoveConfirm.newTime}〜{endTimeStr(bsMoveConfirm.newTime, bsMoveConfirm.bs.block_minutes)}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setBsMoveConfirm(null)}
                className="flex-1 py-2 border border-sand-200 rounded text-sand-400 text-[11px] hover:bg-sand-50 transition-colors">
                キャンセル
              </button>
              <button onClick={() => {
                onBsUpdate(bsMoveConfirm.id, { time: bsMoveConfirm.newTime })
                setBsMoveConfirm(null)
              }} className="flex-1 py-2 bg-shore text-cream rounded text-[11px] hover:bg-shore/80 transition-colors">
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {leftResizeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => {
            setLiveLeftResizes(prev => { const n = { ...prev }; delete n[leftResizeConfirm.id]; return n })
            setLeftResizeConfirm(null)
          }}>
          <div className="bg-white rounded shadow-2xl w-[300px] p-5" onClick={e => e.stopPropagation()}>
            <p className="text-sm font-semibold text-shore mb-3">開始時間を変更しますか？</p>
            <div className="text-[11px] space-y-2 mb-5 bg-sand-50 rounded p-3">
              <div className="flex justify-between text-sand-400">
                <span>変更前</span>
                <span>{leftResizeConfirm.origTime}〜{endTimeStr(leftResizeConfirm.origTime, leftResizeConfirm.origBlock)}</span>
              </div>
              <div className="flex justify-between text-shore font-semibold">
                <span>変更後</span>
                <span>{leftResizeConfirm.newTime}〜{endTimeStr(leftResizeConfirm.newTime, leftResizeConfirm.newBlock)}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => {
                setLiveLeftResizes(prev => { const n = { ...prev }; delete n[leftResizeConfirm.id]; return n })
                setLeftResizeConfirm(null)
              }} className="flex-1 py-2 border border-sand-200 rounded text-sand-400 text-[11px] hover:bg-sand-50 transition-colors">
                キャンセル
              </button>
              <button onClick={() => {
                onLeftResize(leftResizeConfirm.id, leftResizeConfirm.newTime, leftResizeConfirm.newBlock)
                setLiveLeftResizes(prev => { const n = { ...prev }; delete n[leftResizeConfirm.id]; return n })
                setLeftResizeConfirm(null)
              }} className="flex-1 py-2 bg-shore text-cream rounded text-[11px] hover:bg-shore/80 transition-colors">
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedBs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setSelectedBs(null)}>
          <div className="bg-white rounded shadow-2xl w-[300px] p-5" onClick={e => e.stopPropagation()}>
            <p className="text-sm font-semibold text-shore mb-1">⊘ ブロック</p>
            <p className="text-[11px] text-sand-400 mb-4">
              {selectedBs.time}〜{endTimeStr(selectedBs.time, selectedBs.block_minutes)}
              {selectedBs.reason && <span className="ml-2">({selectedBs.reason})</span>}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setSelectedBs(null)}
                className="flex-1 py-2 border border-sand-200 rounded text-sand-400 text-[11px] hover:bg-sand-50 transition-colors">
                閉じる
              </button>
              <button onClick={() => {
                onBsDelete(selectedBs.id)
                setSelectedBs(null)
              }} className="flex-1 py-2 bg-red-500 text-white rounded text-[11px] hover:bg-red-600 transition-colors">
                ブロック解除
              </button>
            </div>
          </div>
        </div>
      )}

      {bsLeftResizeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => {
            setLiveLeftBsResizes(prev => { const n = { ...prev }; delete n[bsLeftResizeConfirm.id]; return n })
            setBsLeftResizeConfirm(null)
          }}>
          <div className="bg-white rounded shadow-2xl w-[300px] p-5" onClick={e => e.stopPropagation()}>
            <p className="text-sm font-semibold text-shore mb-3">ブロック開始時間を変更しますか？</p>
            <div className="text-[11px] space-y-2 mb-5 bg-sand-50 rounded p-3">
              <div className="flex justify-between text-sand-400">
                <span>変更前</span>
                <span>{bsLeftResizeConfirm.origTime}〜{endTimeStr(bsLeftResizeConfirm.origTime, bsLeftResizeConfirm.origBlock)}</span>
              </div>
              <div className="flex justify-between text-shore font-semibold">
                <span>変更後</span>
                <span>{bsLeftResizeConfirm.newTime}〜{endTimeStr(bsLeftResizeConfirm.newTime, bsLeftResizeConfirm.newBlock)}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => {
                setLiveLeftBsResizes(prev => { const n = { ...prev }; delete n[bsLeftResizeConfirm.id]; return n })
                setBsLeftResizeConfirm(null)
              }} className="flex-1 py-2 border border-sand-200 rounded text-sand-400 text-[11px] hover:bg-sand-50 transition-colors">
                キャンセル
              </button>
              <button onClick={() => {
                onBsUpdate(bsLeftResizeConfirm.id, { time: bsLeftResizeConfirm.newTime, block_minutes: bsLeftResizeConfirm.newBlock })
                setLiveLeftBsResizes(prev => { const n = { ...prev }; delete n[bsLeftResizeConfirm.id]; return n })
                setBsLeftResizeConfirm(null)
              }} className="flex-1 py-2 bg-shore text-cream rounded text-[11px] hover:bg-shore/80 transition-colors">
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── 週間ビュー ────────────────────────────────────────────────
function WeeklyView({
  stylist, date, weeklyRes, loading, slotW, selected, onSelect,
}: {
  stylist: Stylist
  date: string
  weeklyRes: Record<string, Reservation[]>
  loading: boolean
  slotW: number
  selected: Reservation | null
  onSelect: (r: Reservation) => void
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-sand-400 tracking-wider">読み込み中...</p>
      </div>
    )
  }

  const totalW = HOURS * slotW
  const days   = Array.from({ length: 7 }, (_, i) => addDays(date, i))

  return (
    <div className="h-full overflow-auto">
      <div style={{ minWidth: LABEL_W + totalW }}>
        <TimeHeader slotW={slotW} />

        {days.map((d) => {
          const dt  = new Date(d + 'T00:00:00')
          const dow = DOW[dt.getDay()]
          const isSun = dt.getDay() === 0
          const isSat = dt.getDay() === 6
          const dayRes = (weeklyRes[d] ?? []).filter(r =>
            r.status !== 'cancelled' &&
            (stylist.is_free ? !r.stylist_id : r.stylist_id === stylist.id)
          )

          return (
            <div key={d} className="flex border-b border-sand-200">
              {/* 日付ラベル（sticky） */}
              <div style={{ width: LABEL_W, minWidth: LABEL_W, height: ROW_H }}
                className="sticky left-0 z-10 flex-shrink-0 flex flex-col items-center justify-center border-r-2 border-sand-300 px-2 bg-white">
                <span className={`text-[10px] ${isSun ? 'text-red-400' : isSat ? 'text-blue-400' : 'text-sand-400'}`}>
                  {dow}
                </span>
                <span className={`text-sm font-medium leading-tight ${
                  isSun ? 'text-red-500' : isSat ? 'text-blue-500' : 'text-shore'
                }`}>
                  {dt.getMonth() + 1}/{dt.getDate()}
                </span>
              </div>

              {/* 予約エリア */}
              <div className="relative flex-shrink-0" style={{ width: totalW, height: ROW_H }}>
                <GridLines slotW={slotW} />
                {dt.getDay() === 4 && <div className="absolute inset-0 bg-gray-400/40 pointer-events-none" />}

                {dayRes.map((r) => {
                  const startMin = timeToMin(r.time)
                  if (startMin < DAY_START || startMin >= DAY_END) return null
                  const left  = (startMin - DAY_START) / 60 * slotW + 2
                  const width = Math.min(r.block_minutes / 60 * slotW - 4, totalW - left - 2)
                  const isSelected = selected?.id === r.id
                  return (
                    <button key={r.id}
                      onClick={(e) => { e.stopPropagation(); onSelect(r) }}
                      style={{ left, width, top: 6, height: ROW_H - 12 }}
                      className={`absolute rounded text-left px-2 py-1 overflow-hidden transition-all ${
                        STATUS_STYLE[r.status]
                      } ${isSelected ? 'ring-2 ring-offset-1 ring-sand-400 shadow-lg' : 'hover:opacity-90 shadow-sm'}`}>
                      <p className="text-[11px] font-semibold truncate leading-tight">
                        {r.source === 'hotpepper' ? (r.guest_name ?? '—') : (r.members?.name ?? '—')} 様
                      </p>
                      {width > 100 && (
                        <p className="text-[10px] opacity-75 truncate">{r.menu_name}</p>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── リストビュー ──────────────────────────────────────────────
function ListView({
  reservations, allUnread, stylists, onStatusChange, updating,
  tab, onTabChange, onMarkAsRead, onMarkAllAsRead,
}: {
  reservations: Reservation[]
  allUnread: Reservation[]
  stylists: Stylist[]
  onStatusChange: (id: string, status: Status) => void
  updating: boolean
  tab: 'search' | 'all' | 'unread' | Status
  onTabChange: (t: 'search' | 'all' | 'unread' | Status) => void
  onMarkAsRead: (id: string) => void
  onMarkAllAsRead: () => void
}) {
  const [searchName, setSearchName]       = useState('')
  const [searchFrom, setSearchFrom]       = useState('')
  const [searchTo, setSearchTo]           = useState('')
  const [searchStylist, setSearchStylist] = useState('all')
  const [searchStatus, setSearchStatus]   = useState<Status | 'all'>('all')
  const [results, setResults]             = useState<Reservation[] | null>(null)

  const unreadIds = new Set(allUnread.map(r => r.id))

  function applySearch() {
    setResults(reservations.filter(r => {
      if (searchStatus !== 'all' && r.status !== searchStatus) return false
      if (searchFrom && r.date < searchFrom) return false
      if (searchTo   && r.date > searchTo)   return false
      if (searchName && !r.members?.name.includes(searchName)) return false
      if (searchStylist !== 'all' && (searchStylist === '' ? r.stylist_id !== null : r.stylist_id !== searchStylist)) return false
      return true
    }))
  }
  function clearSearch() {
    setSearchName(''); setSearchFrom(''); setSearchTo('')
    setSearchStylist('all'); setSearchStatus('all'); setResults(null)
  }

  function dateLabel(ds: string) {
    const d = new Date(ds + 'T00:00:00')
    return `${d.getMonth() + 1}/${d.getDate()}（${DOW[d.getDay()]}）`
  }

  const displayRows: Reservation[] =
    tab === 'unread'  ? allUnread :
    tab === 'all'     ? reservations :
    tab === 'search'  ? (results ?? []) :
    reservations.filter(r => r.status === (tab as Status))

  return (
    <div className="h-full overflow-auto bg-sand-50">

      {/* ── ショートカットボタン ── */}
      <div className="bg-white border-b border-sand-200 px-5 py-2.5 flex items-center gap-2 flex-wrap">
        {([
          { label: '検索',       key: 'search'    as const },
          { label: '受付待ち',   key: 'confirmed' as const },
          { label: '来店済み',   key: 'completed' as const },
          { label: 'キャンセル', key: 'cancelled' as const },
          { label: '全ての予約', key: 'all'       as const },
        ]).map(({ label, key }) => (
          <button key={key} onClick={() => onTabChange(key)}
            className={`whitespace-nowrap text-[11px] px-3 py-1.5 rounded border transition-colors ${
              tab === key
                ? 'bg-shore text-cream border-shore'
                : 'border-sand-200 text-sand-500 hover:border-shore hover:text-shore'
            }`}>{label}</button>
        ))}
        <button onClick={() => onTabChange('unread')}
          className={`whitespace-nowrap text-[11px] px-3 py-1.5 rounded border transition-colors flex items-center gap-1.5 ${
            tab === 'unread'
              ? 'bg-red-500 text-white border-red-500'
              : 'border-sand-200 text-sand-500 hover:border-shore hover:text-shore'
          }`}>
          新着・未読
          {unreadIds.size > 0 && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
              tab === 'unread' ? 'bg-white text-red-500' : 'bg-red-500 text-white'
            }`}>{unreadIds.size}</span>
          )}
        </button>
        {tab === 'unread' && unreadIds.size > 0 && (
          <button onClick={onMarkAllAsRead}
            className="whitespace-nowrap text-[11px] px-3 py-1.5 border border-sand-300 rounded text-sand-400 hover:border-shore hover:text-shore transition-colors">
            全て既読にする
          </button>
        )}
        {(tab !== 'search' || results !== null) && (
          <span className="ml-auto text-[11px] text-sand-400 whitespace-nowrap">{displayRows.length}件 / 全{reservations.length}件</span>
        )}
      </div>

      {/* ── 検索タブ ── */}
      {tab === 'search' && (
        <div className="bg-white border-b border-sand-200 px-5 py-4">
          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 items-center max-w-3xl text-[12px]">
            <span className="text-sand-500 font-medium whitespace-nowrap">来店日</span>
            <div className="flex items-center gap-2">
              <input type="date" value={searchFrom} onChange={e => setSearchFrom(e.target.value)}
                className="border border-sand-200 rounded px-2 py-1 text-[12px] text-shore outline-none focus:border-shore" />
              <span className="text-sand-400">〜</span>
              <input type="date" value={searchTo} onChange={e => setSearchTo(e.target.value)}
                className="border border-sand-200 rounded px-2 py-1 text-[12px] text-shore outline-none focus:border-shore" />
              <button onClick={() => { const t = todayStr(); setSearchFrom(t); setSearchTo(t) }}
                className="text-[11px] px-3 py-1 border border-sand-200 rounded text-sand-500 hover:border-shore hover:text-shore transition-colors">本日</button>
              {(searchFrom || searchTo) && (
                <button onClick={() => { setSearchFrom(''); setSearchTo('') }}
                  className="text-[11px] text-sand-400 hover:text-red-400 transition-colors">クリア</button>
              )}
            </div>

            <span className="text-sand-500 font-medium whitespace-nowrap">ステータス</span>
            <div className="flex gap-2">
              {([
                { label: '全て',     val: 'all' as const },
                { label: '受付待ち', val: 'confirmed' as const },
                { label: '来店済み', val: 'completed' as const },
                { label: 'キャンセル', val: 'cancelled' as const },
              ]).map(({ label, val }) => (
                <button key={val} onClick={() => setSearchStatus(val)}
                  className={`text-[11px] px-3 py-1 rounded border transition-colors ${
                    searchStatus === val ? 'bg-shore text-cream border-shore' : 'border-sand-200 text-sand-500 hover:border-shore'
                  }`}>{label}</button>
              ))}
            </div>

            <span className="text-sand-500 font-medium whitespace-nowrap">お客様名</span>
            <input type="text" value={searchName} onChange={e => setSearchName(e.target.value)}
              placeholder="お名前（部分一致）"
              onKeyDown={e => { if (e.key === 'Enter') applySearch() }}
              className="border border-sand-200 rounded px-3 py-1 text-[12px] text-shore outline-none focus:border-shore max-w-[240px]" />

            <span className="text-sand-500 font-medium whitespace-nowrap">スタイリスト</span>
            <select value={searchStylist} onChange={e => setSearchStylist(e.target.value)}
              className="border border-sand-200 rounded px-2 py-1 text-[12px] text-shore outline-none focus:border-shore max-w-[200px] bg-white">
              <option value="all">すべてのスタイリスト</option>
              {stylists.filter(s => !s.is_free).map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
              <option value="">フリー</option>
            </select>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={clearSearch}
              className="text-[11px] px-5 py-1.5 border border-sand-200 rounded text-sand-500 hover:border-shore hover:text-shore transition-colors">
              条件をクリア
            </button>
            <button onClick={applySearch}
              className="text-[11px] px-6 py-1.5 bg-shore text-cream rounded hover:bg-shore/80 transition-colors">
              検索する
            </button>
          </div>
          {results === null && (
            <p className="text-[11px] text-sand-400 mt-3">条件を設定して「検索する」を押してください。</p>
          )}
        </div>
      )}

      {(tab === 'search' && results === null) ? null : displayRows.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-sand-400">
            {tab === 'unread' ? '未読の予約はありません' : '該当する予約がありません'}
          </p>
        </div>
      ) : (
        <div className="p-4">
          <p className="text-[11px] text-sand-400 mb-2">{displayRows.length}件</p>
          <div className="bg-white rounded border border-sand-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-[#f0ebe5] border-b-2 border-sand-300">
                  {['来店日時', 'ステータス', 'お客様名', 'スタイリスト', 'メニュー・所要時間', 'お支払い', '操作'].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 text-[11px] tracking-[0.05em] text-sand-500 font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayRows.map((r, idx) => {
                  const stylistName = stylists.find(s => s.id === r.stylist_id)?.name ?? 'フリー'
                  const isUnread = unreadIds.has(r.id)
                  return (
                    <tr key={r.id}
                      className={`border-b border-sand-100 hover:bg-shore/5 transition-colors ${
                        isUnread ? 'bg-red-50/40' : idx % 2 === 0 ? 'bg-white' : 'bg-sand-50/40'
                      }`}>

                      {/* 来店日時 */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <p className="text-[12px] font-semibold text-shore">{dateLabel(r.date)}</p>
                        <p className="text-[11px] text-sand-500 mt-0.5">
                          {r.time} 〜 {endTimeStr(r.time, r.block_minutes)}
                        </p>
                      </td>

                      {/* ステータス */}
                      <td className="px-3 py-3">
                        <span className={`inline-block text-[11px] px-2 py-1 rounded font-medium ${STATUS_BADGE[r.status]}`}>
                          {STATUS_LABEL[r.status]}
                        </span>
                        {isUnread && (
                          <span className="block mt-1 text-[10px] text-red-500 font-medium">未読</span>
                        )}
                      </td>

                      {/* お客様名 */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <p className="text-[13px] font-semibold text-shore">{r.source === 'hotpepper' ? (r.guest_name ?? '—') : (r.members?.name ?? '—')} 様</p>
                        <p className="text-[10px] text-sand-400 mt-0.5">{r.members?.phone ?? '—'}</p>
                      </td>

                      {/* スタイリスト */}
                      <td className="px-3 py-3 text-[12px] text-sand-600 whitespace-nowrap">
                        {stylistName}
                      </td>

                      {/* メニュー・所要 */}
                      <td className="px-3 py-3 max-w-[220px]">
                        <p className="text-[12px] text-sand-700 leading-snug">① {r.menu_name}</p>
                        <p className="text-[10px] text-sand-400 mt-0.5">{r.block_minutes}分</p>
                      </td>

                      {/* お支払い */}
                      <td className="px-3 py-3 text-[11px] text-sand-500 whitespace-nowrap">現地支払い</td>

                      {/* 操作 */}
                      <td className="px-3 py-3">
                        <div className="flex flex-col gap-1.5">
                          {isUnread && (
                            <button onClick={() => onMarkAsRead(r.id)}
                              className="text-[10px] px-2.5 py-1 bg-white border border-sand-300 rounded hover:border-shore hover:text-shore text-sand-500 transition-colors whitespace-nowrap">
                              既読にする
                            </button>
                          )}
                          <select value={r.status} disabled={updating}
                            onChange={e => onStatusChange(r.id, e.target.value as Status)}
                            className="text-[11px] px-2 py-1.5 rounded cursor-pointer border border-sand-200 outline-none bg-white text-sand-600 hover:border-shore transition-colors">
                            <option value="confirmed">受付待ち</option>
                            <option value="completed">来店済</option>
                            <option value="cancelled">キャンセル</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── 予約ポップアップ ──────────────────────────────────────────
function ReservationPopup({
  reservation: r, activeTab, onTabChange, onClose,
  onStatusChange, cancelConfirm, onCancelRequest, onCancelExecute, onCancelAbort, updating,
}: {
  reservation: Reservation
  activeTab: string
  onTabChange: (tab: string) => void
  onClose: () => void
  onStatusChange: (id: string, status: Status) => void
  cancelConfirm: boolean
  onCancelRequest: () => void
  onCancelExecute: () => void
  onCancelAbort: () => void
  updating: boolean
}) {
  const tabs = ['詳細', '変更', 'キャンセル', 'お客様情報']

  return (
    <div className="bg-white rounded shadow-2xl border border-sand-200 overflow-hidden">
      <div className="flex items-center border-b border-sand-200 bg-sand-50">
        {tabs.map((tab) => (
          <button key={tab} onClick={() => onTabChange(tab)}
            className={`px-4 py-2.5 text-[11px] tracking-[0.1em] border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-shore text-shore font-semibold bg-white'
                : 'border-transparent text-sand-400 hover:text-sand-600'
            } ${tab === 'キャンセル' && activeTab !== tab ? 'text-red-400 hover:text-red-500' : ''}`}>
            {tab}
          </button>
        ))}
        <button onClick={onClose}
          className="ml-auto px-3 py-2.5 text-sand-300 hover:text-sand-500 transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="p-4">
        {activeTab === '詳細' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-semibold text-shore">{r.source === 'hotpepper' ? (r.guest_name ?? '—') : (r.members?.name ?? '—')} 様</p>
                  {r.source === 'hotpepper' && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-600">HP</span>
                  )}
                </div>
                <p className="text-xs text-sand-400">{r.source === 'hotpepper' ? (r.hp_reservation_id ?? '') : (r.members?.phone ?? '電話番号なし')}</p>
              </div>
              <span className={`text-[11px] px-2.5 py-1 rounded ${STATUS_BADGE[r.status]}`}>
                {STATUS_LABEL[r.status]}
              </span>
            </div>
            <div className="bg-sand-50 rounded p-3 space-y-1.5 mb-4">
              {[
                ['メニュー', r.menu_name],
                ['来店日時', `${r.date.replace(/-/g, '/')} ${r.time}〜${endTimeStr(r.time, r.block_minutes)}`],
                ['所要時間', `${r.block_minutes}分`],
                ['受付', new Date(r.created_at).toLocaleDateString('ja-JP')],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-sand-400 text-[11px]">{label}</span>
                  <span className="text-shore font-medium">{value}</span>
                </div>
              ))}
            </div>
            <button
              disabled={updating || r.status === 'completed'}
              onClick={() => onStatusChange(r.id, 'completed')}
              className="w-full py-2.5 bg-shore text-cream text-[11px] tracking-[0.15em] rounded hover:bg-shore/80 disabled:opacity-40 transition-all">
              受付チェック（来店済みにする）
            </button>
          </div>
        )}

        {activeTab === '変更' && (
          <div className="space-y-3">
            <div className="bg-sand-50 rounded p-3 text-sm space-y-1">
              <p className="text-shore font-medium">{r.menu_name}</p>
              <p className="text-shore">{r.date.replace(/-/g, '/')} {r.time}〜{endTimeStr(r.time, r.block_minutes)}</p>
            </div>
            <p className="text-[11px] text-sand-400">※変更フォームは次のバージョンで実装予定です。</p>
          </div>
        )}

        {activeTab === 'キャンセル' && (
          <div>
            {!cancelConfirm ? (
              <div className="space-y-4">
                <div className="bg-sand-50 rounded p-3 text-sm">
                  <p className="text-shore font-medium">{r.source === 'hotpepper' ? (r.guest_name ?? '—') : (r.members?.name ?? '—')} 様</p>
                  <p className="text-sand-500">{r.menu_name}</p>
                  <p className="text-sand-500">{r.date.replace(/-/g, '/')} {r.time}〜</p>
                </div>
                <button onClick={onCancelRequest} disabled={r.status === 'cancelled'}
                  className="w-full py-2.5 bg-red-500 text-white text-[11px] tracking-[0.15em] rounded hover:bg-red-600 disabled:opacity-40 transition-all">
                  キャンセルにする
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <p className="text-xs text-red-600 font-medium">この予約をキャンセルにします。よろしいですか？</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={onCancelAbort}
                    className="flex-1 py-2.5 border border-sand-200 text-sand-500 text-[11px] rounded hover:bg-sand-50 transition-colors">
                    いいえ
                  </button>
                  <button onClick={onCancelExecute} disabled={updating}
                    className="flex-1 py-2.5 bg-red-500 text-white text-[11px] rounded hover:bg-red-600 disabled:opacity-40 transition-all">
                    はい・キャンセル
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'お客様情報' && (
          <div className="space-y-2">
            {[
              ['氏名', r.source === 'hotpepper' ? (r.guest_name ?? '—') : (r.members?.name ?? '—')],
              ['電話番号', r.members?.phone ?? '—'],
              ['来店回数', '（アプリ連携後に表示）'],
            ].map(([label, value]) => (
              <div key={label} className="flex py-2 border-b border-sand-100">
                <span className="text-[11px] text-sand-400 w-24 flex-shrink-0">{label}</span>
                <span className="text-shore text-sm">{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── 管理画面用ミニカレンダー ──────────────────────────────────
function MiniCalendar({ value, onChange }: { value: string; onChange: (d: string) => void }) {
  const parsed   = value ? new Date(value + 'T00:00:00') : new Date()
  const [calYear,  setCalYear]  = useState(parsed.getFullYear())
  const [calMonth, setCalMonth] = useState(parsed.getMonth())

  const todayStr = (() => {
    const t = new Date()
    return toDateStr(t.getFullYear(), t.getMonth(), t.getDate())
  })()

  const cells = buildCalendar(calYear, calMonth)
  const MONTHS_JP = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月']

  function prevMonth() {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) }
    else setCalMonth(m => m - 1)
  }
  function nextMonth() {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) }
    else setCalMonth(m => m + 1)
  }

  return (
    <div className="border border-sand-200 rounded overflow-hidden w-[220px]">
      {/* 月ナビ */}
      <div className="flex items-center justify-between bg-sand-50 border-b border-sand-200 px-2 py-1.5">
        <button onClick={prevMonth} className="w-6 h-6 flex items-center justify-center rounded hover:bg-sand-200 text-sand-500 transition-colors text-xs">◀</button>
        <span className="text-[12px] font-medium text-shore">{calYear}年 {MONTHS_JP[calMonth]}</span>
        <button onClick={nextMonth} className="w-6 h-6 flex items-center justify-center rounded hover:bg-sand-200 text-sand-500 transition-colors text-xs">▶</button>
      </div>

      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7 border-b border-sand-100">
        {['日','月','火','水','木','金','土'].map((d, i) => (
          <div key={d} className={`text-center text-[10px] py-1 font-medium ${
            i === 0 ? 'text-red-400' : i === 4 ? 'text-sand-300' : 'text-sand-400'
          }`}>{d}</div>
        ))}
      </div>

      {/* 日付グリッド */}
      <div className="grid grid-cols-7 p-1 gap-y-0.5">
        {cells.map((d, i) => {
          if (!d) return <div key={i} />
          const ds  = toDateStr(calYear, calMonth, d)
          const dt  = new Date(ds + 'T00:00:00')
          const dow = dt.getDay()
          const isThu     = dow === 4
          const isSun     = dow === 0
          const isSelected = ds === value
          const isToday    = ds === todayStr

          return (
            <button
              key={i}
              onClick={() => onChange(ds)}
              title={isThu ? '木曜定休（緊急時のみ登録可）' : undefined}
              className={`relative aspect-square flex items-center justify-center text-[11px] rounded transition-all ${
                isSelected
                  ? 'bg-shore text-cream font-semibold'
                  : isThu
                  ? 'text-sand-300 bg-sand-50 hover:bg-sand-100'
                  : isSun
                  ? 'text-red-400 hover:bg-red-50'
                  : 'text-shore hover:bg-sand-100'
              }`}
            >
              {d}
              {isToday && !isSelected && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-shore" />
              )}
              {isThu && !isSelected && (
                <span className="absolute top-0.5 right-0.5 w-1 h-1 rounded-full bg-sand-300" />
              )}
            </button>
          )
        })}
      </div>

      {/* 選択中の日付表示 */}
      <div className="border-t border-sand-100 px-3 py-1.5 bg-sand-50">
        {value ? (
          <p className="text-[11px] text-shore text-center">
            {new Date(value + 'T00:00:00').toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
            {new Date(value + 'T00:00:00').getDay() === 4 && (
              <span className="ml-1 text-[10px] text-sand-400">（定休日）</span>
            )}
          </p>
        ) : (
          <p className="text-[11px] text-sand-300 text-center">日付を選択</p>
        )}
      </div>
    </div>
  )
}

// ─── 新規予約登録モーダル ──────────────────────────────────────
function NewReservationModal({
  stylists, date, defaultStylistId, defaultTime, onClose, onSaved,
}: {
  stylists: Stylist[]
  date: string
  defaultStylistId: string
  defaultTime: string
  onClose: () => void
  onSaved: () => void
}) {
  const [activeTab,  setActiveTab]  = useState<'reservation' | 'memo'>('reservation')
  const [stylistId,  setStylistId]  = useState(defaultStylistId)
  const [resDate,    setResDate]    = useState(date)
  const [time,       setTime]       = useState(defaultTime)
  const [menuId,     setMenuId]     = useState('')
  const [phone,      setPhone]      = useState('')
  const [name,       setName]       = useState('')
  const [memo,       setMemo]       = useState('')
  const [searching,    setSearching]    = useState(false)
  const [searchHits,   setSearchHits]   = useState<{ id: string; name: string; phone: string }[] | null>(null)
  const [submitting,   setSubmitting]   = useState(false)
  const [error,        setError]        = useState<string | null>(null)

  const selectedMenu = ADMIN_MENUS.find(m => m.id === menuId) ?? null

  async function searchMember() {
    const p = phone.trim()
    const n = name.trim()
    if (!p && !n) return
    setSearching(true)
    setSearchHits(null)
    const params = p ? `phone=${encodeURIComponent(p)}` : `name=${encodeURIComponent(n)}`
    const res  = await fetch(`/api/admin/members?${params}`)
    const json = await res.json()
    setSearching(false)
    setSearchHits(json.members ?? [])
  }

  function selectHit(hit: { id: string; name: string; phone: string }) {
    setName(hit.name)
    setPhone(hit.phone ?? '')
    setSearchHits(null)
  }

  async function submit() {
    if (!selectedMenu || !name.trim()) return
    setSubmitting(true)
    setError(null)
    const res = await fetch('/api/admin/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'reservation',
        name: name.trim(),
        phone: phone.trim() || null,
        menu_id: selectedMenu.id,
        menu_name: selectedMenu.name,
        date: resDate,
        time,
        block_minutes: selectedMenu.block_minutes,
        stylist_id: stylistId || null,
      }),
    })
    const json = await res.json()
    setSubmitting(false)
    if (!res.ok) { setError(json.error ?? '登録に失敗しました') } else { onSaved() }
  }

  async function submitMemo() {
    setSubmitting(true)
    setError(null)
    const res = await fetch('/api/admin/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'memo',
        memo: memo.trim(),
        date: resDate,
        time,
        block_minutes: 30,
        stylist_id: stylistId || null,
      }),
    })
    const json = await res.json()
    setSubmitting(false)
    if (!res.ok) { setError(json.error ?? '登録に失敗しました') } else { onSaved() }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}>
      <div className="bg-white rounded shadow-2xl w-[480px] max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>

        {/* ヘッダー */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-sand-200 bg-sand-50">
          <h2 className="text-sm font-semibold text-shore tracking-wider">新規登録</h2>
          <button onClick={onClose} className="text-sand-300 hover:text-sand-500 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* タブ */}
        <div className="flex border-b border-sand-200">
          {(['reservation', 'memo'] as const).map((tab) => (
            <button key={tab} onClick={() => { setActiveTab(tab); setError(null) }}
              className={`flex-1 py-2.5 text-[12px] tracking-wider border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-shore text-shore font-semibold bg-white'
                  : 'border-transparent text-sand-400 hover:text-sand-600 bg-sand-50'
              }`}>
              {tab === 'reservation' ? '予約を登録する' : '予定を登録する'}
            </button>
          ))}
        </div>

        <div className="p-5 space-y-4">

          {/* 予定タブ */}
          {activeTab === 'memo' && (
            <>
              <div className="border border-sand-200 rounded overflow-hidden">
                <div className="bg-[#f0ebe5] px-4 py-2 border-b border-sand-200">
                  <p className="text-[11px] font-semibold text-sand-600 tracking-wider">予定の内容</p>
                </div>
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-[80px_1fr] items-center gap-3">
                    <label className="text-[11px] text-sand-500">スタイリスト</label>
                    <select value={stylistId} onChange={e => setStylistId(e.target.value)}
                      className="border border-sand-200 rounded px-2 py-1.5 text-[12px] text-shore outline-none focus:border-shore bg-white">
                      {stylists.filter(s => !s.is_free).map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                      <option value="">フリー</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-[80px_1fr] items-center gap-3">
                    <label className="text-[11px] text-sand-500">日時</label>
                    <span className="text-[12px] text-shore">{resDate}（{time}〜）リサイズで変更可</span>
                  </div>
                  <div className="grid grid-cols-[80px_1fr] items-start gap-3">
                    <label className="text-[11px] text-sand-500 pt-2">メモ</label>
                    <textarea
                      value={memo}
                      onChange={e => setMemo(e.target.value)}
                      placeholder="支払い、打ち合わせ、準備など"
                      rows={3}
                      className="border border-sand-200 rounded px-3 py-2 text-[12px] text-shore outline-none focus:border-shore resize-none placeholder:text-sand-300 w-full"
                    />
                  </div>
                </div>
              </div>
              {error && <p className="text-[11px] text-red-500 text-center">{error}</p>}
              <button onClick={submitMemo} disabled={submitting}
                className="w-full py-3 bg-sand-500 text-cream text-[12px] tracking-[0.2em] rounded hover:bg-sand-600 disabled:opacity-40 transition-all">
                {submitting ? '登録中...' : '予定を登録する'}
              </button>
            </>
          )}

          {/* 予約タブ */}
          {activeTab === 'reservation' && <>

          {/* 予約情報 */}
          <div className="border border-sand-200 rounded overflow-hidden">
            <div className="bg-[#f0ebe5] px-4 py-2 border-b border-sand-200">
              <p className="text-[11px] font-semibold text-sand-600 tracking-wider">予約情報</p>
            </div>
            <div className="p-4 space-y-3">

              <div className="grid grid-cols-[80px_1fr] items-center gap-3">
                <label className="text-[11px] text-sand-500">スタイリスト</label>
                <select value={stylistId} onChange={e => setStylistId(e.target.value)}
                  className="border border-sand-200 rounded px-2 py-1.5 text-[12px] text-shore outline-none focus:border-shore bg-white">
                  {stylists.filter(s => !s.is_free).map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                  <option value="">フリー</option>
                </select>
              </div>

              <div className="grid grid-cols-[80px_1fr] items-start gap-3">
                <label className="text-[11px] text-sand-500 pt-2">来店日</label>
                <MiniCalendar value={resDate} onChange={setResDate} />
              </div>

              <div className="grid grid-cols-[80px_1fr] items-center gap-3">
                <label className="text-[11px] text-sand-500">開始時間</label>
                <div className="flex items-center gap-3">
                  <select value={time} onChange={e => setTime(e.target.value)}
                    className="border border-sand-200 rounded px-2 py-1.5 text-[12px] text-shore outline-none focus:border-shore bg-white">
                    {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  {selectedMenu && (
                    <span className="text-[11px] text-sand-400">
                      〜 {endTimeStr(time, selectedMenu.block_minutes)}（{selectedMenu.block_minutes}分）
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-[80px_1fr] items-start gap-3">
                <label className="text-[11px] text-sand-500 pt-2">メニュー</label>
                <select value={menuId} onChange={e => setMenuId(e.target.value)}
                  className="border border-sand-200 rounded px-2 py-1.5 text-[12px] text-shore outline-none focus:border-shore bg-white">
                  <option value="">メニューを選択してください</option>
                  {ADMIN_MENUS.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name}（{m.price_label}・{m.block_minutes}分）
                    </option>
                  ))}
                </select>
              </div>

            </div>
          </div>

          {/* お客様情報 */}
          <div className="border border-sand-200 rounded overflow-hidden">
            <div className="bg-[#f0ebe5] px-4 py-2 border-b border-sand-200">
              <p className="text-[11px] font-semibold text-sand-600 tracking-wider">お客様情報</p>
            </div>
            <div className="p-4 space-y-3">

              <div className="grid grid-cols-[80px_1fr] items-center gap-3">
                <label className="text-[11px] text-sand-500">氏名</label>
                <input type="text" value={name}
                  onChange={e => { setName(e.target.value); setSearchHits(null) }}
                  onKeyDown={e => { if (e.key === 'Enter') searchMember() }}
                  placeholder="山田 花子"
                  className="border border-sand-200 rounded px-2 py-1.5 text-[12px] text-shore outline-none focus:border-shore placeholder:text-sand-300" />
              </div>

              <div className="grid grid-cols-[80px_1fr] items-center gap-3">
                <label className="text-[11px] text-sand-500">電話番号</label>
                <input type="tel" value={phone}
                  onChange={e => { setPhone(e.target.value); setSearchHits(null) }}
                  onKeyDown={e => { if (e.key === 'Enter') searchMember() }}
                  placeholder="090-0000-0000（任意）"
                  className="border border-sand-200 rounded px-2 py-1.5 text-[12px] text-shore outline-none focus:border-shore placeholder:text-sand-300" />
              </div>

              <div className="pl-[92px]">
                <button onClick={searchMember}
                  disabled={searching || (!phone.trim() && !name.trim())}
                  className="text-[11px] px-4 py-1.5 bg-shore text-cream rounded hover:bg-shore/80 disabled:opacity-40 transition-colors">
                  {searching ? '検索中...' : '既存会員を検索する'}
                </button>
                <span className="ml-2 text-[10px] text-sand-400">名前・電話番号どちらかで検索</span>
              </div>

              {/* 検索結果 */}
              {searchHits !== null && (
                <div className="pl-[92px]">
                  {searchHits.length === 0 ? (
                    <p className="text-[11px] text-sand-400">該当する会員が見つかりません。このまま登録できます。</p>
                  ) : (
                    <div className="border border-sand-200 rounded overflow-hidden">
                      {searchHits.map((hit, i) => (
                        <button key={hit.id} onClick={() => selectHit(hit)}
                          className={`w-full text-left px-3 py-2 hover:bg-shore/5 transition-colors flex items-center justify-between ${
                            i > 0 ? 'border-t border-sand-100' : ''
                          }`}>
                          <span className="text-[12px] font-medium text-shore">{hit.name}</span>
                          <span className="text-[11px] text-sand-400">{hit.phone ?? '電話番号なし'}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>

          <>
            {error && <p className="text-[11px] text-red-500 text-center">{error}</p>}
            <button onClick={submit}
              disabled={!selectedMenu || !name.trim() || submitting}
              className="w-full py-3 bg-shore text-cream text-[12px] tracking-[0.2em] rounded hover:bg-shore/80 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
              {submitting ? '登録中...' : '登録する'}
            </button>
          </>

          </> /* end reservation tab */}

        </div>
      </div>
    </div>
  )
}
