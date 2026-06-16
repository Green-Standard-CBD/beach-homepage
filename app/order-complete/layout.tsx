import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ご注文完了',
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
