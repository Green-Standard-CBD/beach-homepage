'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { useCart } from '@/lib/cart'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

type Step = 'select' | 'otp_email' | 'otp_verify' | 'address' | 'payment'
type LoginMode = 'guest' | 'member'

// ─── Stripe決済フォーム ──────────────────────────────────────────────
function CheckoutForm({
  total, shipping, grandTotal,
  guestName, guestEmail, guestPhone,
  postalCode, prefecture, city, addressLine1, addressLine2,
  items, clientSecret, isGuest, onOrderComplete,
}: {
  total: number
  shipping: number
  grandTotal: number
  guestName: string
  guestEmail: string
  guestPhone: string
  postalCode: string
  prefecture: string
  city: string
  addressLine1: string
  addressLine2: string
  items: { id: string; name: string; price: number; variant: string | null; quantity: number }[]
  clientSecret: string
  isGuest: boolean
  onOrderComplete: () => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const { clear } = useCart()

  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cardBrand, setCardBrand] = useState<string>('unknown')

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '14px',
        color: '#3a4040',
        fontFamily: 'Noto Sans JP, sans-serif',
        '::placeholder': { color: '#b8ad9e' },
      },
      invalid: { color: '#e53e3e' },
    },
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return
    setLoading(true)
    setError(null)

    const cardNumber = elements.getElement(CardNumberElement)
    if (!cardNumber) {
      setError('カード情報を入力してください')
      setLoading(false)
      return
    }

    try {
      const { error: confirmError } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: cardNumber,
            billing_details: { name: guestName, email: guestEmail },
          },
        }
      )

      if (confirmError) {
        setError(confirmError.message ?? '決済に失敗しました')
        setLoading(false)
        return
      }

      const orderRes = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity, variant: i.variant ?? null })),
          subtotal: total,
          shipping,
          total: grandTotal,
          guest_name: guestName,
          guest_email: guestEmail,
          guest_phone: guestPhone,
          postal_code: postalCode,
          prefecture,
          city,
          address_line1: addressLine1,
          address_line2: addressLine2,
        }),
      })

      const orderData = await orderRes.json()
      if (!orderRes.ok) {
        setError('決済は完了しましたが注文の保存に失敗しました。お問い合わせください。')
        setLoading(false)
        return
      }

      onOrderComplete()
      clear()
      const shortId = (orderData.orderId as string).slice(0, 8).toUpperCase()
      const guestParam = isGuest ? '&guest=1' : ''
      router.push(`/order-complete?id=${shortId}&email=${encodeURIComponent(guestEmail)}${guestParam}`)
    } catch {
      setError('予期しないエラーが発生しました')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <p className="text-[10px] tracking-[0.35em] text-sand-400">お支払い方法</p>

      {/* カード番号（ブランド自動判別・桁数制限） */}
      <div>
        <label className="block text-[10px] tracking-[0.35em] text-sand-400 mb-2 uppercase">Card Number</label>
        <div className="input-field flex items-center gap-2">
          <CardNumberElement
            className="flex-1"
            options={cardElementOptions}
            onChange={e => setCardBrand(e.brand)}
          />
          {cardBrand !== 'unknown' && (
            <span className="text-[10px] tracking-wider text-sand-400 uppercase shrink-0">{cardBrand}</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] tracking-[0.35em] text-sand-400 mb-2 uppercase">Expiry</label>
          <div className="input-field">
            <CardExpiryElement options={cardElementOptions} />
          </div>
        </div>
        <div>
          <label className="block text-[10px] tracking-[0.35em] text-sand-400 mb-2 uppercase">CVC</label>
          <div className="input-field">
            <CardCvcElement options={cardElementOptions} />
          </div>
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-500 bg-red-50 p-3">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading || !stripe}
        className="w-full bg-shore text-cream text-[11px] tracking-[0.3em] py-4 hover:opacity-80 transition-opacity duration-300 disabled:opacity-40 mt-2"
      >
        {loading ? '処理中...' : `¥${grandTotal.toLocaleString()} 支払う`}
      </button>
    </form>
  )
}

// ─── チェックアウト本体（useSearchParams使用のため Suspense 内で使用） ─
function CheckoutContent() {
  const { items, hydrated, total, shipping, grandTotal } = useCart()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [step, setStep] = useState<Step>('select')
  const [loginMode, setLoginMode] = useState<LoginMode>('guest')
  const [authError, setAuthError] = useState<string | null>(null)
  const fromRegistration = searchParams.get('registered') === '1'

  // メールOTP（ゲスト）
  const [email, setEmail] = useState('')
  // 電話番号OTP（会員ログイン）
  const [memberPhone, setMemberPhone] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [otpSending, setOtpSending] = useState(false)
  const [otpVerifying, setOtpVerifying] = useState(false)
  const [otpError, setOtpError] = useState<string | null>(null)
  const [emailVerified, setEmailVerified] = useState(false)

  // お届け先
  const [guestName, setGuestName] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [prefecture, setPrefecture] = useState('')
  const [city, setCity] = useState('')
  const [addressLine1, setAddressLine1] = useState('')
  const [addressLine2, setAddressLine2] = useState('')
  const [addressError, setAddressError] = useState<string | null>(null)
  const [lookingUpZip, setLookingUpZip] = useState(false)

  // 支払い
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [fetchingSecret, setFetchingSecret] = useState(false)
  const [orderCompleted, setOrderCompleted] = useState(false)

  useEffect(() => {
    if (hydrated && items.length === 0 && !orderCompleted) router.replace('/cart')
  }, [hydrated, items, orderCompleted, router])

  // LINEコールバック処理
  useEffect(() => {
    const method = searchParams.get('method')
    const error = searchParams.get('error')

    if (error) {
      setAuthError('LINEログインに失敗しました。もう一度お試しください。')
      return
    }

    if (method === 'line') {
      fetch('/api/auth/line/session')
        .then(r => r.json())
        .then(data => {
          if (data.ok && data.member) {
            const m = data.member
            setGuestName(m.name ?? '')
            setGuestEmail(m.email ?? '')
            setGuestPhone(m.phone ?? '')
            setPostalCode(m.postal_code ?? '')
            setPrefecture(m.prefecture ?? '')
            setCity(m.city ?? '')
            setAddressLine1(m.address_line1 ?? '')
            setAddressLine2(m.address_line2 ?? '')
            setStep('address')
          } else {
            setAuthError('LINEセッションの読み込みに失敗しました。もう一度お試しください。')
          }
        })
        .catch(() => setAuthError('通信エラーが発生しました。'))
    }

    if (method === 'hp_member') {
      fetch('/api/auth/member-session')
        .then(r => r.json())
        .then(data => {
          if (data.ok && data.member) {
            const m = data.member
            setGuestName(m.name ?? '')
            setGuestEmail(m.email ?? '')
            setGuestPhone(m.phone ?? '')
            setPostalCode(m.postal_code ?? '')
            setPrefecture(m.prefecture ?? '')
            setCity(m.city ?? '')
            setAddressLine1(m.address_line1 ?? '')
            setAddressLine2(m.address_line2 ?? '')
            setEmailVerified(true)
            setStep('address')
          } else {
            setAuthError('会員情報の読み込みに失敗しました。もう一度お試しください。')
          }
        })
        .catch(() => setAuthError('通信エラーが発生しました。'))
    }
  }, [searchParams])

  // OTP送信（ゲスト=メール / 会員=SMS）
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setOtpError(null)
    setOtpSending(true)
    try {
      const isMember = loginMode === 'member'
      const res = await fetch(isMember ? '/api/auth/sms/send' : '/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isMember ? { phone: memberPhone } : { email }),
      })
      const data = await res.json()
      if (!res.ok) {
        setOtpError(data.error ?? '送信に失敗しました。')
        return
      }
      setStep('otp_verify')
    } finally {
      setOtpSending(false)
    }
  }

  // OTP検証（ゲスト=メール / 会員=SMS）
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setOtpError(null)
    setOtpVerifying(true)
    try {
      const isMember = loginMode === 'member'
      const res = await fetch(isMember ? '/api/auth/sms/verify' : '/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isMember ? { phone: memberPhone, code: otpCode } : { email, code: otpCode }),
      })
      const data = await res.json()
      if (!res.ok) {
        setOtpError(data.error ?? '認証コードが正しくありません。')
        return
      }

      if (isMember) {
        const memberRes = await fetch('/api/auth/member-lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: memberPhone }),
        })
        const memberData = await memberRes.json()
        if (!memberRes.ok || !memberData.member) {
          setOtpError(memberData.error ?? '会員情報が見つかりません。先に会員登録をお願いします。')
          return
        }
        const m = memberData.member
        setGuestName(m.name ?? '')
        setGuestEmail(m.email ?? '')
        setGuestPhone(memberPhone.replace(/[-\s]/g, ''))
        setPostalCode(m.postal_code ?? '')
        setPrefecture(m.prefecture ?? '')
        setCity(m.city ?? '')
        setAddressLine1(m.address_line1 ?? '')
        setAddressLine2(m.address_line2 ?? '')
      } else {
        setGuestEmail(email)
      }

      setEmailVerified(true)
      setStep('address')
    } finally {
      setOtpVerifying(false)
    }
  }

  // 郵便番号から住所自動入力（7桁揃ったら即時呼び出し）
  const handlePostalCodeLookup = async (zip: string) => {
    setLookingUpZip(true)
    try {
      const res = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${zip}`)
      const data = await res.json()
      if (data.results?.[0]) {
        const r = data.results[0]
        setPrefecture(r.address1 ?? '')
        setCity((r.address2 ?? '') + (r.address3 ?? ''))
      }
    } catch { /* 失敗時は何もしない */ }
    setLookingUpZip(false)
  }

  // お届け先 → 支払いへ
  const handleAddressNext = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddressError(null)
    if (!guestName || !guestEmail || !guestPhone || !postalCode || !prefecture || !city || !addressLine1) {
      setAddressError('※ すべての必須項目を入力してください')
      return
    }
    setFetchingSecret(true)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: grandTotal, items }),
      })
      const { clientSecret: cs, error } = await res.json()
      if (error || !cs) {
        setAddressError('決済の準備に失敗しました。しばらく後でお試しください。')
        return
      }
      setClientSecret(cs)
      setStep('payment')
    } catch {
      setAddressError('通信エラーが発生しました。')
    } finally {
      setFetchingSecret(false)
    }
  }

  if (items.length === 0) return null

  const stepNum = (step === 'select' || step === 'otp_email' || step === 'otp_verify') ? 1
    : step === 'address' ? 2 : 3

  return (
    <>
      <Nav />
      <main className="min-h-screen bg-cream pt-28 pb-32">
        <div className="max-w-xl mx-auto px-6">

          <h1 className="font-serif text-3xl font-light tracking-[0.3em] text-shore mb-2">Checkout</h1>
          <p className="text-[10px] tracking-[0.3em] text-sand-400 mb-10">ご購入手続き</p>

          {/* ステップインジケーター */}
          <div className="flex items-center mb-10">
            {(['ログイン', 'お届け先', 'お支払い'] as const).map((label, i) => {
              const n = i + 1
              return (
                <div key={label} className="flex items-center flex-1">
                  <span className={`text-[10px] tracking-[0.2em] whitespace-nowrap ${stepNum === n ? 'text-shore' : 'text-sand-300'}`}>
                    {n}. {label}
                  </span>
                  {i < 2 && <div className="flex-1 h-px bg-sand-200 mx-3" />}
                </div>
              )
            })}
          </div>

          {/* 注文サマリー */}
          <div className="bg-sand-50 p-5 mb-8 space-y-2">
            {items.map(item => (
              <div key={`${item.id}-${item.variant}`} className="flex justify-between text-xs text-sand-600">
                <span>{item.name}{item.variant ? ` (${item.variant})` : ''} × {item.quantity}</span>
                <span>¥{(item.price * item.quantity).toLocaleString()}</span>
              </div>
            ))}
            <div className="border-t border-sand-200 pt-2 mt-2 space-y-1">
              <div className="flex justify-between text-xs text-sand-500">
                <span>送料</span>
                <span>{shipping === 0 ? '無料' : `¥${shipping.toLocaleString()}`}</span>
              </div>
              <div className="flex justify-between text-sm font-medium text-shore">
                <span>合計</span>
                <span>¥{grandTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* ── ステップ 1: ログイン選択 ── */}
          {step === 'select' && searchParams.get('method') && (
            <div className="flex justify-center py-16">
              <p className="text-[10px] tracking-[0.3em] text-sand-400">読み込み中...</p>
            </div>
          )}
          {(step === 'select') && !searchParams.get('method') && (
            <div className="space-y-3">
              {authError && (
                <p className="text-xs text-red-500 bg-red-50 p-3 mb-2">{authError}</p>
              )}
              <p className="text-[10px] tracking-[0.35em] text-sand-400 mb-5">ご購入方法を選択してください</p>

              {/* 会員ログイン群 */}
              <a
                href="/api/auth/line"
                className="flex items-center justify-center gap-3 w-full bg-[#06C755] text-white text-[12px] tracking-[0.15em] py-4 hover:opacity-90 transition-opacity"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M12 2C6.48 2 2 6.21 2 11.35c0 4.63 3.67 8.5 8.65 9.21.34.07.8.22.92.5.1.26.07.66.03.92l-.14.86c-.04.26-.2 1.03.9.56 1.1-.47 5.93-3.49 8.09-5.98C21.4 15.56 22 13.53 22 11.35 22 6.21 17.52 2 12 2z"/>
                </svg>
                LINEでログイン（アプリ会員）
              </a>

              <button
                onClick={() => { setAuthError(null); setLoginMode('member'); setStep('otp_email') }}
                className="flex items-center justify-center gap-2 w-full border border-sand-300 text-shore text-[11px] tracking-[0.2em] py-4 hover:border-shore transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                会員ログイン（BEACHメンバー）
              </button>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-sand-200" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-cream px-4 text-[10px] text-sand-400">または</span>
                </div>
              </div>

              {/* ゲスト・新規登録 */}
              <Link
                href="/register?next=checkout"
                className="flex items-center justify-center w-full bg-shore text-cream text-[11px] tracking-[0.2em] py-4 hover:opacity-90 transition-opacity"
              >
                会員登録して購入
              </Link>

              <button
                onClick={() => { setAuthError(null); setLoginMode('guest'); setStep('otp_email') }}
                className="w-full border border-sand-300 text-shore text-[11px] tracking-[0.2em] py-4 hover:border-shore transition-colors"
              >
                ゲストとして購入する
              </button>

              <p className="text-[10px] text-sand-400 leading-[1.8] text-center pt-1">
                ゲスト・会員登録ともにメールアドレスで本人確認を行います。<br />
                アプリ会員はLINEログインで住所を自動入力できます。
              </p>

              <Link
                href="/cart"
                className="block text-center text-[10px] tracking-[0.2em] text-sand-400 hover:text-shore transition-colors"
              >
                ← カートに戻る
              </Link>
            </div>
          )}

          {/* ── ステップ 1: 電話番号 or メールアドレス入力 ── */}
          {step === 'otp_email' && (
            <form onSubmit={handleSendOtp} className="space-y-5">
              {loginMode === 'member' ? (
                <>
                  <p className="text-[10px] tracking-[0.35em] text-sand-400 mb-4">
                    BEACHメンバー登録済みの電話番号を入力してください
                  </p>
                  <Field label="電話番号 *">
                    <input
                      type="tel"
                      value={memberPhone}
                      onChange={e => setMemberPhone(e.target.value.replace(/[^\d-]/g, ''))}
                      placeholder="09012345678"
                      required
                      className="input-field"
                    />
                  </Field>
                </>
              ) : (
                <>
                  <p className="text-[10px] tracking-[0.35em] text-sand-400 mb-4">
                    本人確認のため、メールアドレスを入力してください
                  </p>
                  <Field label="メールアドレス *">
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="example@email.com"
                      required
                      className="input-field"
                    />
                  </Field>
                </>
              )}

              {otpError && (
                <p className="text-xs text-red-500 bg-red-50 p-3">{otpError}</p>
              )}

              <button
                type="submit"
                disabled={otpSending || (loginMode === 'member' ? !memberPhone : !email)}
                className="w-full bg-shore text-cream text-[11px] tracking-[0.3em] py-4 hover:opacity-80 transition-opacity disabled:opacity-40"
              >
                {otpSending ? '送信中...' : '認証コードを送信する'}
              </button>

              <button
                type="button"
                onClick={() => { setLoginMode('guest'); setStep('select') }}
                className="block w-full text-center text-[10px] tracking-[0.2em] text-sand-400 hover:text-shore transition-colors"
              >
                ← 戻る
              </button>
            </form>
          )}

          {/* ── ステップ 1: 認証コード入力 ── */}
          {step === 'otp_verify' && (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <p className="text-[10px] tracking-[0.35em] text-sand-400 mb-2">認証コードを入力してください</p>
              <p className="text-xs text-sand-500 leading-[1.8] mb-4">
                {loginMode === 'member' ? (
                  <><span className="font-medium text-shore">{memberPhone}</span> にSMSで<br />6桁の認証コードを送信しました。</>
                ) : (
                  <><span className="font-medium text-shore">{email}</span> に<br />8桁の認証コードを送信しました。</>
                )}
              </p>
              <Field label={loginMode === 'member' ? '認証コード（6桁）*' : '認証コード（8桁）*'}>
                <input
                  type="text"
                  inputMode="numeric"
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, loginMode === 'member' ? 6 : 8))}
                  placeholder={loginMode === 'member' ? '123456' : '12345678'}
                  maxLength={loginMode === 'member' ? 6 : 8}
                  required
                  className="input-field text-center text-xl tracking-[0.5em]"
                />
              </Field>

              {otpError && (
                <p className="text-xs text-red-500 bg-red-50 p-3">{otpError}</p>
              )}

              <button
                type="submit"
                disabled={otpVerifying || otpCode.length !== (loginMode === 'member' ? 6 : 8)}
                className="w-full bg-shore text-cream text-[11px] tracking-[0.3em] py-4 hover:opacity-80 transition-opacity disabled:opacity-40"
              >
                {otpVerifying ? '確認中...' : '認証する'}
              </button>

              <button
                type="button"
                onClick={() => { setOtpCode(''); setStep('otp_email') }}
                className="block w-full text-center text-[10px] tracking-[0.2em] text-sand-400 hover:text-shore transition-colors"
              >
                {loginMode === 'member' ? '← 電話番号を変更する' : '← メールアドレスを変更する'}
              </button>
            </form>
          )}

          {/* ── ステップ 2: お届け先 ── */}
          {step === 'address' && (
            <form onSubmit={handleAddressNext} className="space-y-5">
              {fromRegistration && (
                <div className="flex items-start gap-3 bg-[#f0f7f0] border border-[#b8d9b8] p-4 mb-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4a8a4a" strokeWidth="1.5" className="shrink-0 mt-0.5">
                    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div>
                    <p className="text-[11px] tracking-[0.2em] text-[#3a6e3a] font-medium mb-0.5">会員登録が完了しました</p>
                    <p className="text-[10px] text-[#5a8a5a] leading-[1.7]">続けてお届け先を入力してください。次回のご購入時は自動入力されます。</p>
                  </div>
                </div>
              )}
              <Field label="お名前 *">
                <input
                  type="text"
                  value={guestName}
                  onChange={e => setGuestName(e.target.value)}
                  placeholder="山田 太郎"
                  required
                  className="input-field"
                />
              </Field>
              <Field label="メールアドレス *">
                <input
                  type="email"
                  value={guestEmail}
                  onChange={e => setGuestEmail(e.target.value)}
                  placeholder="example@email.com"
                  required
                  readOnly={emailVerified}
                  className={`input-field ${emailVerified ? 'bg-sand-50 text-sand-400' : ''}`}
                />
                {emailVerified && (
                  <p className="text-[10px] text-sand-400 mt-1">認証済み</p>
                )}
              </Field>
              <Field label="電話番号 *">
                <input
                  type="tel"
                  value={guestPhone}
                  onChange={e => setGuestPhone(e.target.value)}
                  placeholder="09012345678"
                  required
                  className="input-field"
                />
              </Field>
              <Field label="郵便番号 *">
                <div className="relative">
                  <input
                    type="text"
                    value={postalCode}
                    onChange={e => {
                      const val = e.target.value.replace(/[^\d-]/g, '')
                      setPostalCode(val)
                      const zip = val.replace(/-/g, '')
                      if (zip.length === 7) handlePostalCodeLookup(zip)
                    }}
                    placeholder="1234567"
                    maxLength={8}
                    required
                    className="input-field"
                  />
                  {lookingUpZip && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-sand-400 tracking-wider">検索中...</span>
                  )}
                </div>
              </Field>
              <Field label="都道府県 *">
                <input
                  type="text"
                  value={prefecture}
                  onChange={e => setPrefecture(e.target.value)}
                  placeholder="千葉県"
                  required
                  className="input-field"
                />
              </Field>
              <Field label="市区町村 *">
                <input
                  type="text"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  placeholder="船橋市習志野台"
                  required
                  className="input-field"
                />
              </Field>
              <Field label="番地 *">
                <input
                  type="text"
                  value={addressLine1}
                  onChange={e => setAddressLine1(e.target.value)}
                  placeholder="1-2-3"
                  required
                  className="input-field"
                />
              </Field>
              <Field label="建物名・部屋番号">
                <input
                  type="text"
                  value={addressLine2}
                  onChange={e => setAddressLine2(e.target.value)}
                  placeholder="BEACHビル 101号室（任意）"
                  className="input-field"
                />
              </Field>

              {addressError && (
                <p className="text-xs text-red-500 bg-red-50 p-3">{addressError}</p>
              )}

              <button
                type="submit"
                disabled={fetchingSecret}
                className="w-full bg-shore text-cream text-[11px] tracking-[0.3em] py-4 hover:opacity-80 transition-opacity duration-300 disabled:opacity-40 mt-4"
              >
                {fetchingSecret ? '準備中...' : 'お支払いへ進む'}
              </button>
            </form>
          )}

          {/* ── ステップ 3: お支払い ── */}
          {step === 'payment' && clientSecret && (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                  theme: 'stripe',
                  variables: {
                    colorPrimary: '#5a6e6e',
                    colorBackground: '#fdfaf6',
                    fontFamily: 'Noto Sans JP, sans-serif',
                    borderRadius: '0px',
                  },
                },
              }}
            >
              <CheckoutForm
                total={total}
                shipping={shipping}
                grandTotal={grandTotal}
                guestName={guestName}
                guestEmail={guestEmail}
                guestPhone={guestPhone}
                postalCode={postalCode}
                prefecture={prefecture}
                city={city}
                addressLine1={addressLine1}
                addressLine2={addressLine2}
                items={items}
                clientSecret={clientSecret}
                isGuest={loginMode === 'guest' && !searchParams.get('method')}
                onOrderComplete={() => setOrderCompleted(true)}
              />
            </Elements>
          )}
        </div>
      </main>
      <Footer />

      <style jsx global>{`
        .input-field {
          width: 100%;
          border: 1px solid #e0d8cc;
          padding: 12px 14px;
          font-size: 14px;
          color: #3a4040;
          background: transparent;
          outline: none;
          transition: border-color 0.2s;
        }
        .input-field:focus {
          border-color: #5a6e6e;
        }
      `}</style>
    </>
  )
}

// ─── ページ（useSearchParams使用のためSuspenseでラップ） ─────────────
export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <p className="text-[10px] tracking-[0.3em] text-sand-400">読み込み中...</p>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] tracking-[0.35em] text-sand-400 mb-2 uppercase">{label}</label>
      {children}
    </div>
  )
}
