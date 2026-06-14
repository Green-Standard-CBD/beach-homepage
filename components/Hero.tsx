'use client'
import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'

export default function Hero() {
  const containerRef = useRef<HTMLElement>(null)
  // offset ['start start', 'end start'] → scrollYProgress = s / 300vh
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  })

  // 0〜22%（0〜66vh）でタイトルがフェードアウト
  const titleOpacity = useTransform(scrollYProgress, [0, 0.22], [1, 0])
  const titleY       = useTransform(scrollYProgress, [0, 0.22], [0, -30])
  const arrowOpacity = useTransform(scrollYProgress, [0, 0.06], [1, 0])

  return (
    // 300vh = sticky 100vh + 200vh scroll room
    // sticky div は s=200vh まで viewport top に固定される
    <section ref={containerRef} style={{ height: '300vh' }} className="relative bg-shore">
      <div className="sticky top-0 h-screen overflow-hidden">
        <video
          autoPlay muted loop playsInline
          className="absolute inset-0 w-full h-full object-cover"
          poster="https://images.unsplash.com/photo-1504801861699-85070797b8f8?w=1920&q=85&auto=format&fit=crop"
        >
          <source
            src="https://videos.pexels.com/video-files/6073575/6073575-hd_1280_720_25fps.mp4"
            type="video/mp4"
          />
        </video>
        <div className="absolute inset-0 bg-shore/40" />

        {/* BEACH タイトル */}
        <motion.div
          style={{ opacity: titleOpacity, y: titleY }}
          className="absolute inset-0 flex flex-col items-center justify-center text-white text-center px-6"
        >
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 0.7, y: 0 }}
            transition={{ duration: 1.2, delay: 0.4 }}
            className="text-[10px] tracking-[0.5em] mb-8"
          >
            千葉県船橋市習志野台
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.7 }}
            className="font-serif text-[9rem] md:text-[18rem] font-semibold tracking-[0.05em] mb-2 leading-none"
          >
            <span>B</span><span>E</span>
            <span style={{ letterSpacing: '0.01em' }}>A</span>
            <span>C</span><span>H</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 0.85, y: 0 }}
            transition={{ duration: 1.2, delay: 1.0 }}
            className="font-serif text-3xl md:text-5xl italic font-light tracking-[0.62em]"
          >
            Hairsalon &amp; cafe
          </motion.p>
        </motion.div>

        {/* スクロール矢印 */}
        <motion.div
          style={{ opacity: arrowOpacity }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/50 animate-bounce"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
            <path d="M12 5v14M5 12l7 7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.div>
      </div>
    </section>
  )
}
