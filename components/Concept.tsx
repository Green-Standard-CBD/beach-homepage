'use client'
import { useRef } from 'react'
import { motion, useScroll, useTransform, type Variants } from 'framer-motion'
import Image from 'next/image'

// ---- Panel 1: スクロール連動アニメーション ----
// 1. 中央カード状態（左右に動画が見える）
// 2. 全幅に広がる
// 3. コンテンツがフェードイン
function ConceptPanel() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })

  // offset ['start end', 'end start'] → 300vh のスクロール範囲 (200vh section)
  // progress 0      : セクション上端がビューポート下端
  // progress 0.07   : ~21vh スクロール後（中央カードを保持）
  // progress 0.25   : ~75vh スクロール後（全幅に広がりきる）
  const clipPath = useTransform(
    scrollYProgress,
    [0, 0.07, 0.25, 1],
    [
      'inset(0 22% 0 22%)',   // 中央カード（左右56%は動画が見える）
      'inset(0 22% 0 22%)',   // 保持
      'inset(0 0% 0 0%)',     // 全幅
      'inset(0 0% 0 0%)',
    ]
  )

  const contentOpacity = useTransform(scrollYProgress, [0.22, 0.38], [0, 1])
  const contentY       = useTransform(scrollYProgress, [0.22, 0.38], [28, 0])

  return (
    // 200vh = sticky 100vh + 100vh スクロール余白
    <div ref={ref} style={{ height: '200vh' }} id="concept">
      <div className="sticky top-0 h-screen overflow-hidden">
        {/* cream パネル：clip-path でカット → 外側は背景の動画が透けて見える */}
        <motion.div style={{ clipPath }} className="absolute inset-0 bg-cream">
          <motion.div
            style={{ opacity: contentOpacity, y: contentY }}
            className="h-full flex flex-col justify-center"
          >
            <div className="pt-16 pb-12 max-w-5xl mx-auto px-6 md:px-12 w-full">
              {/* テキスト */}
              <div className="max-w-md mb-10 md:mb-14">
                <p className="text-[10px] tracking-[0.5em] text-sand-400 mb-5">CONCEPT</p>
                <h2 className="font-serif text-4xl md:text-5xl font-light text-shore italic leading-relaxed mb-8">
                  日常の中の<br />オアシス
                </h2>
                <p className="text-sm leading-9 text-sand-500">
                  千葉県船橋市習志野台。白とサンドベージュの空間で、
                  カリフォルニアの海辺を思わせる自然なくつろぎをご用意しています。
                  施術後は店内のカフェドリンクでゆっくりとひと息どうぞ。
                </p>
              </div>

              {/* 写真（小さめ、右寄せ） */}
              <div className="relative aspect-[4/3] w-[42%] md:w-[36%] overflow-hidden ml-auto">
                <Image
                  src="https://images.unsplash.com/photo-1695527081827-fdbc4e77be9b?w=1200&q=90&auto=format&fit=crop"
                  alt="店内の様子"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 42vw, 36vw"
                />
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}

// ---- Panel 2: オーナー 藤野翔（whileInView） ----
const panel: Variants = {
  hidden: {
    clipPath: 'inset(0 22% 0 22%)',
    y: 60,
  },
  visible: {
    clipPath: 'inset(0 0% 0 0%)',
    y: 0,
    transition: {
      duration: 1.4,
      ease: [0.76, 0, 0.24, 1] as [number, number, number, number],
      delayChildren: 0.8,
      staggerChildren: 0.11,
    },
  },
}

const item: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] },
  },
}

function OwnerPanel() {
  return (
    <motion.section
      variants={panel}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-20px' }}
      className="bg-sand-100 overflow-hidden"
    >
      <div className="py-28 md:py-44 max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-16 md:gap-32 items-center">
          <motion.div variants={item} className="relative aspect-[3/4] overflow-hidden">
            <Image
              src="https://images.unsplash.com/photo-1576110598658-096ae24cdb97?w=800&q=85&auto=format&fit=crop"
              alt="オーナー 藤野翔"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </motion.div>

          <div>
            <motion.div variants={item}>
              <p className="text-[10px] tracking-[0.4em] text-sand-400 mb-4">OWNER</p>
              <h3 className="font-serif text-4xl font-light text-shore mb-2">藤野 翔</h3>
              <p className="font-serif italic text-sand-400 text-sm mb-10 tracking-wider">
                Sho Fujino — Hairstylist
              </p>
            </motion.div>
            <motion.p variants={item} className="text-sm leading-9 text-sand-500 mb-6">
              美容師歴20年以上。お客様の「なりたい」を丁寧に引き出し、
              その人らしいスタイルを一緒に作り上げることを大切にしています。
            </motion.p>
            <motion.p variants={item} className="text-sm leading-9 text-sand-500">
              N.（エヌドット）をはじめ、厳選したヘアケアブランドを取り揃え、
              美容師目線でお客様に合った商品をご提案します。
            </motion.p>
          </div>
        </div>
      </div>
    </motion.section>
  )
}

export default function Concept() {
  return (
    // -mt-[50vh]: hero末尾50vhに重なり、動画の上でパネルが現れる
    // z-10: hero の sticky video より前面
    <div className="-mt-[50vh] relative z-10">
      <ConceptPanel />
      <OwnerPanel />
    </div>
  )
}
