'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface Reservation {
  id: string
  date: string
  time: string
  block_minutes: number
  menu_name: string | null
  status: string
  source: string | null
  hp_reservation_id: string | null
}

interface HistoryItem {
  id: string
  date: string
  time: string
  block_minutes: number
  menu_name: string | null
  status: string
  source: string | null
}

interface OrderItem {
  id: string
  name: string
  price: number
  quantity: number
  variant?: string
}

interface Order {
  id: string
  created_at: string
  status: string
  items: OrderItem[]
  subtotal: number
  shipping: number
  total: number
}

interface MemberInfo {
  id: string
  name: string
  phone: string
  email: string
}

interface MemberDetail {
  member_number: number
  grade: string
  points: number
  year_amount: number
  year_visits: number
}

type AuthStep = 'phone' | 'otp'
type ActiveTab = 'reservations' | 'history' | 'orders'

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  const days = ['日', '月', '火', '水', '木', '金', '土']
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${days[d.getDay()]}）`
}

function formatDateShort(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  const days = ['日', '月', '火', '水', '木', '金', '土']
  return `${d.getMonth() + 1}/${d.getDate()}（${days[d.getDay()]}）`
}

function endTime(time: string, minutes: number) {
  const [h, m] = time.split(':').map(Number)
  const end = h * 60 + m + minutes
  return `${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`
}

function formatDateTime(isoStr: string) {
  const d = new Date(isoStr)
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
}

const GRADE_NEXT: Record<string, { next: string; target: number; unit: 'visits' | 'amount' }> = {
  BRONZE:   { next: 'SILVER',   target: 3,      unit: 'visits' },
  SILVER:   { next: 'GOLD',     target: 70000,  unit: 'amount' },
  GOLD:     { next: 'PLATINUM', target: 130000, unit: 'amount' },
  PLATINUM: { next: 'DIAMOND',  target: 200000, unit: 'amount' },
  DIAMOND:  { next: '—',        target: 0,      unit: 'amount' },
}

function GradeCard({ detail }: { detail: MemberDetail }) {
  const gradeInfo = GRADE_NEXT[detail.grade] ?? GRADE_NEXT.BRONZE
  const currentVal = gradeInfo.unit === 'visits' ? detail.year_visits : detail.year_amount
  const progress = gradeInfo.target > 0 ? Math.min((currentVal / gradeInfo.target) * 100, 100) : 100
  const remaining = gradeInfo.unit === 'visits'
    ? Math.max(0, gradeInfo.target - detail.year_visits)
    : Math.max(0, gradeInfo.target - detail.year_amount)

  return (
    <div className="bg-shore rounded-sm p-5 mb-6">
      {/* グレード・ポイント */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex flex-col gap-1.5">
          <p className="text-[9px] tracking-[0.25em] font-sans text-sand-300">MEMBERSHIP GRADE</p>
          <span className="inline-block border border-sand-500 px-2 py-0.5 text-[9px] tracking-[0.25em] font-sans text-sand-300">
            {detail.grade}
          </span>
        </div>
        <div className="text-right">
          <p className="font-sans text-[36px] leading-none text-cream font-light">
            {detail.points.toLocaleString()}<span className="text-sm text-sand-300 ml-0.5">pt</span>
          </p>
          <p className="text-[9px] tracking-[0.15em] font-sans text-sand-300 mt-1">保有ポイント</p>
        </div>
      </div>

      {/* プログレスバー */}
      <div className="mb-2">
        <div className="h-px bg-white/20 w-full">
          <div className="h-px bg-sand-300 transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>
      <p className="text-[10px] tracking-[0.1em] font-sans text-sand-300">
        {gradeInfo.next === '—'
          ? '最上位グレード'
          : progress >= 100
            ? `🎉 ${gradeInfo.next}グレード達成！`
            : gradeInfo.unit === 'visits'
              ? `あと${remaining}回で${gradeInfo.next}`
              : `あと¥${remaining.toLocaleString()}で${gradeInfo.next}`}
      </p>

      {/* 今年の実績 */}
      <div className="flex items-center gap-5 mt-4 pt-4 border-t border-white/10 text-[10px] tracking-[0.1em] font-sans text-sand-300">
        <span>今年の来店 <span className="text-cream">{detail.year_visits}回</span></span>
        <span>今年の利用額 <span className="text-cream">¥{detail.year_amount.toLocaleString()}</span></span>
        <span className="ml-auto">会員番号 <span className="text-cream">{String(detail.member_number).padStart(4, '0')}</span></span>
      </div>
    </div>
  )
}

function MypageContent() {
  const searchParams = useSearchParams()
  const lineError = searchParams.get('error')
  const [member, setMember] = useState<MemberInfo | null>(null)
  const [memberDetail, setMemberDetail] = useState<MemberDetail | null>(null)
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<ActiveTab>('reservations')
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [ordersLoaded, setOrdersLoaded] = useState(false)
  const [loginTab, setLoginTab] = useState<'phone' | 'line'>(lineError ? 'line' : 'phone')
  const [authStep, setAuthStep] = useState<AuthStep>('phone')
  const [loginPhone, setLoginPhone] = useState('')
  const [loginOtp, setLoginOtp] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [cancelTarget, setCancelTarget] = useState<Reservation | null>(null)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [cancelDone, setCancelDone] = useState<string | null>(null)
  const [cancelError, setCancelError] = useState('')

  const fetchReservations = useCallback(async () => {
    const res = await fetch('/api/mypage/reservations')
    if (!res.ok) return
    const data = await res.json()
    setReservations(data.reservations ?? [])
  }, [])

  useEffect(() => {
    ;(async () => {
      const [sessionRes, resvRes] = await Promise.all([
        fetch('/api/mypage/session'),
        fetch('/api/mypage/reservations'),
      ])
      if (!sessionRes.ok) { setLoading(false); return }
      const s = await sessionRes.json()
      setMember(s.member)
      if (resvRes.ok) {
        const d = await resvRes.json()
        setReservations(d.reservations ?? [])
      }
      // grade/points
      const mRes = await fetch('/api/mypage/member')
      if (mRes.ok) {
        const md = await mRes.json()
        setMemberDetail(md.member)
      }
      setLoading(false)
    })()
  }, [])

  useEffect(() => {
    if (activeTab === 'history' && !historyLoaded) {
      fetch('/api/mypage/history').then(r => r.json()).then(d => {
        setHistory(d.history ?? [])
        setHistoryLoaded(true)
      })
    }
    if (activeTab === 'orders' && !ordersLoaded) {
      fetch('/api/mypage/orders').then(r => r.json()).then(d => {
        setOrders(d.orders ?? [])
        setOrdersLoaded(true)
      })
    }
  }, [activeTab, historyLoaded, ordersLoaded])

  async function handleSmsSend() {
    if (!loginPhone.trim()) return
    setLoginLoading(true); setLoginError('')
    const res = await fetch('/api/auth/sms/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: loginPhone }),
    })
    const d = await res.json()
    setLoginLoading(false)
    if (res.ok) { setAuthStep('otp') }
    else { setLoginError(d.error ?? 'SMS送信に失敗しました') }
  }

  async function handleSmsVerify() {
    if (!loginOtp.trim()) return
    setLoginLoading(true); setLoginError('')
    const res = await fetch('/api/auth/sms/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: loginPhone, code: loginOtp }),
    })
    const d = await res.json()
    setLoginLoading(false)
    if (res.ok) {
      if (!d.member?.id) {
        setLoginError('ご予約履歴が見つかりません。ご予約時の電話番号をご入力ください。')
        return
      }
      setMember(d.member)
      fetchReservations()
      const mRes = await fetch('/api/mypage/member')
      if (mRes.ok) { const md = await mRes.json(); setMemberDetail(md.member) }
    } else {
      setLoginError(d.error ?? '認証に失敗しました')
    }
  }

  async function handleCancel() {
    if (!cancelTarget) return
    setCancelLoading(true); setCancelError('')
    const res = await fetch('/api/mypage/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reservation_id: cancelTarget.id }),
    })
    setCancelLoading(false)
    if (res.ok) {
      setCancelDone(cancelTarget.id)
      setCancelTarget(null)
      setReservations(prev => prev.filter(r => r.id !== cancelTarget.id))
    } else {
      const d = await res.json().catch(() => ({}))
      setCancelError(d.error ?? 'キャンセルに失敗しました。お電話にてご連絡ください。')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <p className="text-sand-400 font-sans text-sm">読み込み中...</p>
      </div>
    )
  }

  // ── 未ログイン ──
  if (!member) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <h1 className="font-serif text-2xl text-shore mb-1 text-center">マイページ</h1>
          <p className="text-sand-400 text-xs text-center mb-8 font-sans">ご予約の確認・キャンセルができます</p>

          <div className="flex border-b border-sand-200 mb-6">
            {(['phone', 'line'] as const).map(tab => (
              <button key={tab} onClick={() => { setLoginTab(tab); setLoginError('') }}
                className={`flex-1 py-2.5 text-sm font-sans transition-colors ${
                  loginTab === tab ? 'border-b-2 border-shore text-shore' : 'text-sand-400'
                }`}>
                {tab === 'phone' ? '電話番号でログイン' : 'LINEでログイン'}
              </button>
            ))}
          </div>

          {loginTab === 'phone' && (
            <div className="space-y-4">
              {authStep === 'phone' ? (
                <>
                  <div>
                    <label className="block text-xs text-sand-400 font-sans mb-1">電話番号（ハイフンなし）</label>
                    <input type="tel" value={loginPhone}
                      onChange={e => setLoginPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="09012345678"
                      className="w-full border border-sand-200 rounded px-3 py-2.5 text-sm font-sans focus:outline-none focus:border-sand-400" />
                  </div>
                  {loginError && <p className="text-red-500 text-xs font-sans">{loginError}</p>}
                  <button onClick={handleSmsSend} disabled={loginLoading || loginPhone.length < 10}
                    className="w-full bg-shore text-cream py-3 text-sm font-sans rounded disabled:opacity-40">
                    {loginLoading ? '送信中...' : 'SMSを送信する'}
                  </button>
                </>
              ) : (
                <>
                  <p className="text-xs text-sand-400 font-sans">{loginPhone} に認証コードを送信しました</p>
                  <div>
                    <label className="block text-xs text-sand-400 font-sans mb-1">認証コード</label>
                    <input type="number" value={loginOtp} onChange={e => setLoginOtp(e.target.value)}
                      placeholder="123456"
                      className="w-full border border-sand-200 rounded px-3 py-2.5 text-sm font-sans focus:outline-none focus:border-sand-400" />
                  </div>
                  {loginError && <p className="text-red-500 text-xs font-sans">{loginError}</p>}
                  <button onClick={handleSmsVerify} disabled={loginLoading || !loginOtp.trim()}
                    className="w-full bg-shore text-cream py-3 text-sm font-sans rounded disabled:opacity-40">
                    {loginLoading ? '確認中...' : '確認する'}
                  </button>
                  <button onClick={() => { setAuthStep('phone'); setLoginOtp(''); setLoginError('') }}
                    className="w-full text-sand-400 text-xs font-sans py-1">
                    電話番号を変更する
                  </button>
                </>
              )}
            </div>
          )}

          {loginTab === 'line' && (
            <div className="space-y-4">
              <p className="text-xs text-sand-400 font-sans text-center">アプリでご登録のLINEアカウントでログインできます</p>
              {lineError === 'not_member' && (
                <p className="text-red-500 text-xs font-sans text-center bg-red-50 rounded p-2">
                  このLINEアカウントはまだ会員登録されていません。<br />
                  電話番号でログインするか、アプリから会員登録してください。
                </p>
              )}
              {lineError && lineError !== 'not_member' && (
                <p className="text-red-500 text-xs font-sans text-center bg-red-50 rounded p-2">
                  LINEログインに失敗しました。もう一度お試しください。
                </p>
              )}
              <a href="/api/auth/line?from=mypage"
                className="flex items-center justify-center gap-2 w-full bg-[#06C755] text-white py-3 text-sm font-sans rounded">
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
                  <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                </svg>
                LINEでログイン
              </a>
            </div>
          )}

          <p className="text-center mt-8">
            <Link href="/" className="text-xs text-sand-400 font-sans underline">トップへ戻る</Link>
          </p>
        </div>
      </div>
    )
  }

  // ── ログイン済み ──
  const TABS: { key: ActiveTab; label: string }[] = [
    { key: 'reservations', label: '今後のご予約' },
    { key: 'history',      label: '来店・施術履歴' },
    { key: 'orders',       label: '購入履歴' },
  ]

  return (
    <div className="min-h-screen bg-cream pb-16">
      {/* ヘッダー */}
      <div className="bg-white border-b border-sand-100 px-4 pt-12 pb-5">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-serif text-xl text-shore">マイページ</h1>
            <p className="text-sand-400 text-xs font-sans mt-0.5">{member.name} 様</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={async () => {
                await fetch('/api/mypage/logout', { method: 'POST' })
                setMember(null)
                setMemberDetail(null)
                setReservations([])
                setHistory([])
                setOrders([])
                setHistoryLoaded(false)
                setOrdersLoaded(false)
              }}
              className="text-xs text-sand-400 font-sans hover:text-shore transition-colors"
            >
              ログアウト
            </button>
            <Link href="/" className="text-xs text-sand-400 font-sans underline">トップへ</Link>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6">
        {/* グレード・ポイントカード */}
        {memberDetail && <GradeCard detail={memberDetail} />}

        {/* タブ */}
        <div className="flex border-b border-sand-200 mb-6 -mx-4 px-4">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`flex-1 py-3 text-[11px] tracking-[0.1em] font-sans transition-colors ${
                activeTab === t.key
                  ? 'border-b-2 border-shore text-shore font-medium'
                  : 'text-sand-400'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── 今後のご予約 ── */}
        {activeTab === 'reservations' && (
          <>
            {cancelDone && (
              <div className="mb-4 bg-sand-100 border border-sand-200 rounded p-3">
                <p className="text-sm font-sans text-shore">キャンセルしました。またのご来店をお待ちしております。</p>
              </div>
            )}
            {reservations.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-sand-400 text-sm font-sans">現在のご予約はありません</p>
                <Link href="/reservation" className="mt-4 inline-block text-xs font-sans text-shore underline">予約する</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {reservations.map(r => (
                  <div key={r.id} className="bg-white border border-sand-100 rounded-xl p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-sans text-sm text-shore font-medium">{formatDate(r.date)}</p>
                        <p className="font-sans text-xs text-sand-400 mt-0.5">{r.time} 〜 {endTime(r.time, r.block_minutes)}</p>
                        <p className="font-sans text-sm text-sand-500 mt-2 leading-snug">{r.menu_name ?? 'メニュー未登録'}</p>
                        {r.source === 'hotpepper' && (
                          <span className="inline-block mt-1.5 text-[10px] font-sans bg-orange-50 text-orange-500 border border-orange-200 rounded px-1.5 py-0.5">
                            ホットペッパー予約
                          </span>
                        )}
                      </div>
                      {r.source !== 'hotpepper' && (
                        <button onClick={() => setCancelTarget(r)}
                          className="flex-shrink-0 text-xs font-sans text-sand-400 border border-sand-200 rounded px-3 py-1.5 hover:border-red-300 hover:text-red-400 transition-colors">
                          キャンセル
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-8 bg-sand-100 rounded-xl p-4">
              <h3 className="font-sans text-xs text-sand-500 font-medium mb-2">キャンセルポリシー</h3>
              <ul className="text-xs text-sand-400 font-sans space-y-1 list-disc list-inside">
                <li>当日のキャンセルも承ります。お気軽にご連絡ください</li>
                <li>ホットペッパー経由のご予約はホットペッパーよりキャンセルをお願いします</li>
              </ul>
            </div>
            <p className="text-center mt-6">
              <Link href="/reservation" className="text-xs font-sans text-shore underline">新しい予約をする</Link>
            </p>
          </>
        )}

        {/* ── 来店・施術履歴 ── */}
        {activeTab === 'history' && (
          <>
            {!historyLoaded ? (
              <p className="text-center text-sand-400 text-sm font-sans py-16">読み込み中...</p>
            ) : history.length === 0 ? (
              <p className="text-center text-sand-400 text-sm font-sans py-16">来店履歴がありません</p>
            ) : (
              <div className="space-y-2">
                {history.map(h => (
                  <div key={h.id} className="bg-white border border-sand-100 rounded-xl p-4 flex items-center gap-4">
                    <div className="text-center min-w-[52px]">
                      <p className="font-sans text-xs text-sand-400">{formatDateShort(h.date)}</p>
                    </div>
                    <div className="flex-1 min-w-0 border-l border-sand-100 pl-4">
                      <p className="font-sans text-sm text-sand-600 leading-snug">{h.menu_name ?? 'メニュー未登録'}</p>
                      <p className="font-sans text-xs text-sand-400 mt-0.5">{h.time} 〜 {endTime(h.time, h.block_minutes)}</p>
                    </div>
                    {h.source === 'hotpepper' && (
                      <span className="flex-shrink-0 text-[10px] font-sans bg-orange-50 text-orange-400 border border-orange-200 rounded px-1.5 py-0.5">HP</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── 購入履歴 ── */}
        {activeTab === 'orders' && (
          <>
            {!ordersLoaded ? (
              <p className="text-center text-sand-400 text-sm font-sans py-16">読み込み中...</p>
            ) : orders.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-sand-400 text-sm font-sans">購入履歴がありません</p>
                <Link href="/shop" className="mt-4 inline-block text-xs font-sans text-shore underline">ショップを見る</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map(o => (
                  <div key={o.id} className="bg-white border border-sand-100 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-sans text-xs text-sand-400">{formatDateTime(o.created_at)}</p>
                      <span className={`text-[10px] font-sans px-2 py-0.5 rounded-full ${
                        o.status === 'shipped' ? 'bg-green-50 text-green-600 border border-green-200' :
                        o.status === 'paid'    ? 'bg-blue-50 text-blue-500 border border-blue-200' :
                        'bg-sand-100 text-sand-400 border border-sand-200'
                      }`}>
                        {o.status === 'shipped' ? '発送済み' : o.status === 'paid' ? '準備中' : o.status}
                      </span>
                    </div>
                    {Array.isArray(o.items) && o.items.map((item, i) => (
                      <div key={i} className="flex items-center justify-between py-1.5 border-b border-sand-50 last:border-0">
                        <div className="flex-1 min-w-0">
                          <p className="font-sans text-sm text-sand-600 truncate">{item.name}</p>
                          {item.variant && <p className="font-sans text-xs text-sand-400">{item.variant}</p>}
                        </div>
                        <div className="text-right ml-4 flex-shrink-0">
                          <p className="font-sans text-xs text-sand-400">×{item.quantity}</p>
                          <p className="font-sans text-sm text-sand-600">¥{(item.price * item.quantity).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-sand-100">
                      <p className="font-sans text-xs text-sand-400">合計（送料含む）</p>
                      <p className="font-sans text-sm font-medium text-shore">¥{o.total.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* キャンセル確認モーダル */}
      {cancelTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-sans text-base text-shore font-medium mb-4">予約をキャンセルしますか？</h3>
            <div className="bg-sand-100 rounded p-3 mb-6">
              <p className="font-sans text-sm text-shore">{formatDate(cancelTarget.date)}</p>
              <p className="font-sans text-xs text-sand-400 mt-0.5">
                {cancelTarget.time} 〜 {endTime(cancelTarget.time, cancelTarget.block_minutes)}
              </p>
              <p className="font-sans text-sm text-sand-500 mt-1.5">{cancelTarget.menu_name}</p>
            </div>
            <p className="text-xs text-sand-400 font-sans mb-4">
              キャンセル後の取り消しはできません。
            </p>
            {cancelError && (
              <p className="text-red-500 text-xs font-sans mb-4 bg-red-50 rounded p-2">{cancelError}</p>
            )}
            <div className="flex gap-3">
              <button onClick={() => { setCancelTarget(null); setCancelError('') }}
                className="flex-1 border border-sand-200 text-sand-400 py-2.5 text-sm font-sans rounded">
                戻る
              </button>
              <button onClick={handleCancel} disabled={cancelLoading}
                className="flex-1 bg-red-500 text-white py-2.5 text-sm font-sans rounded disabled:opacity-40">
                {cancelLoading ? 'キャンセル中...' : 'キャンセルする'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function MypagePage() {
  return (
    <Suspense>
      <MypageContent />
    </Suspense>
  )
}
