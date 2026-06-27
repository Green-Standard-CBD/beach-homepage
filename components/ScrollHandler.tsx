'use client'
import { useEffect } from 'react'

// 別ページからのアンカー遷移（Nav.tsx が sessionStorage に保存）を受け取ってスクロール。
// GSAP が初期レイアウトをセットするまで少し待ってからスクロールする。
export default function ScrollHandler() {
  useEffect(() => {
    const anchor = sessionStorage.getItem('pendingScroll')
    if (!anchor) return
    sessionStorage.removeItem('pendingScroll')

    const timer = setTimeout(() => {
      const el = document.getElementById(anchor)
      if (el) el.scrollIntoView({ behavior: 'smooth' })
    }, 400)

    return () => clearTimeout(timer)
  }, [])

  return null
}
