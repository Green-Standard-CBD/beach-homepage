'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { Product } from '@/app/shop/page'
import { PLANT_PRODUCTS } from '@/lib/plantProducts'

type Category = 'all' | 'styling' | 'shampoo' | 'treatment' | 'goods' | 'plants'

const categories: { label: string; value: Category }[] = [
  { label: 'ALL', value: 'all' },
  { label: 'STYLING', value: 'styling' },
  { label: 'SHAMPOO', value: 'shampoo' },
  { label: 'TREATMENT', value: 'treatment' },
  { label: 'GOODS', value: 'goods' },
  { label: 'PLANTS', value: 'plants' },
]

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=85&auto=format&fit=crop'

function getBrand(id: string): string {
  if (id.startsWith('n-')) return 'N.'
  if (id.startsWith('note-')) return 'NOTE by N.'
  if (id.startsWith('apusel-')) return 'APUSEL'
  if (id.startsWith('color-')) return 'N.'
  if (id.startsWith('plant-')) return 'PLANTS'
  return 'BEACH'
}

function getImage(p: { images?: string[] | null }): string {
  return p.images && p.images.length > 0 ? p.images[0] : FALLBACK_IMAGE
}

type AnyProduct = Product | (typeof PLANT_PRODUCTS)[number]

function ProductGrid({ products }: { products: AnyProduct[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-14">
      {products.map((product) => (
        <Link key={product.id} href={`/shop/${product.id}`} className="group flex flex-col">
          <div className="relative aspect-square overflow-hidden bg-sand-100 mb-4">
            <Image
              src={getImage(product)}
              alt={product.name}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
          </div>
          <p className="text-[10px] tracking-[0.3em] text-sand-400 mb-1">{getBrand(product.id)}</p>
          <h3 className="text-xs text-shore mb-2 leading-relaxed group-hover:underline underline-offset-2">{product.name}</h3>
          {product.description && (
            <p className="text-[10px] leading-[1.8] text-sand-500 mb-3 line-clamp-3 flex-1">
              {product.description}
            </p>
          )}
          <div className="mt-auto">
            <p className="font-serif text-sm text-shore mb-3">¥{product.price.toLocaleString()}</p>
            <div className="w-full border border-shore text-shore text-[10px] tracking-[0.25em] py-2.5 text-center group-hover:bg-shore group-hover:text-cream transition-colors duration-300">
              詳細を見る
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}

type Props = { products: Product[] }

export default function ShopContent({ products }: Props) {
  const [activeCategory, setActiveCategory] = useState<Category>('all')
  const [slideDir, setSlideDir] = useState<'right' | 'left'>('right')
  const [swipeOverlay, setSwipeOverlay] = useState<{
    exitProducts: AnyProduct[]
    exitCls: string
    enterCls: string
  } | null>(null)
  const touchStartX = useRef<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // 横スワイプ中は縦スクロールをブロック（passive: false が必要なため useEffect で登録）
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    let sx = 0, sy = 0, axis: 'x' | 'y' | null = null

    const onStart = (e: TouchEvent) => {
      sx = e.touches[0].clientX
      sy = e.touches[0].clientY
      axis = null
    }
    const onMove = (e: TouchEvent) => {
      const dx = Math.abs(e.touches[0].clientX - sx)
      const dy = Math.abs(e.touches[0].clientY - sy)
      if (!axis && (dx > 5 || dy > 5)) axis = dx > dy ? 'x' : 'y'
      if (axis === 'x') e.preventDefault()
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
    }
  }, [])

  const allProducts: AnyProduct[] = [
    ...products.filter((p) => p.category !== 'goods'),
    ...PLANT_PRODUCTS,
    ...products.filter((p) => p.category === 'goods'),
  ]

  const getFiltered = (cat: Category): AnyProduct[] =>
    cat === 'all' ? allProducts : allProducts.filter((p) => p.category === cat)

  const filtered = getFiltered(activeCategory)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const diff = touchStartX.current - e.changedTouches[0].clientX
    touchStartX.current = null
    if (Math.abs(diff) < 50) return

    const idx = categories.findIndex(c => c.value === activeCategory)
    let newIdx = -1
    if (diff > 0 && idx < categories.length - 1) newIdx = idx + 1
    else if (diff < 0 && idx > 0) newIdx = idx - 1
    if (newIdx === -1) return

    const newCat = categories[newIdx].value
    const dir = diff > 0 ? 'right' : 'left'

    setSwipeOverlay({
      exitProducts: getFiltered(activeCategory),
      exitCls: dir === 'right' ? 'swipe-exit-to-left' : 'swipe-exit-to-right',
      enterCls: dir === 'right' ? 'swipe-in-from-right' : 'swipe-in-from-left',
    })
    setSlideDir(dir)
    setActiveCategory(newCat)

    setTimeout(() => setSwipeOverlay(null), 350)
  }

  return (
    <>
      {/* カテゴリフィルター */}
      <div className="sticky top-[72px] z-40 bg-cream/95 backdrop-blur-sm border-b border-sand-100">
        <div className="max-w-6xl mx-auto px-6 py-4 flex gap-8 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => {
                const cur = categories.findIndex(c => c.value === activeCategory)
                const next = categories.findIndex(c => c.value === cat.value)
                setSlideDir(next > cur ? 'right' : 'left')
                setActiveCategory(cat.value)
              }}
              className={`text-[11px] tracking-[0.3em] whitespace-nowrap transition-colors duration-200 pb-1 ${
                activeCategory === cat.value
                  ? 'text-shore border-b border-shore'
                  : 'text-sand-400 hover:text-shore'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Plantsバナー */}
      {activeCategory === 'plants' && (
        <div className="bg-sand-100 border-b border-sand-200">
          <div className="max-w-6xl mx-auto px-6 py-5">
            <p className="text-[11px] tracking-[0.25em] text-sand-500 text-center">
              BEACHが厳選した観葉植物をお届けします。現在準備中のアイテムが多くあります。詳しくはサロンスタッフへ。
            </p>
          </div>
        </div>
      )}

      {/* 商品グリッド */}
      <div
        ref={containerRef}
        className="max-w-6xl mx-auto px-6 py-16"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <p className="text-[11px] text-sand-400 tracking-[0.2em] mb-10">{filtered.length} 件</p>
        <div className="relative overflow-hidden">
          {/* メイングリッド: タブクリック時に 32px スライドアニメーション（PC・スマホ共通・変更なし） */}
          <div
            key={activeCategory}
            className={slideDir === 'right' ? 'slide-from-right' : 'slide-from-left'}
          >
            <ProductGrid products={filtered} />
          </div>

          {/* スワイプオーバーレイ: スマホスワイプ時のみ、100%幅フルスライドでメイングリッドを上書き */}
          {swipeOverlay && (
            <>
              {/* 退場: 旧コンテンツが画面外へ出る */}
              <div className={`absolute inset-0 bg-cream z-20 ${swipeOverlay.exitCls}`}>
                <ProductGrid products={swipeOverlay.exitProducts} />
              </div>
              {/* 入場: 新コンテンツが画面外から入る */}
              <div className={`absolute inset-0 bg-cream z-10 ${swipeOverlay.enterCls}`}>
                <ProductGrid products={filtered} />
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
