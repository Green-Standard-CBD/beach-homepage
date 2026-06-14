'use client'
import { useEffect, useRef, useState } from 'react'

export function useInView() {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const check = () => {
      const rect = el.getBoundingClientRect()
      if (rect.top < window.innerHeight * 0.88) {
        setInView(true)
        window.removeEventListener('scroll', check)
      }
    }

    // 初期チェックは少し遅らせてCSSトランジションが先に適用されるようにする
    const t = setTimeout(check, 80)
    window.addEventListener('scroll', check, { passive: true })

    return () => {
      clearTimeout(t)
      window.removeEventListener('scroll', check)
    }
  }, [])

  return { ref, inView }
}
