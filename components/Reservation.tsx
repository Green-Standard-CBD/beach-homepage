'use client'

import { useState, useEffect } from 'react'

// ========== Types ==========
type PriceType = 'normal' | 'same_day'
type MenuCategory = 'all' | 'cut' | 'color' | 'perm' | 'straight' | 'treatment' | 'spa' | 'set'
type Stylist = 'none' | 'fujino'
type Step = 'menu' | 'datetime' | 'info' | 'confirm' | 'done'
type LoginTab = 'phone' | 'line'

interface MenuItem {
  id: string
  name: string
  price_label: string
  block_minutes: number
  category: Exclude<MenuCategory, 'all'>
  description: string
  price_type: PriceType
}

interface Member {
  id: string
  name: string
  phone: string
}

// ========== Menu Data ==========
const MENUS: MenuItem[] = [
  // カット
  { id: 'cut',               name: 'カット',                   price_label: '¥4,500',        block_minutes: 90,  category: 'cut',       description: 'カット + ブロー仕上げ',        price_type: 'normal' },
  { id: 'school_cut',        name: 'スクールカット',           price_label: '¥4,000',        block_minutes: 60,  category: 'cut',       description: '高校生以下対象',               price_type: 'normal' },
  { id: 'face_cut',          name: 'フェイスラインカット',     price_label: '¥1,500〜',      block_minutes: 30,  category: 'cut',       description: '会員¥1,500 / 新規¥2,500',     price_type: 'normal' },
  { id: 'bang_cut',          name: '前髪カット',               price_label: '¥700',          block_minutes: 30,  category: 'cut',       description: '前髪のみのカット',             price_type: 'normal' },
  // カラー
  { id: 'full_color',        name: 'フルカラー',               price_label: '¥6,300',        block_minutes: 120, category: 'color',     description: 'フルカラー・リタッチ',         price_type: 'normal' },
  { id: 'highlight',         name: 'テクニカルカラー',         price_label: '¥3,800〜6,800', block_minutes: 120, category: 'color',     description: 'ハイライト・バレイヤージュなど', price_type: 'normal' },
  { id: 'henna',             name: 'ヘナ（植物性カラー）',     price_label: '¥7,300〜',      block_minutes: 150, category: 'color',     description: '低刺激の植物性カラー',         price_type: 'normal' },
  { id: 'manicure',          name: 'ヘアマニキュア',           price_label: '¥7,300〜',      block_minutes: 120, category: 'color',     description: '艶出し・色味調整',             price_type: 'normal' },
  { id: 'bleach',            name: 'ブリーチ',                 price_label: '¥9,000',        block_minutes: 120, category: 'color',     description: '脱色・ハイトーンカラー',       price_type: 'normal' },
  { id: 'double_bleach',     name: 'ダブルブリーチ',           price_label: '¥18,000',       block_minutes: 210, category: 'color',     description: '2回ブリーチ・ハイダメージ対応', price_type: 'normal' },
  // パーマ
  { id: 'perm',              name: 'スタンダードパーマ',       price_label: '¥7,300〜',      block_minutes: 150, category: 'perm',      description: 'コールドパーマ',               price_type: 'normal' },
  { id: 'digital_perm',      name: 'デジタルパーマ',           price_label: '¥9,500〜',      block_minutes: 210, category: 'perm',      description: '持続力の高いデジタルパーマ',   price_type: 'normal' },
  { id: 'special_perm',      name: '特殊パーマ',               price_label: '¥24,000〜',     block_minutes: 360, category: 'perm',      description: 'ツイスト・針金等の特殊パーマ', price_type: 'normal' },
  // 縮毛矯正
  { id: 'straight',          name: '縮毛矯正',                 price_label: '¥12,500〜',     block_minutes: 270, category: 'straight',  description: 'シャンプー・ブロー込み',       price_type: 'normal' },
  { id: 'kamishitsu',        name: '髪質改善トリートメント',   price_label: '¥15,800',       block_minutes: 210, category: 'straight',  description: '髪質改善・ダメージレス',       price_type: 'normal' },
  // トリートメント
  { id: 'treatment_l',       name: 'トリートメント (ライト)',   price_label: '¥4,500',        block_minutes: 60,  category: 'treatment', description: '3stepヘアケア',                price_type: 'normal' },
  { id: 'treatment_premium', name: 'プレミアムトリートメント', price_label: '¥7,000',        block_minutes: 90,  category: 'treatment', description: '7段階補修・高濃度トリートメント', price_type: 'normal' },
  // ヘッドスパ
  { id: 'head_spa_20',       name: 'ヘッドスパ（20分）',       price_label: '¥5,000',        block_minutes: 60,  category: 'spa',       description: '頭皮ケア・リラクゼーション',   price_type: 'normal' },
  { id: 'head_spa_30',       name: 'ヘッドスパ（30分）',       price_label: '¥6,000',        block_minutes: 60,  category: 'spa',       description: '30分たっぷりのヘッドスパ',     price_type: 'normal' },
  { id: 'head_spa_60',       name: 'ヘッドスパ（60分）',       price_label: '¥9,000',        block_minutes: 90,  category: 'spa',       description: '60分のフルコースヘッドスパ',   price_type: 'normal' },
  // トリートメントコース
  { id: 'cut_tr',            name: 'カット＋トリートメント (ライト)',                price_label: '¥5,500',  block_minutes: 120, category: 'set', description: 'トリートメントコース', price_type: 'normal' },
  { id: 'color_tr',          name: 'カラー＋トリートメント',                        price_label: '¥7,500',  block_minutes: 150, category: 'set', description: 'トリートメントコース', price_type: 'normal' },
  { id: 'henna_mani_tr',     name: 'ヘナorマニキュア＋トリートメント',              price_label: '¥8,500',  block_minutes: 150, category: 'set', description: 'トリートメントコース', price_type: 'normal' },
  { id: 'cut_mani_henna',    name: 'カット＋ヘアマニキュアorヘナカラー',            price_label: '¥8,500',  block_minutes: 150, category: 'set', description: 'トリートメントコース', price_type: 'normal' },
  { id: 'cut_color_tr',      name: 'カット＋カラー＋トリートメント (ライト)',        price_label: '¥11,500', block_minutes: 210, category: 'set', description: 'トリートメントコース', price_type: 'normal' },
  { id: 'cut_perm_tr',       name: 'カット＋パーマ＋トリートメント (ライト)',        price_label: '¥12,500', block_minutes: 240, category: 'set', description: 'トリートメントコース', price_type: 'normal' },
  { id: 'cut_dperm_tr',      name: 'カット＋デジタルパーマ＋トリートメント (ライト)', price_label: '¥14,800', block_minutes: 300, category: 'set', description: 'トリートメントコース', price_type: 'normal' },
  { id: 'cut_str_tr',        name: 'カット＋縮毛矯正＋トリートメント (ライト)',      price_label: '¥17,800', block_minutes: 330, category: 'set', description: 'トリートメントコース', price_type: 'normal' },
  { id: 'tr_premium_up',     name: '＋プレミアムアップグレード',                    price_label: '¥2,500',  block_minutes: 30,  category: 'set', description: 'トリートメントをプレミアムにアップグレード', price_type: 'normal' },
  // ヘッドスパコース
  { id: 'cut_spa',           name: 'カット＋ヘッドスパ (20分)',                     price_label: '¥8,500',  block_minutes: 120, category: 'set', description: 'ヘッドスパコース', price_type: 'normal' },
  { id: 'color_spa',         name: 'カラー＋ヘッドスパ',                            price_label: '¥8,500',  block_minutes: 150, category: 'set', description: 'ヘッドスパコース', price_type: 'normal' },
  { id: 'henna_mani_spa',    name: 'ヘナorマニキュア＋ヘッドスパ',                  price_label: '¥9,500',  block_minutes: 150, category: 'set', description: 'ヘッドスパコース', price_type: 'normal' },
  { id: 'cut_color_spa',     name: 'カット＋カラー＋ヘッドスパ (20分)',              price_label: '¥12,500', block_minutes: 210, category: 'set', description: 'ヘッドスパコース', price_type: 'normal' },
  { id: 'cut_perm_spa',      name: 'カット＋パーマ＋ヘッドスパ (20分)',              price_label: '¥13,500', block_minutes: 240, category: 'set', description: 'ヘッドスパコース', price_type: 'normal' },
  { id: 'cut_dperm_spa',     name: 'カット＋デジタルパーマ＋ヘッドスパ (20分)',      price_label: '¥15,800', block_minutes: 270, category: 'set', description: 'ヘッドスパコース', price_type: 'normal' },
  { id: 'cut_str_spa',       name: 'カット＋縮毛矯正＋ヘッドスパ (20分)',            price_label: '¥18,800', block_minutes: 330, category: 'set', description: 'ヘッドスパコース', price_type: 'normal' },
  { id: 'spa_up_30',         name: '＋ヘッドスパアップグレード (30分)',               price_label: '¥1,000',  block_minutes: 30,  category: 'set', description: 'ヘッドスパを30分にアップグレード', price_type: 'normal' },
  { id: 'spa_premium_60',    name: '＋プレミアムアップグレード (60分)',                price_label: '¥5,000',  block_minutes: 70,  category: 'set', description: 'ヘッドスパをプレミアム60分にアップグレード', price_type: 'normal' },
]

const CATEGORIES: { key: MenuCategory; label: string }[] = [
  { key: 'all',       label: 'すべて' },
  { key: 'set',       label: 'コース' },
  { key: 'cut',       label: 'カット' },
  { key: 'color',     label: 'カラー' },
  { key: 'perm',      label: 'パーマ' },
  { key: 'straight',  label: '縮毛矯正' },
  { key: 'treatment', label: 'トリートメント' },
  { key: 'spa',       label: 'ヘッドスパ' },
]

const ALL_TIMES = [
  '10:00','10:30','11:00','11:30',
  '12:00','12:30','13:00','13:30',
  '14:00','14:30','15:00','15:30',
  '16:00','16:30','17:00','17:30','18:00',
]

const DOW = ['日','月','火','水','木','金','土']
const STEP_LABELS = ['メニューを選ぶ', '日時を指定する', 'お客様情報', '予約内容の確認']

// ========== Helpers ==========
function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r
}
function isThu(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').getDay() === 4
}
function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getMonth()+1}/${d.getDate()}（${DOW[d.getDay()]}）`
}

// ========== Component ==========
export default function Reservation() {
  const [step, setStep] = useState<Step>('menu')

  // Step 1
  const [category, setCategory] = useState<MenuCategory>('set')
  const [selectedMenus, setSelectedMenus] = useState<MenuItem[]>([])
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set())

  // Step 2
  const [weekStart, setWeekStart] = useState<Date>(() => { const d = new Date(); d.setHours(0,0,0,0); return d })
  const [availability, setAvailability] = useState<Record<string, Record<string, boolean>>>({})
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedStylist, setSelectedStylist] = useState<Stylist>('none')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)

  // Login modal
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [loginTab, setLoginTab] = useState<LoginTab>('phone')
  const [loginPhone, setLoginPhone] = useState('')
  const [loginOtp, setLoginOtp] = useState('')
  const [loginStep, setLoginStep] = useState<'phone' | 'otp'>('phone')
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)

  // Auth
  const [member, setMember] = useState<Member | null>(null)
  const [isLineMember, setIsLineMember] = useState(false)

  // Step 3
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [cancelAgreed, setCancelAgreed] = useState(false)

  // Step 4
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalBlock = selectedMenus.reduce((s, m) => s + m.block_minutes, 0)
  const weekDates = Array.from({ length: 7 }, (_, i) => toDateStr(addDays(weekStart, i)))
  const todayStr = toDateStr(new Date())

  // ── Load bookmarks from localStorage ──
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('reservation_bookmarks') ?? '[]')
      setBookmarks(new Set(saved))
    } catch {}
  }, [])

  // ── Check session on mount + handle LINE return ──
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const urlError = params.get('error')

    const saved = localStorage.getItem('beach_reservation_state')
    if (saved) {
      localStorage.removeItem('beach_reservation_state')
      // URLのerrorパラメータをクリア
      window.history.replaceState({}, '', '/reservation')

      // URLエラーがある場合（LINE認証失敗）→ 日時選択に戻してモーダルを再表示
      if (urlError) {
        try {
          const state = JSON.parse(saved)
          if (state.selectedMenus) setSelectedMenus(state.selectedMenus)
          if (state.selectedStylist) setSelectedStylist(state.selectedStylist)
          if (state.selectedDate) setSelectedDate(state.selectedDate)
          if (state.selectedTime) setSelectedTime(state.selectedTime)
          if (state.weekStart) setWeekStart(new Date(state.weekStart))
        } catch {}
        setStep('datetime')
        setShowLoginModal(true)
        setLoginTab('line')
        setLoginError('LINEログインに失敗しました。再度お試しください。')
        return
      }

      // 正常なLINE認証後 → sessionを取得
      try {
        const state = JSON.parse(saved)
        if (state.selectedMenus) setSelectedMenus(state.selectedMenus)
        if (state.selectedStylist) setSelectedStylist(state.selectedStylist)
        if (state.selectedDate) setSelectedDate(state.selectedDate)
        if (state.selectedTime) setSelectedTime(state.selectedTime)
        if (state.weekStart) setWeekStart(new Date(state.weekStart))
      } catch {}

      fetch('/api/auth/line/session').then(r => r.json()).then(d => {
        if (d.member) {
          setMember(d.member)
          setName(d.member.name ?? '')
          setPhone(d.member.phone ?? '')
          setEmail(d.member.email ?? '')
          setIsLineMember(true)
          setStep('info')
        } else {
          // セッション取得失敗 → 日時選択に戻してモーダルを再表示
          setStep('datetime')
          setShowLoginModal(true)
          setLoginTab('line')
          setLoginError('LINEログインに失敗しました。再度お試しください。')
        }
      }).catch(() => {
        setStep('datetime')
        setShowLoginModal(true)
        setLoginTab('line')
        setLoginError('LINEログインに失敗しました。再度お試しください。')
      })
    } else {
      // 通常のページロード → 既存セッション確認
      if (urlError) window.history.replaceState({}, '', '/reservation')
      fetch('/api/auth/member-session').then(r => r.json()).then(d => {
        if (d.member) {
          setMember(d.member)
          setName(d.member.name ?? '')
          setPhone(d.member.phone ?? '')
        }
      }).catch(() => {})
    }
  }, [])

  // ── Load week availability ──
  useEffect(() => {
    if (step !== 'datetime' || totalBlock === 0) return
    setLoadingSlots(true)
    fetch(`/api/slots-week?start=${weekDates[0]}&block=${totalBlock}`)
      .then(r => r.json())
      .then(d => { setAvailability(d.availability ?? {}); setLoadingSlots(false) })
      .catch(() => setLoadingSlots(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart, step, totalBlock])

  const toggleBookmark = (id: string) => {
    setBookmarks(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      localStorage.setItem('reservation_bookmarks', JSON.stringify([...next]))
      return next
    })
  }

  const toggleMenu = (m: MenuItem) => {
    setSelectedMenus(prev =>
      prev.find(x => x.id === m.id) ? prev.filter(x => x.id !== m.id) : [...prev, m]
    )
  }

  const handleCellClick = (date: string, time: string) => {
    if (!availability[date]?.[time]) return
    setSelectedDate(date)
    setSelectedTime(time)
    if (member) {
      setStep('info')
    } else {
      setShowLoginModal(true)
    }
  }

  const sendOtp = async () => {
    setLoginLoading(true); setLoginError(null)
    const res = await fetch('/api/auth/sms/send', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: loginPhone }),
    })
    setLoginLoading(false)
    if (res.ok) {
      setLoginStep('otp')
    } else {
      const d = await res.json()
      setLoginError(d.error ?? 'SMS送信に失敗しました')
    }
  }

  const verifyOtp = async () => {
    setLoginLoading(true); setLoginError(null)
    const res = await fetch('/api/auth/sms/verify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: loginPhone, code: loginOtp }),
    })
    const d = await res.json()
    setLoginLoading(false)
    if (res.ok && d.member) {
      setMember(d.member)
      setName(d.member.name ?? '')
      setPhone(d.member.phone ?? loginPhone)
      setEmail(d.member.email ?? '')
      setShowLoginModal(false)
      setStep('info')
    } else {
      setLoginError(d.error ?? '認証に失敗しました')
    }
  }

  const handleLineLogin = () => {
    // localStorage を使う（sessionStorage はSafari/iOSのクロスオリジン遷移でクリアされる）
    localStorage.setItem('beach_reservation_state', JSON.stringify({
      selectedMenus, selectedStylist, selectedDate, selectedTime,
      weekStart: weekStart.toISOString(),
    }))
    window.location.href = '/api/auth/line?from=reservation'
  }

  const submit = async () => {
    if (!selectedDate || !selectedTime || !name.trim() || !phone.trim() || !cancelAgreed) return
    setSubmitting(true); setError(null)
    const res = await fetch('/api/reserve', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(), phone: phone.trim(), email: email.trim(),
        menu_id: selectedMenus.map(m => m.id).join(','),
        menu_name: selectedMenus.map(m => m.name).join('・'),
        date: selectedDate, time: selectedTime,
        block_minutes: totalBlock,
        stylist_id: selectedStylist === 'fujino' ? 'fujino' : null,
      }),
    })
    const json = await res.json()
    setSubmitting(false)
    if (!res.ok) { setError(json.error ?? '予約に失敗しました') } else { setStep('done') }
  }

  const stepIndex = ['menu','datetime','info','confirm'].indexOf(step)

  // ========== RENDER ==========
  return (
    <section className="py-16 md:py-24 bg-cream min-h-screen">
      <div className="max-w-3xl mx-auto px-4 md:px-6">

        {/* ── Title ── */}
        <div className="text-center mb-10">
          <p className="text-[10px] tracking-[0.5em] text-sand-400 mb-4">BOOKING</p>
          <h2 className="font-serif text-3xl md:text-4xl font-light text-shore italic">Reservation</h2>
        </div>

        {/* ── Step indicator ── */}
        {step !== 'done' && (
          <div className="flex items-center mb-10">
            {STEP_LABELS.map((label, i) => (
              <div key={i} className="flex items-center flex-1 min-w-0">
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium mb-1 transition-colors ${
                    i === stepIndex ? 'bg-shore text-cream' :
                    i < stepIndex  ? 'bg-shore/30 text-shore' :
                                     'bg-sand-200 text-sand-400'
                  }`}>{i + 1}</div>
                  <span className={`hidden md:block text-[10px] tracking-wide transition-colors ${
                    i === stepIndex ? 'text-shore font-medium' : 'text-sand-400'
                  }`}>{label}</span>
                </div>
                {i < STEP_LABELS.length - 1 && (
                  <div className={`flex-none w-3 md:w-6 h-px mb-4 ${i < stepIndex ? 'bg-shore/40' : 'bg-sand-200'}`} />
                )}
              </div>
            ))}
          </div>
        )}

        {/* ===== STEP 1: MENU ===== */}
        {step === 'menu' && (
          <div>
            {/* Category tabs */}
            <div className="flex gap-0 overflow-x-auto border-b border-sand-200 mb-6 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
              {CATEGORIES.map(c => (
                <button key={c.key} onClick={() => setCategory(c.key)}
                  className={`flex-none px-4 py-2.5 text-[11px] tracking-[0.12em] border-b-2 transition-colors whitespace-nowrap ${
                    category === c.key ? 'border-shore text-shore font-medium' : 'border-transparent text-sand-400 hover:text-shore/70'
                  }`}>
                  {c.label}
                </button>
              ))}
            </div>

            {/* Menu cards */}
            <div className="space-y-2 mb-32">
              {MENUS.filter(m => category === 'all' || m.category === category).map(m => {
                const isSelected = selectedMenus.some(x => x.id === m.id)
                const isBookmarked = bookmarks.has(m.id)
                return (
                  <div key={m.id} onClick={() => toggleMenu(m)}
                    className={`border transition-all cursor-pointer ${
                      isSelected ? 'border-shore bg-shore/5' : 'border-sand-200 bg-white hover:border-shore/40'
                    }`}>
                    <div className="flex items-start gap-3 p-4">
                      {/* Checkbox */}
                      <div className={`flex-none w-5 h-5 rounded-sm border-2 mt-0.5 flex items-center justify-center transition-colors ${
                        isSelected ? 'border-shore bg-shore' : 'border-sand-300'
                      }`}>
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm text-shore font-medium">{m.name}</p>
                            <p className="text-[11px] text-sand-400 mt-0.5">{m.description}</p>
                            <p className="text-[10px] text-sand-300 mt-1">所要時間目安：約{m.block_minutes}分</p>
                          </div>
                          <p className="flex-none font-serif text-sm text-shore whitespace-nowrap">{m.price_label}</p>
                        </div>
                      </div>
                      {/* Bookmark */}
                      <button onClick={e => { e.stopPropagation(); toggleBookmark(m.id) }}
                        className="flex-none p-1 transition-colors text-sand-300 hover:text-shore">
                        <svg className="w-4 h-4" fill={isBookmarked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Bottom bar */}
            {selectedMenus.length > 0 && (
              <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-sand-200 px-4 py-3 flex items-center gap-4 z-30 shadow-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-sand-400 truncate">{selectedMenus.map(m => m.name).join('・')}</p>
                  <p className="text-[10px] text-sand-300">合計約{totalBlock}分</p>
                </div>
                <button onClick={() => setStep('datetime')}
                  className="flex-none px-8 py-3 bg-shore text-cream text-[11px] tracking-[0.2em] hover:bg-shore/80 transition-colors">
                  日時を選ぶ →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ===== STEP 2: DATETIME ===== */}
        {step === 'datetime' && (
          <div>
            <button onClick={() => setStep('menu')}
              className="flex items-center gap-2 text-[11px] tracking-[0.2em] text-sand-400 hover:text-shore mb-6 transition-colors">
              ← メニューを変更する
            </button>

            {/* Selected menus summary */}
            <div className="bg-sand-50 border border-sand-100 p-4 mb-6">
              <p className="text-[10px] tracking-[0.3em] text-sand-400 mb-2">選択中のメニュー</p>
              <div className="flex flex-wrap gap-2">
                {selectedMenus.map(m => (
                  <span key={m.id} className="px-3 py-1 bg-white border border-shore/30 text-shore text-[11px]">
                    {m.name}　{m.price_label}
                  </span>
                ))}
              </div>
              <p className="text-[10px] text-sand-400 mt-2">合計所要時間 約{totalBlock}分</p>
            </div>

            {/* Stylist */}
            <div className="mb-6">
              <p className="text-[10px] tracking-[0.3em] text-sand-400 mb-3">スタイリストを指名</p>
              <div className="flex gap-2">
                {([{ key: 'none', label: '指名なし' }, { key: 'fujino', label: '藤野 翔' }] as const).map(s => (
                  <button key={s.key} onClick={() => setSelectedStylist(s.key)}
                    className={`px-5 py-2 text-[12px] border transition-all ${
                      selectedStylist === s.key ? 'border-shore bg-shore text-cream' : 'border-sand-200 text-shore hover:border-shore/60'
                    }`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid header */}
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] tracking-[0.3em] text-sand-400">日時を選択</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setWeekStart(prev => addDays(prev, -7))}
                  disabled={toDateStr(weekStart) <= todayStr}
                  className="w-7 h-7 border border-sand-200 text-sand-400 hover:border-shore hover:text-shore disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm flex items-center justify-center">
                  ←
                </button>
                <span className="text-[11px] text-sand-400 tabular-nums">
                  {weekDates[0].slice(5).replace('-','/')} 〜 {weekDates[6].slice(5).replace('-','/')}
                </span>
                <button
                  onClick={() => setWeekStart(prev => addDays(prev, 7))}
                  className="w-7 h-7 border border-sand-200 text-sand-400 hover:border-shore hover:text-shore transition-colors text-sm flex items-center justify-center">
                  →
                </button>
              </div>
            </div>

            {/* Grid */}
            <div className="border border-sand-200 overflow-x-auto">
              <table className="border-collapse w-full">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 bg-[#faf7f3] w-14 min-w-[56px] border-r border-b border-sand-100" />
                    {weekDates.map(date => {
                      const d = new Date(date + 'T00:00:00')
                      const isToday = date === todayStr
                      const isThuDay = isThu(date)
                      return (
                        <th key={date} className={`border-b border-sand-100 px-1 py-2 text-center min-w-[44px] ${
                          isToday ? 'bg-shore/8' : isThuDay ? 'bg-sand-50' : 'bg-white'
                        }`} style={{ backgroundColor: isToday ? 'rgba(var(--color-shore)/0.06)' : undefined }}>
                          <p className={`text-[11px] font-medium ${isThuDay ? 'text-sand-300' : isToday ? 'text-shore' : 'text-sand-600'}`}>
                            {d.getMonth()+1}/{d.getDate()}
                          </p>
                          <p className={`text-[10px] ${
                            d.getDay() === 0 ? 'text-red-400' :
                            d.getDay() === 6 ? 'text-blue-400' :
                            isThuDay ? 'text-sand-300' : 'text-sand-400'
                          }`}>{DOW[d.getDay()]}</p>
                          {isThuDay && <p className="text-[8px] text-sand-300 leading-3">定休</p>}
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {ALL_TIMES.map(time => (
                    <tr key={time} className="group">
                      <td className="sticky left-0 z-10 bg-[#faf7f3] border-r border-b border-sand-100 px-2 h-9 text-[10px] text-sand-400 text-right tabular-nums">
                        {time}
                      </td>
                      {weekDates.map(date => {
                        const isToday = date === todayStr
                        const isThuDay = isThu(date)
                        const avail = availability[date]?.[time]
                        const isSelected = selectedDate === date && selectedTime === time
                        return (
                          <td key={date}
                            onClick={() => avail && handleCellClick(date, time)}
                            className={`border-b border-sand-100 text-center h-9 min-w-[44px] transition-colors ${
                              avail ? 'cursor-pointer hover:bg-[#fdf0f0]' : ''
                            } ${isToday && !isThuDay ? 'bg-[#fdfbf8]' : ''}`}>
                            {loadingSlots ? (
                              <span className="text-[9px] text-sand-200">…</span>
                            ) : isThuDay ? (
                              <span className="text-[10px] text-sand-200">—</span>
                            ) : avail === undefined ? (
                              <span className="text-[9px] text-sand-200">—</span>
                            ) : isSelected ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-shore text-cream text-[11px] font-bold">✓</span>
                            ) : avail ? (
                              <span className="text-[16px] text-[#d94f4f] leading-none">○</span>
                            ) : (
                              <span className="text-[12px] text-sand-300">×</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="flex gap-5 mt-2 text-[10px] text-sand-400">
              <span><span className="text-[#d94f4f]">○</span> 予約できます</span>
              <span><span className="text-sand-300">×</span> 予約できません</span>
            </div>
          </div>
        )}

        {/* ===== STEP 3: INFO ===== */}
        {step === 'info' && (
          <div>
            <button onClick={() => setStep('datetime')}
              className="flex items-center gap-2 text-[11px] tracking-[0.2em] text-sand-400 hover:text-shore mb-6 transition-colors">
              ← 日時を変更する
            </button>

            {/* Summary */}
            <div className="bg-sand-50 border border-sand-100 p-4 mb-8 space-y-1.5">
              <p className="text-sm text-shore font-medium">{selectedMenus.map(m => m.name).join('・')}</p>
              <p className="text-[12px] text-sand-400">
                {selectedDate && formatDate(selectedDate)}　{selectedTime}〜　約{totalBlock}分
              </p>
              <p className="text-[11px] text-sand-400">
                スタイリスト：{selectedStylist === 'fujino' ? '藤野 翔' : '指名なし'}
              </p>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-[10px] tracking-[0.3em] text-sand-400 mb-2">
                  お名前 <span className="text-red-400 ml-1">必須</span>
                </label>
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="山田 花子"
                  className="w-full border border-sand-200 focus:border-shore outline-none px-4 py-3 text-sm text-shore placeholder:text-sand-300 bg-white transition-colors" />
              </div>
              <div>
                <label className="block text-[10px] tracking-[0.3em] text-sand-400 mb-2">
                  電話番号 <span className="text-red-400 ml-1">必須</span>
                </label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="09000000000"
                  className="w-full border border-sand-200 focus:border-shore outline-none px-4 py-3 text-sm text-shore placeholder:text-sand-300 bg-white transition-colors" />
              </div>
              <div>
                <label className="block text-[10px] tracking-[0.3em] text-sand-400 mb-2">
                  メールアドレス <span className="text-sand-300 ml-1 text-[9px]">任意・予約確認メールを送ります</span>
                </label>
                {isLineMember && (
                  <p className="text-[11px] text-sand-400 mb-2 leading-5">
                    アプリでLINE連携済みの方は、アプリのLINE通知で予約確認をお送りします。メールアドレスは任意です。
                  </p>
                )}
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  className="w-full border border-sand-200 focus:border-shore outline-none px-4 py-3 text-sm text-shore placeholder:text-sand-300 bg-white transition-colors" />
              </div>
              <div>
                <label className="block text-[10px] tracking-[0.3em] text-sand-400 mb-2">
                  サロンへのご要望・ご相談（任意）
                </label>
                <textarea value={message} onChange={e => setMessage(e.target.value)}
                  placeholder="ご希望のスタイルやご相談があればご記入ください。"
                  rows={3}
                  className="w-full border border-sand-200 focus:border-shore outline-none px-4 py-3 text-sm text-shore placeholder:text-sand-300 bg-white transition-colors resize-none" />
              </div>
              <div className="border border-sand-200 p-4 bg-sand-50">
                <p className="text-[11px] text-sand-500 leading-6 mb-3">
                  【キャンセル規定】<br />
                  当日のキャンセルも承ります。お気軽にご連絡ください。<br />
                  ホットペッパー経由のご予約はホットペッパーよりキャンセルをお願いします。
                </p>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={cancelAgreed} onChange={e => setCancelAgreed(e.target.checked)}
                    className="w-4 h-4 accent-shore" />
                  <span className="text-[11px] text-shore">確認しました</span>
                </label>
              </div>
            </div>

            {error && <p className="mt-4 text-xs text-red-500 text-center">{error}</p>}

            <button onClick={() => setStep('confirm')}
              disabled={!name.trim() || !phone.trim() || !cancelAgreed}
              className="mt-8 w-full py-4 bg-shore text-cream text-[11px] tracking-[0.4em] hover:bg-shore/80 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
              予約内容を確認する
            </button>
          </div>
        )}

        {/* ===== STEP 4: CONFIRM ===== */}
        {step === 'confirm' && (
          <div>
            <div className="border border-sand-200 mb-8 overflow-hidden">
              <div className="bg-shore/10 border-b border-sand-200 px-5 py-3">
                <p className="text-[11px] tracking-[0.3em] text-shore font-medium">ご予約内容の最終確認</p>
              </div>
              <div className="bg-white px-5 py-5 divide-y divide-sand-100">
                {[
                  { label: '来店日時',     value: `${selectedDate && formatDate(selectedDate)}　${selectedTime}〜（約${totalBlock}分）` },
                  { label: 'メニュー',     value: selectedMenus.map(m => m.name).join('・') },
                  { label: 'スタイリスト', value: selectedStylist === 'fujino' ? '藤野 翔' : '指名なし' },
                  { label: 'ご予約者',     value: `${name} 様` },
                  { label: '電話番号',     value: phone },
                  ...(email ? [{ label: 'メール', value: email }] : []),
                  ...(message ? [{ label: 'ご要望', value: message }] : []),
                ].map(({ label, value }) => (
                  <div key={label} className="flex gap-4 py-3 text-sm">
                    <span className="text-[11px] text-sand-400 w-24 flex-none pt-0.5">{label}</span>
                    <span className="text-shore">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {error && <p className="mb-4 text-xs text-red-500 text-center">{error}</p>}

            <button onClick={submit} disabled={submitting}
              className="w-full py-4 bg-shore text-cream text-[11px] tracking-[0.3em] hover:bg-shore/80 disabled:opacity-40 transition-all">
              {submitting ? '送信中...' : '上記に同意して予約を確定する'}
            </button>
            <button onClick={() => setStep('info')}
              className="mt-3 w-full py-3 border border-sand-200 text-sand-400 text-[11px] tracking-[0.2em] hover:bg-sand-50 transition-colors">
              戻る
            </button>
          </div>
        )}

        {/* ===== DONE ===== */}
        {step === 'done' && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-shore/10 flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-shore" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="font-serif text-2xl italic text-shore mb-4">ご予約ありがとうございます</p>
            <p className="text-sm text-sand-400 leading-8">
              {selectedDate && formatDate(selectedDate)}　{selectedTime}〜<br />
              {selectedMenus.map(m => m.name).join('・')}<br />
              <span className="text-[11px]">担当よりご連絡する場合がございます。</span>
            </p>
            <div className="mt-10 flex flex-col items-center gap-3 w-full max-w-xs mx-auto">
              <a
                href="/mypage"
                className="w-full px-8 py-3.5 bg-shore text-cream text-[11px] tracking-[0.3em] text-center hover:bg-shore/80 transition-colors"
              >
                予約を確認する
              </a>
              <button onClick={() => {
                setStep('menu'); setSelectedMenus([]); setSelectedDate(null); setSelectedTime(null)
                setName(''); setPhone(''); setMessage(''); setCancelAgreed(false)
              }} className="w-full px-8 py-3.5 border border-shore text-shore text-[11px] tracking-[0.3em] text-center hover:bg-shore/5 transition-colors">
                別の予約をする
              </button>
            </div>
            <a href="/" className="mt-8 block text-[11px] tracking-[0.3em] text-sand-400 hover:text-shore transition-colors">
              トップに戻る
            </a>
          </div>
        )}
      </div>

      {/* ===== LOGIN MODAL ===== */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40"
          onClick={() => setShowLoginModal(false)}>
          <div className="bg-white w-full md:max-w-md md:rounded-sm p-6 pb-10 md:pb-6 shadow-xl"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm tracking-[0.2em] text-shore">ログイン / 会員登録</h3>
              <button onClick={() => setShowLoginModal(false)} className="text-sand-300 hover:text-sand-500 text-2xl leading-none">×</button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-sand-200 mb-5">
              {([{ key: 'phone', label: '電話番号' }, { key: 'line', label: 'LINE' }] as const).map(t => (
                <button key={t.key}
                  onClick={() => { setLoginTab(t.key); setLoginStep('phone'); setLoginError(null) }}
                  className={`flex-1 py-2.5 text-[11px] tracking-[0.15em] border-b-2 transition-colors ${
                    loginTab === t.key ? 'border-shore text-shore font-medium' : 'border-transparent text-sand-400'
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>

            {loginTab === 'phone' && (
              loginStep === 'phone' ? (
                <div>
                  <p className="text-[11px] text-sand-400 mb-4 leading-5">
                    ご登録の電話番号にSMSで認証コードを送信します。<br />
                    初めての方はそのまま新規登録となります。
                  </p>
                  <input type="tel" value={loginPhone}
                    onChange={e => setLoginPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="09000000000" maxLength={11}
                    className="w-full border border-sand-200 focus:border-shore outline-none px-4 py-3 text-sm text-shore placeholder:text-sand-300 mb-3 transition-colors" />
                  {loginError && <p className="text-[11px] text-red-500 mb-3">{loginError}</p>}
                  <button onClick={sendOtp} disabled={loginPhone.length < 10 || loginLoading}
                    className="w-full py-3 bg-shore text-cream text-[11px] tracking-[0.3em] hover:bg-shore/80 disabled:opacity-40 transition-all">
                    {loginLoading ? '送信中...' : 'SMSを送信する'}
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-[11px] text-sand-400 mb-4">
                    {loginPhone} にSMSを送信しました。<br />届いた認証コードを入力してください。
                  </p>
                  <input type="number" value={loginOtp} onChange={e => setLoginOtp(e.target.value)}
                    placeholder="認証コード"
                    className="w-full border border-sand-200 focus:border-shore outline-none px-4 py-3 text-sm text-shore placeholder:text-sand-300 mb-3 transition-colors text-center tracking-[0.5em]" />
                  {loginError && <p className="text-[11px] text-red-500 mb-3">{loginError}</p>}
                  <button onClick={verifyOtp} disabled={loginOtp.length < 4 || loginLoading}
                    className="w-full py-3 bg-shore text-cream text-[11px] tracking-[0.3em] hover:bg-shore/80 disabled:opacity-40 transition-all">
                    {loginLoading ? '確認中...' : '認証する'}
                  </button>
                  <button onClick={() => { setLoginStep('phone'); setLoginOtp(''); setLoginError(null) }}
                    className="mt-2 w-full py-2 text-[11px] text-sand-400 hover:text-shore transition-colors">
                    電話番号を変更する
                  </button>
                </div>
              )
            )}

            {loginTab === 'line' && (
              <div className="text-center">
                <p className="text-[11px] text-sand-400 mb-6 leading-6">
                  LINEアカウントでログイン・会員登録します。<br />
                  ボタンを押すとLINEの認証画面に移動します。
                </p>
                {loginError && <p className="text-[11px] text-red-500 mb-4">{loginError}</p>}
                <button onClick={handleLineLogin}
                  className="w-full py-3 bg-[#06C755] text-white text-[12px] tracking-[0.2em] hover:bg-[#05b04c] transition-colors flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.952 12.396c0-4.368-4.384-7.92-9.777-7.92-5.392 0-9.777 3.552-9.777 7.92 0 3.912 3.472 7.196 8.162 7.816.317.068.749.208.859.478.098.244.064.627.032.874l-.138.833c-.042.246-.194.964.845.525 1.039-.44 5.617-3.31 7.665-5.666 1.414-1.55 2.129-3.12 2.129-4.86z"/>
                  </svg>
                  LINEでログインする
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
