'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useCart } from '@/lib/cart'

const links = [
  { label: 'CONCEPT', href: '#concept' },
  { label: 'MENU', href: '#menu' },
  { label: 'RESERVATION', href: '/reservation' },
  { label: 'SHOP', href: '/shop' },
  { label: 'ACCESS', href: '#access' },
]

export default function Nav() {
  const pathname = usePathname()
  const isHomepage = pathname === '/'
  const [scrolled, setScrolled] = useState(!isHomepage)
  const [open, setOpen] = useState(false)
  const { count } = useCart()

  useEffect(() => {
    if (!isHomepage) return
    const onScroll = () => {
      const kvCard = document.getElementById('kv-card')
      if (kvCard) {
        setScrolled(window.scrollY > kvCard.offsetTop + kvCard.offsetHeight - 74)
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [isHomepage])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? 'bg-cream/95 backdrop-blur-sm shadow-sm' : 'bg-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <a
          href={isHomepage ? '#' : '/'}
          className={`font-serif text-3xl tracking-[0.3em] font-semibold transition-colors duration-300 ${
            scrolled ? 'text-shore' : 'text-white'
          }`}
        >
          BEACH
        </a>

        <nav className="hidden md:flex gap-10">
          {links.map((l) => {
            const href = !isHomepage && l.href.startsWith('#') ? `/${l.href}` : l.href
            const cls = `text-[11px] tracking-[0.25em] transition-colors duration-300 ${
              scrolled ? 'text-shore hover:text-sand-400' : 'text-white/80 hover:text-white'
            }`
            return l.href.startsWith('#') ? (
              <a key={l.href} href={href} className={cls}>{l.label}</a>
            ) : (
              <Link key={l.href} href={href} className={cls}>{l.label}</Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-5">
        {/* マイページアイコン */}
        <Link
          href="/mypage"
          className={`transition-colors duration-300 ${scrolled ? 'text-shore' : 'text-white'}`}
          aria-label="マイページ"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" strokeLinecap="round" />
          </svg>
        </Link>

        {/* カートアイコン */}
        <Link
          href="/cart"
          className={`relative transition-colors duration-300 ${scrolled ? 'text-shore' : 'text-white'}`}
          aria-label="カート"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 01-8 0" />
          </svg>
          {count > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-shore text-cream text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-sans">
              {count > 9 ? '9+' : count}
            </span>
          )}
        </Link>
        </div>

        <button
          onClick={() => setOpen(!open)}
          className={`md:hidden transition-colors ${scrolled ? 'text-shore' : 'text-white'}`}
          aria-label="メニュー"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            {open ? (
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" />
            ) : (
              <>
                <line x1="4" y1="8" x2="20" y2="8" strokeLinecap="round" />
                <line x1="4" y1="16" x2="20" y2="16" strokeLinecap="round" />
              </>
            )}
          </svg>
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-cream border-t border-sand-200">
          {links.map((l) => {
            const href = !isHomepage && l.href.startsWith('#') ? `/${l.href}` : l.href
            const cls = "block px-6 py-4 text-[11px] tracking-[0.25em] text-shore border-b border-sand-100 hover:bg-sand-100 transition-colors"
            return l.href.startsWith('#') ? (
              <a key={l.href} href={href} onClick={() => setOpen(false)} className={cls}>{l.label}</a>
            ) : (
              <Link key={l.href} href={href} onClick={() => setOpen(false)} className={cls}>{l.label}</Link>
            )
          })}
        </div>
      )}
    </header>
  )
}
