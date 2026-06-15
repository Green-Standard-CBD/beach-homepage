'use client'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'

export default function FloatingBooking() {
  const pathname = usePathname()
  const isHomepage = pathname === '/'
  const [scrolled, setScrolled] = useState(!isHomepage)

  useEffect(() => {
    if (!isHomepage) return  // ホームページ以外は常にベージュ
    const onScroll = () => {
      const kvCard = document.getElementById('kv-card')
      if (!kvCard) return
      if (window.innerWidth < 768) {
        // スマホ: kv-cardの上部がNavより約80px手前に来たとき
        setScrolled(window.scrollY >= kvCard.offsetTop - 140)
      } else {
        // PC: homeContentsが画面下部に入ったとき（従来どおり）
        const hContents = document.getElementById('homeContents')
        if (!hContents) return
        setScrolled(hContents.getBoundingClientRect().top <= window.innerHeight - 135)
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (pathname === '/reservation') return null

  return (
    <a
      href="/reservation"
      className={`fixed top-20 right-8 md:top-auto md:bottom-8 z-40 text-[12px] tracking-[0.3em] px-6 py-3 transition-all duration-500 ${
        scrolled
          ? 'bg-sand-300 text-shore hover:bg-sand-400'
          : 'border border-white/70 text-white hover:bg-white/10'
      }`}
    >
      ご予約はこちら
    </a>
  )
}
