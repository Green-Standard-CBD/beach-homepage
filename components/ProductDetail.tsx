'use client'

import { useState, useMemo, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Product, Variant } from '@/app/shop/page'
import { useCart } from '@/lib/cart'

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=85&auto=format&fit=crop'

function getBrand(id: string): string {
  if (id.startsWith('n-')) return 'N.'
  if (id.startsWith('note-')) return 'NOTE by N.'
  if (id.startsWith('apusel-')) return 'APUSEL'
  if (id.startsWith('color-')) return 'N.'
  if (id.startsWith('plant-')) return 'PLANTS'
  return 'BEACH'
}

function isSoldOut(product: Product, selectedVariant: Variant | null): boolean {
  if (product.variants && product.variants.length > 0) {
    if (selectedVariant) return (selectedVariant.stock ?? 0) === 0
    return product.variants.every(v => (v.stock ?? 0) === 0)
  }
  return product.stock === 0
}

export default function ProductDetail({ product }: { product: Product }) {
  const { addItem } = useCart()
  const router = useRouter()
  const baseImages = product.images && product.images.length > 0 ? product.images : [FALLBACK_IMAGE]

  // 「容量 / 香り」マトリックスか判定
  const matrixInfo = useMemo(() => {
    const vs = product.variants
    if (!vs?.length || !vs.every(v => v.label.includes(' / '))) return null
    const fragrances = [...new Set(vs.map(v => v.label.split(' / ')[1]))]
    const volumes = [...new Set(vs.map(v => v.label.split(' / ')[0]))]
    if (fragrances.length < 2) return null
    return { fragrances, volumes }
  }, [product])

  const [selectedFragrance, setSelectedFragrance] = useState<string | null>(null)
  const [selectedVolume, setSelectedVolume] = useState<string | null>(null)
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null)
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [qty, setQty] = useState(1)
  const [activeIdx, setActiveIdx] = useState(0)
  const [showModal, setShowModal] = useState(false)

  // 初期選択
  useEffect(() => {
    if (!product) return
    if (matrixInfo) {
      setSelectedFragrance(matrixInfo.fragrances[0])
      if (matrixInfo.volumes.length === 1) setSelectedVolume(matrixInfo.volumes[0])
    } else if (product.variants?.length) {
      setSelectedVariant(product.variants[0])
    }
  }, [product, matrixInfo])

  // 香り＋容量 → selectedVariant 解決
  useEffect(() => {
    if (!matrixInfo || !product.variants) return
    if (selectedFragrance && selectedVolume) {
      const v = product.variants.find(v => v.label === `${selectedVolume} / ${selectedFragrance}`)
      setSelectedVariant(v ?? null)
    } else {
      setSelectedVariant(null)
    }
  }, [selectedFragrance, selectedVolume, matrixInfo, product])

  // 香りに合わせた表示用バリアント（容量未選択でも画像・説明を出す）
  const displayVariant = useMemo(() => {
    if (selectedVariant) return selectedVariant
    if (matrixInfo && selectedFragrance) {
      return product.variants?.find(v => v.label.endsWith(` / ${selectedFragrance}`)) ?? null
    }
    return null
  }, [selectedVariant, matrixInfo, selectedFragrance, product])

  // 表示画像：バリアント画像 → 商品画像
  const displayImages = useMemo(() => {
    if (displayVariant?.images?.length) return displayVariant.images
    return baseImages
  }, [displayVariant, baseImages])

  useEffect(() => { setActiveIdx(0) }, [displayImages])

  const currentPrice = selectedVariant ? selectedVariant.price : product.price
  const soldOut = isSoldOut(product, selectedVariant)

  const buildCartItem = () => {
    const variantLabel = selectedVariant?.label ?? selectedSize ?? null
    const price = selectedVariant ? selectedVariant.price : product.price
    const imageUrl = displayImages[0] ?? null
    return {
      id: product.id,
      name: product.name,
      price,
      image_url: imageUrl,
      variant: variantLabel,
    }
  }

  const handleAddToCart = () => {
    if (matrixInfo) {
      if (!selectedFragrance) return
      if (matrixInfo.volumes.length > 1 && !selectedVolume) return
    }
    const cartItem = buildCartItem()
    for (let i = 0; i < qty; i++) addItem(cartItem)
    setShowModal(true)
  }

  const handleBuyNow = () => {
    if (matrixInfo) {
      if (!selectedFragrance) return
      if (matrixInfo.volumes.length > 1 && !selectedVolume) return
    }
    const cartItem = buildCartItem()
    for (let i = 0; i < qty; i++) addItem(cartItem)
    router.push('/cart')
  }

  const descLines = ((displayVariant?.description ?? product.description) || '').split('\n').filter(Boolean)
  const ingredients = displayVariant?.ingredients ?? product.ingredients
  const details = product.details

  return (
    <div className="max-w-5xl mx-auto px-6 py-16 md:py-24">

      {/* 戻るリンク */}
      <Link
        href="/shop"
        className="inline-flex items-center gap-2 text-[10px] tracking-[0.3em] text-sand-400 hover:text-shore transition-colors duration-200 mb-12"
      >
        <span>←</span><span>SHOP に戻る</span>
      </Link>

      <div className="grid md:grid-cols-2 gap-12 md:gap-20">

        {/* 左：画像ギャラリー */}
        <div>
          <div className="relative aspect-square overflow-hidden bg-sand-100 mb-4">
            <Image
              key={`${activeIdx}-${displayImages[activeIdx]}`}
              src={displayImages[activeIdx]}
              alt={product.name}
              fill
              className="object-cover"
              priority
            />
          </div>

          {displayImages.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {displayImages.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setActiveIdx(i)}
                  className={`relative w-[60px] h-[60px] overflow-hidden flex-shrink-0 transition-all duration-200 ${
                    i === activeIdx
                      ? 'ring-1 ring-shore opacity-100'
                      : 'opacity-45 hover:opacity-70'
                  }`}
                >
                  <Image src={src} alt={`${i + 1}`} fill className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 右：商品情報 */}
        <div className="flex flex-col">
          <p className="text-[10px] tracking-[0.4em] text-sand-400 mb-2">{getBrand(product.id)}</p>
          <h1 className="font-serif text-2xl md:text-3xl font-light text-shore leading-snug mb-3">
            {product.name}
          </h1>
          <p className="font-serif text-xl text-shore mb-6">
            ¥{currentPrice.toLocaleString()}
          </p>

          {/* 説明文 */}
          {descLines.length > 0 && (
            <div className="mb-6 space-y-2 border-t border-sand-100 pt-6">
              {descLines.map((line, i) => (
                <p key={i} className="text-xs leading-[2] text-sand-600">{line}</p>
              ))}
            </div>
          )}

          {/* ─── バリアント選択 ─── */}
          {product.variants && product.variants.length > 0 && (
            <div className="border-t border-sand-100 pt-6 mb-6">
              {matrixInfo ? (
                <>
                  {/* 香り選択 */}
                  <p className="text-[10px] tracking-[0.35em] text-sand-400 mb-3">FRAGRANCE</p>
                  <div className="flex flex-wrap gap-2 mb-5">
                    {matrixInfo.fragrances.map(f => (
                      <button
                        key={f}
                        onClick={() => setSelectedFragrance(f)}
                        className={`text-[11px] tracking-wide px-4 py-2 border transition-colors duration-200 ${
                          selectedFragrance === f
                            ? 'bg-shore text-cream border-shore'
                            : 'border-sand-200 text-shore hover:border-shore'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>

                  {/* 容量選択（2種以上） */}
                  {matrixInfo.volumes.length > 1 && (
                    <>
                      <p className="text-[10px] tracking-[0.35em] text-sand-400 mb-3">VOLUME</p>
                      <div className="flex flex-wrap gap-2">
                        {matrixInfo.volumes.map(vol => {
                          const refFrag = selectedFragrance ?? matrixInfo.fragrances[0]
                          const v = product.variants!.find(v => v.label === `${vol} / ${refFrag}`)
                          const isActive = selectedVolume === vol
                          return (
                            <button
                              key={vol}
                              onClick={() => setSelectedVolume(vol)}
                              className={`flex flex-col items-center px-5 py-3 border text-left transition-colors duration-200 min-w-[80px] ${
                                isActive
                                  ? 'bg-shore text-cream border-shore'
                                  : 'border-sand-200 text-shore hover:border-shore'
                              }`}
                            >
                              <span className="text-[11px] tracking-wide">{vol}</span>
                              {v && (
                                <span className={`text-[10px] mt-0.5 ${isActive ? 'text-cream/80' : 'text-sand-400'}`}>
                                  ¥{v.price.toLocaleString()}
                                </span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <>
                  <p className="text-[10px] tracking-[0.35em] text-sand-400 mb-3">TYPE / VOLUME</p>
                  <div className="flex flex-wrap gap-2">
                    {product.variants.map(v => (
                      <button
                        key={v.label}
                        onClick={() => setSelectedVariant(v)}
                        className={`flex flex-col items-center px-5 py-3 border transition-colors duration-200 min-w-[80px] ${
                          selectedVariant?.label === v.label
                            ? 'bg-shore text-cream border-shore'
                            : 'border-sand-200 text-shore hover:border-shore'
                        }`}
                      >
                        <span className="text-[11px] tracking-wide">{v.label}</span>
                        <span className={`text-[10px] mt-0.5 ${selectedVariant?.label === v.label ? 'text-cream/80' : 'text-sand-400'}`}>
                          ¥{v.price.toLocaleString()}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* サイズ・カラー選択 */}
          {product.sizes && product.sizes.length > 0 && (
            <div className="border-t border-sand-100 pt-6 mb-6">
              <p className="text-[10px] tracking-[0.35em] text-sand-400 mb-3">SIZE / COLOR</p>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map(s => (
                  <button
                    key={s}
                    onClick={() => setSelectedSize(s)}
                    className={`text-[11px] tracking-wide px-5 py-2 border transition-colors duration-200 ${
                      selectedSize === s
                        ? 'bg-shore text-cream border-shore'
                        : 'border-sand-200 text-shore hover:border-shore'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 数量 */}
          <div className="border-t border-sand-100 pt-6 mb-8">
            <p className="text-[10px] tracking-[0.35em] text-sand-400 mb-3">QUANTITY</p>
            <div className="flex items-center gap-0">
              <button
                onClick={() => setQty(q => Math.max(1, q - 1))}
                className="w-10 h-10 border border-sand-200 text-shore text-lg hover:border-shore transition-colors duration-200 flex items-center justify-center"
              >
                −
              </button>
              <span className="w-12 h-10 flex items-center justify-center text-sm text-shore border-t border-b border-sand-200">
                {qty}
              </span>
              <button
                onClick={() => setQty(q => q + 1)}
                className="w-10 h-10 border border-sand-200 text-shore text-lg hover:border-shore transition-colors duration-200 flex items-center justify-center"
              >
                ＋
              </button>
            </div>
          </div>

          {/* 購入ボタン */}
          <div className="space-y-3">
            {soldOut ? (
              <div className="w-full bg-sand-200 text-sand-400 text-[11px] tracking-[0.3em] py-4 text-center">
                SOLD OUT
              </div>
            ) : (
              <>
                <button
                  onClick={handleAddToCart}
                  className="w-full bg-shore text-cream text-[11px] tracking-[0.3em] py-4 hover:opacity-80 transition-opacity duration-300"
                >
                  カートに追加
                </button>
                <button
                  onClick={handleBuyNow}
                  className="w-full border border-shore text-shore text-[11px] tracking-[0.3em] py-4 hover:bg-shore hover:text-cream transition-colors duration-300"
                >
                  今すぐ購入
                </button>
              </>
            )}
          </div>

          <p className="text-[10px] tracking-[0.2em] text-sand-400 mt-5 text-center">
            全国送料一律 ¥800 ／ ¥10,000以上で送料無料
          </p>
        </div>
      </div>

      {/* 商品詳細・全成分 */}
      {(details || ingredients) && (
        <div className="mt-16 border-t border-sand-100 pt-16 grid md:grid-cols-2 gap-12">
          {details && (
            <div>
              <p className="text-[10px] tracking-[0.4em] text-sand-400 mb-5">商品詳細</p>
              <div className="space-y-2">
                {details.split('\n').filter(Boolean).map((line, i) => (
                  <p key={i} className="text-xs leading-[2] text-sand-600">{line}</p>
                ))}
              </div>
            </div>
          )}
          {ingredients && (
            <div>
              <p className="text-[10px] tracking-[0.4em] text-sand-400 mb-5">全成分</p>
              <p className="text-[11px] leading-[2] text-sand-500">{ingredients}</p>
            </div>
          )}
        </div>
      )}

      {/* カートに追加モーダル */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowModal(false)} />
          <div className="relative bg-cream w-full max-w-lg mx-auto p-8 pb-12 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-shore">✓</span>
              <p className="font-serif text-lg font-light text-shore">カートに追加しました</p>
            </div>
            <p className="text-xs text-sand-500 mb-6">
              {product.name}
              {selectedVariant ? `　${selectedVariant.label}` : ''}
              　×{qty}
            </p>
            <div className="border-t border-sand-100 mb-6" />
            <div className="space-y-3">
              <Link
                href="/cart"
                onClick={() => setShowModal(false)}
                className="block w-full bg-shore text-cream text-[11px] tracking-[0.3em] py-4 text-center hover:opacity-80 transition-opacity duration-300"
              >
                カートを見る・購入へ進む
              </Link>
              <button
                onClick={() => setShowModal(false)}
                className="w-full border border-sand-200 text-shore text-[11px] tracking-[0.3em] py-4 hover:border-shore transition-colors duration-300"
              >
                買い物を続ける
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
