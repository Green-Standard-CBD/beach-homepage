'use client'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'

export default function FloatingBooking() {
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const onScroll = () => {
      const kvCard = document.getElementById('kv-card')
      if (!kvCard) return
      if (window.innerWidth < 768) {
        // スマホ: kv-cardがviewportの上部1/3に入ったとき（Navより126px早い）
        setScrolled(window.scrollY >= kvCard.offsetTop - 200)
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
