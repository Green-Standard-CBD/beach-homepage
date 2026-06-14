'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'

type Step = 'email' | 'otp' | 'profile' | 'complete'

function RegisterContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextParam = searchParams.get('next')
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [prefecture, setPrefecture] = useState('')
  const [city, setCity] = useState('')
  const [addressLine1, setAddressLine1] = useState('')
  const [addressLine2, setAddressLine2] = useState('')
  const [lookingUpZip, setLookingUpZip] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [memberNumber, setMemberNumber] = useState('')

  // ステップ表示
  const stepNum = step === 'email' || step === 'otp' ? 1 : step === 'profile' ? 2 : 3

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const res = await fetch('/api/auth/otp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error); return }
    setStep('otp')
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const res = await fetch('/api/auth/otp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code: otpCode }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error); return }
    setStep('profile')
  }

  const handlePostalLookup = async (zip: string) => {
    setLookingUpZip(true)
    try {
      const res = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${zip}`)
      const data = await res.json()
      if (data.results?.[0]) {
        const r = data.results[0]
        setPrefecture(r.address1 ?? '')
        setCity((r.address2 ?? '') + (r.address3 ?? ''))
      }
    } catch { /* ignore */ }
    setLookingUpZip(false)
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, phone, postal_code: postalCode, prefecture, city, address_line1: addressLine1, address_line2: addressLine2 }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error); return }
    setMemberNumber(data.member.member_number)
    if (nextParam === 'checkout') {
      router.push('/checkout?method=hp_member&registered=1')
      return
    }
    setStep('complete')
  }

  return (
    <>
      <Nav />
      <main className="min-h-screen bg-cream pt-28 pb-32">
        <div className="max-w-md mx-auto px-6">

          <p className="text-[10px] tracking-[0.5em] text-sand-400 mb-3 text-center">BEACH HAIR RESCUE</p>
          <h1 className="font-serif text-3xl font-light tracking-[0.3em] text-shore text-center mb-2">Member</h1>
          <p className="text-[10px] tracking-[0.3em] text-sand-400 text-center mb-12">会員登録</p>

          {step !== 'complete' && (
            <div className="flex items-center justify-center gap-0 mb-12">
              {[
                { n: 1, label: 'メール確認' },
                { n: 2, label: 'プロフィール' },
                { n: 3, label: '完了' },
              ].map(({ n, label }, i) => (
                <div key={n} className="flex items-center">
                  <div className="flex flex-col items-center gap-1">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] transition-colors ${stepNum >= n ? 'bg-shore text-cream' : 'bg-sand-100 text-sand-400'}`}>
                      {n}
                    </div>
                    <span className="text-[9px] tracking-wider text-sand-400">{label}</span>
                  </div>
                  {i < 2 && <div className={`w-12 h-px mb-4 ${stepNum > n ? 'bg-shore' : 'bg-sand-200'}`} />}
                </div>
              ))}
            </div>
          )}

          {/* Step 1: メールアドレス */}
          {step === 'email' && (
            <form onSubmit={handleSendOtp} className="space-y-6">
              <div>
                <p className="text-sm text-sand-600 leading-[2] mb-6">
                  メールアドレスを入力してください。<br />
                  認証コードをお送りします。
                </p>
                <label className="block text-[10px] tracking-[0.35em] text-sand-400 mb-2">メールアドレス *</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  required
                  className="input-field w-full"
                />
              </div>
              {error && <p className="text-xs text-red-500 bg-red-50 p-3">{error}</p>}
              <button type="submit" disabled={loading} className="w-full bg-shore text-cream text-[11px] tracking-[0.3em] py-4 hover:opacity-80 transition-opacity disabled:opacity-40">
                {loading ? '送信中...' : '認証コードを送信する'}
              </button>
            </form>
          )}

          {/* Step 1b: OTP入力 */}
          {step === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div>
                <p className="text-sm text-sand-600 leading-[2] mb-6">
                  <span className="text-shore">{email}</span> に<br />
                  8桁の認証コードを送信しました。
                </p>
                <label className="block text-[10px] tracking-[0.35em] text-sand-400 mb-2">認証コード（8桁）*</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  placeholder="12345678"
                  maxLength={8}
                  required
                  className="input-field w-full tracking-[0.5em] text-center text-lg"
                />
              </div>
              {error && <p className="text-xs text-red-500 bg-red-50 p-3">{error}</p>}
              <button type="submit" disabled={loading || otpCode.length < 8} className="w-full bg-shore text-cream text-[11px] tracking-[0.3em] py-4 hover:opacity-80 transition-opacity disabled:opacity-40">
                {loading ? '確認中...' : '認証する'}
              </button>
              <button type="button" onClick={() => setStep('email')} className="w-full text-[10px] tracking-[0.3em] text-sand-400 hover:text-shore transition-colors">
                ← メールアドレスを変更する
              </button>
            </form>
          )}

          {/* Step 2: プロフィール */}
          {step === 'profile' && (
            <form onSubmit={handleRegister} className="space-y-5">
              <p className="text-sm text-sand-600 leading-[2] mb-2">
                メールアドレスの確認が取れました。<br />
                プロフィールを入力してください。
              </p>
              <div>
                <label className="block text-[10px] tracking-[0.35em] text-sand-400 mb-2">お名前 *</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="山田 太郎"
                  required
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block text-[10px] tracking-[0.35em] text-sand-400 mb-2">電話番号 *</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="09012345678"
                  required
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block text-[10px] tracking-[0.35em] text-sand-400 mb-2">郵便番号 *</label>
                <div className="relative">
                  <input
                    type="text"
                    value={postalCode}
                    onChange={e => {
                      const val = e.target.value.replace(/[^\d-]/g, '')
                      setPostalCode(val)
                      const zip = val.replace(/-/g, '')
                      if (zip.length === 7) handlePostalLookup(zip)
                    }}
                    placeholder="1234567"
                    maxLength={8}
                    required
                    className="input-field w-full"
                  />
                  {lookingUpZip && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-sand-400">検索中...</span>}
                </div>
              </div>
              <div>
                <label className="block text-[10px] tracking-[0.35em] text-sand-400 mb-2">都道府県 *</label>
                <input
                  type="text"
                  value={prefecture}
                  onChange={e => setPrefecture(e.target.value)}
                  placeholder="千葉県"
                  required
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block text-[10px] tracking-[0.35em] text-sand-400 mb-2">市区町村 *</label>
                <input
                  type="text"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  placeholder="船橋市習志野台"
                  required
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block text-[10px] tracking-[0.35em] text-sand-400 mb-2">番地 *</label>
                <input
                  type="text"
                  value={addressLine1}
                  onChange={e => setAddressLine1(e.target.value)}
                  placeholder="1-2-3"
                  required
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block text-[10px] tracking-[0.35em] text-sand-400 mb-2">建物名・部屋番号</label>
                <input
                  type="text"
                  value={addressLine2}
                  onChange={e => setAddressLine2(e.target.value)}
                  placeholder="BEACHビル 101号室（任意）"
                  className="input-field w-full"
                />
              </div>
              {error && <p className="text-xs text-red-500 bg-red-50 p-3">{error}</p>}
              <button type="submit" disabled={loading || !name || !phone || !postalCode || !prefecture || !city || !addressLine1} className="w-full bg-shore text-cream text-[11px] tracking-[0.3em] py-4 hover:opacity-80 transition-opacity disabled:opacity-40">
                {loading ? '登録中...' : '会員登録する'}
              </button>
            </form>
          )}

          {/* Step 3: 完了 */}
          {step === 'complete' && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-sand-100 flex items-center justify-center mx-auto mb-8">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#5a6e6e" strokeWidth="1.5">
                  <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h2 className="font-serif text-2xl font-light tracking-[0.3em] text-shore mb-2">Welcome</h2>
              <p className="text-[10px] tracking-[0.3em] text-sand-400 mb-8">会員登録が完了しました</p>

              <div className="bg-sand-100 px-6 py-5 mb-8">
                <p className="text-[10px] tracking-[0.3em] text-sand-400 mb-1">会員番号</p>
                <p className="font-mono text-xl tracking-[0.3em] text-shore font-medium">#{memberNumber}</p>
              </div>

              <p className="text-sm text-sand-600 leading-[2] mb-10">
                {name} 様、ご登録ありがとうございます。<br />
                ご購入金額に応じてポイントが貯まります。
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => router.push('/shop')}
                  className="block w-full bg-shore text-cream text-[11px] tracking-[0.3em] py-4 hover:opacity-80 transition-opacity"
                >
                  ショップを見る
                </button>
                <button
                  onClick={() => router.push('/')}
                  className="block w-full border border-sand-200 text-shore text-[11px] tracking-[0.3em] py-4 hover:border-shore transition-colors"
                >
                  トップに戻る
                </button>
              </div>
            </div>
          )}

        </div>
      </main>
      <Footer />
    </>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <p className="text-[10px] tracking-[0.3em] text-sand-400">読み込み中...</p>
      </div>
    }>
      <RegisterContent />
    </Suspense>
  )
}
