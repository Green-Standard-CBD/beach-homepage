'use client'

import { useCart } from '@/lib/cart'
import Image from 'next/image'
import Link from 'next/link'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'

export default function CartPage() {
  const { items, removeItem, updateQty, total, shipping, grandTotal, count } = useCart()

  return (
    <>
      <Nav />
      <main className="min-h-screen bg-cream pt-28 pb-32">
        <div className="max-w-2xl mx-auto px-6">

          <h1 className="font-serif text-3xl font-light tracking-[0.3em] text-shore mb-2">Cart</h1>
          <p className="text-[10px] tracking-[0.3em] text-sand-400 mb-12">カート</p>

          {items.length === 0 ? (
            <div className="text-center py-24">
              <svg className="mx-auto mb-6 text-sand-300" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 01-8 0" />
              </svg>
              <p className="text-sm text-sand-400 tracking-wider mb-8">カートは空です</p>
              <Link
                href="/shop"
                className="inline-block border border-shore text-shore text-[11px] tracking-[0.3em] px-10 py-3 hover:bg-shore hover:text-cream transition-colors duration-300"
              >
                ショップに戻る
              </Link>
            </div>
          ) : (
            <>
              {/* 商品リスト */}
              <div className="divide-y divide-sand-100">
                {items.map(item => (
                  <div key={`${item.id}-${item.variant}`} className="flex gap-5 py-6">
                    <div className="relative w-20 h-20 flex-shrink-0 bg-sand-100 overflow-hidden">
                      {item.image_url ? (
                        <Image src={item.image_url} alt={item.name} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full bg-sand-200" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-shore font-medium leading-snug mb-1">{item.name}</p>
                      {item.variant && (
                        <p className="text-[10px] text-sand-400 tracking-wide mb-2">{item.variant}</p>
                      )}
                      <p className="text-sm text-shore">¥{item.price.toLocaleString()}</p>

                      <div className="flex items-center gap-0 mt-3">
                        <button
                          onClick={() => updateQty(item.id, item.variant, item.quantity - 1)}
                          className="w-8 h-8 border border-sand-200 text-shore flex items-center justify-center hover:border-shore transition-colors"
                        >
                          −
                        </button>
                        <span className="w-10 h-8 flex items-center justify-center text-sm text-shore border-t border-b border-sand-200">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQty(item.id, item.variant, item.quantity + 1)}
                          className="w-8 h-8 border border-sand-200 text-shore flex items-center justify-center hover:border-shore transition-colors"
                        >
                          ＋
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={() => removeItem(item.id, item.variant)}
                      className="text-sand-300 hover:text-sand-500 transition-colors self-start pt-1"
                      aria-label="削除"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>

              {/* 合計 */}
              <div className="border-t border-sand-200 pt-6 mt-6 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-sand-500">小計 ({count}点)</span>
                  <span className="text-shore">¥{total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-sand-500">送料</span>
                  <span className="text-shore">{shipping === 0 ? '無料' : `¥${shipping.toLocaleString()}`}</span>
                </div>
                {shipping > 0 && (
                  <p className="text-[10px] text-sand-400 text-right">
                    あと¥{(10000 - total).toLocaleString()}で送料無料
                  </p>
                )}
                <div className="flex justify-between pt-3 border-t border-sand-100">
                  <span className="text-shore font-medium">合計</span>
                  <span className="font-serif text-xl text-shore">¥{grandTotal.toLocaleString()}</span>
                </div>
              </div>

              <div className="mt-8 space-y-3">
                <Link
                  href="/checkout"
                  className="block w-full bg-shore text-cream text-[11px] tracking-[0.3em] py-4 text-center hover:opacity-80 transition-opacity duration-300"
                >
                  購入手続きへ進む
                </Link>
                <Link
                  href="/shop"
                  className="block w-full border border-sand-200 text-shore text-[11px] tracking-[0.3em] py-4 text-center hover:border-shore transition-colors duration-300"
                >
                  買い物を続ける
                </Link>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
