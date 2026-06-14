'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import Link from 'next/link'

function OrderCompleteContent() {
  const params = useSearchParams()
  const orderId = params.get('id')
  const email = params.get('email')
  const isGuest = params.get('guest') === '1'

  return (
    <main className="min-h-screen bg-cream pt-28 pb-32 flex items-center justify-center">
      <div className="max-w-md mx-auto px-6 text-center">

        <div className="w-16 h-16 rounded-full bg-sand-100 flex items-center justify-center mx-auto mb-8">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#5a6e6e" strokeWidth="1.5">
            <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <h1 className="font-serif text-3xl font-light tracking-[0.3em] text-shore mb-3">
          Order Complete
        </h1>
        <p className="text-[10px] tracking-[0.3em] text-sand-400 mb-8">ご注文ありがとうございました</p>

        {orderId && (
          <div className="bg-sand-100 px-6 py-5 mb-8">
            <p className="text-[10px] tracking-[0.3em] text-sand-400 mb-2">注文番号</p>
            <p className="font-mono text-xl tracking-[0.3em] text-shore font-medium">#{orderId}</p>
          </div>
        )}

        <p className="text-sm text-sand-600 leading-[2] mb-10">
          ご注文を承りました。<br />
          {email ? (
            <><span className="text-shore">{email}</span> に確認メールをお送りしました。</>
          ) : (
            <>確認メールをお送りしますので、ご確認ください。</>
          )}<br />
          ご不明な点はお気軽にご連絡ください。
        </p>

        {/* 会員登録バナー（ゲスト購入時のみ） */}
        {isGuest && <div className="bg-sand-100 p-6 mb-10 text-left">
          <p className="text-[10px] tracking-[0.3em] text-sand-400 mb-2">BEACH MEMBER</p>
          <p className="text-sm text-shore font-medium mb-2">会員登録で、もっとお得に</p>
          <p className="text-xs text-sand-500 leading-[1.8] mb-5">
            会員登録するとご購入金額に応じてポイントが貯まります。<br />
            次回以降のお買い物でご利用いただけます。
          </p>
          <Link
            href="/register"
            className="block w-full text-center bg-shore text-cream text-[11px] tracking-[0.3em] py-3 hover:opacity-80 transition-opacity duration-300 mb-3"
          >
            会員登録する
          </Link>
          <div className="border border-sand-300 p-4">
            <p className="text-[10px] tracking-[0.3em] text-sand-400 mb-1">BEACH APP</p>
            <p className="text-xs text-sand-500 leading-[1.8] mb-3">
              商品購入やポイント管理はアプリからもご利用いただけます。<br />
              ご予約・会員情報の確認もアプリで。
            </p>
            <div className="space-y-2">
              <a
                href="https://apps.apple.com/jp/app/id6775343789"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full border border-shore text-shore text-[11px] tracking-[0.2em] py-3 hover:bg-shore hover:text-cream transition-colors duration-300"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                App Store（iOS）
              </a>
              <a
                href="#"
                className="flex items-center justify-center gap-2 w-full border border-sand-300 text-sand-500 text-[11px] tracking-[0.2em] py-3 hover:border-shore hover:text-shore transition-colors duration-300"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3.18 23.76c.3.17.64.24.99.2l12.43-12.43L13.26 8.2 3.18 23.76zm15.96-9.61-3.27-3.27-3.27 3.27 3.27 3.27 3.27-3.27zM3.55.28C3.2.23 2.86.3 2.56.47L14.99 12.9l3.27-3.27L3.55.28zm17.67 8.96-2.35-1.35L15.8 11l3.07 3.07 2.35-1.35c.67-.39.67-1.09 0-1.48z"/>
                </svg>
                Google Play（Android）
              </a>
            </div>
          </div>
        </div>}

        {/* アプリ紹介（全員に表示） */}
        {!isGuest && (
          <div className="bg-sand-100 p-6 mb-10 text-left">
            <div className="border border-sand-300 p-4">
              <p className="text-[10px] tracking-[0.3em] text-sand-400 mb-1">BEACH APP</p>
              <p className="text-xs text-sand-500 leading-[1.8] mb-3">
                商品購入やポイント管理はアプリからもご利用いただけます。<br />
                ご予約・会員情報の確認もアプリで。
              </p>
              <div className="space-y-2">
                <a
                  href="https://apps.apple.com/jp/app/id6775343789"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full border border-shore text-shore text-[11px] tracking-[0.2em] py-3 hover:bg-shore hover:text-cream transition-colors duration-300"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                  App Store（iOS）
                </a>
                <a
                  href="#"
                  className="flex items-center justify-center gap-2 w-full border border-sand-300 text-sand-500 text-[11px] tracking-[0.2em] py-3 hover:border-shore hover:text-shore transition-colors duration-300"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3.18 23.76c.3.17.64.24.99.2l12.43-12.43L13.26 8.2 3.18 23.76zm15.96-9.61-3.27-3.27-3.27 3.27 3.27 3.27 3.27-3.27zM3.55.28C3.2.23 2.86.3 2.56.47L14.99 12.9l3.27-3.27L3.55.28zm17.67 8.96-2.35-1.35L15.8 11l3.07 3.07 2.35-1.35c.67-.39.67-1.09 0-1.48z"/>
                  </svg>
                  Google Play（Android）
                </a>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <Link
            href="/shop"
            className="block w-full bg-shore text-cream text-[11px] tracking-[0.3em] py-4 hover:opacity-80 transition-opacity duration-300"
          >
            ショップに戻る
          </Link>
          <Link
            href="/"
            className="block w-full border border-sand-200 text-shore text-[11px] tracking-[0.3em] py-4 hover:border-shore transition-colors duration-300"
          >
            トップに戻る
          </Link>
        </div>
      </div>
    </main>
  )
}

export default function OrderCompletePage() {
  return (
    <>
      <Nav />
      <Suspense fallback={<main className="min-h-screen bg-cream" />}>
        <OrderCompleteContent />
      </Suspense>
      <Footer />
    </>
  )
}
