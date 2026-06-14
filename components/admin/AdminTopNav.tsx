'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

const NAV = [
  { label: '予約管理',   href: '/admin/reservations' },
  { label: 'お客様管理', href: '/admin/customers' },
  { label: '注文管理',   href: '/admin/orders' },
  { label: '売上管理',   href: '/admin/sales' },
  { label: '集計・分析', href: '/admin/analytics' },
  { label: '設定',       href: '/admin/staff' },
]

export default function AdminTopNav() {
  const pathname = usePathname()
  const router   = useRouter()

  function logout() {
    document.cookie = 'admin_auth=; Max-Age=0; path=/'
    router.push('/admin/login')
  }

  return (
    <div className="bg-[#2A2520] text-cream flex items-center flex-shrink-0 shadow-md">
      {/* ロゴ */}
      <span className="font-serif text-3xl font-extrabold tracking-[0.2em] px-5 py-3 border-r border-white/10 flex-shrink-0">
        BEACH
      </span>

      {/* メインナビ */}
      <nav className="flex flex-1">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href)
          return (
            <Link key={item.href} href={item.href}
              className={`px-5 py-3 text-[11px] tracking-[0.2em] transition-colors border-b-2 flex-shrink-0 ${
                active
                  ? 'border-cream/80 text-cream bg-white/10'
                  : 'border-transparent text-cream/60 hover:text-cream hover:bg-white/5'
              }`}>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* ログアウト */}
      <button onClick={logout}
        className="text-[11px] tracking-[0.15em] text-cream/50 hover:text-cream/80 transition-colors px-5 flex-shrink-0">
        ログアウト
      </button>
    </div>
  )
}
