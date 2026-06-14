'use client'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'

export default function FloatingBooking() {
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const onScroll = () => {
      const hContents = document.getElementById('homeContents')
      if (!hContents) return
      const rect = hContents.getBoundingClientRect()
      const isPc = window.innerWidth >= 768
      // getBoundingClientRect().top はGSAPのtransformを含む実際の描画位置
      const threshold = isPc ? window.innerHeight - 135 : 80
      setScrolled(rect.top <= threshold)
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
