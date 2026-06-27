'use client'
import { useEffect } from 'react'

// 別ページからのアンカー遷移（Nav.tsx が sessionStorage に保存）を受け取ってスクロール。
// GSAP が初期レイアウトをセットするまで少し待ってからスクロールする。
export default function ScrollHandler() {
  useEffect(() => {
    const anchor = sessionStorage.getItem('pendingScroll')
    if (!anchor) return
    sessionStorage.removeItem('pendingScroll')

    // スクロール位置が確定するまで画面を隠す
    document.documentElement.style.visibility = 'hidden'

    const timer = setTimeout(() => {
      const el = document.getElementById(anchor)
      if (el) el.scrollIntoView({ behavior: 'instant' })
      document.documentElement.style.visibility = 'visible'
    }, 400)

    return () => {
      clearTimeout(timer)
      document.documentElement.style.visibility = 'visible'
    }
  }, [])

  return null
}
