import type { Metadata } from 'next'
import { Cormorant_Garamond, Noto_Sans_JP } from 'next/font/google'
import './globals.css'
import FloatingBooking from '@/components/FloatingBooking'
import { CartProvider } from '@/lib/cart'

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
})

const noto = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-noto',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'BEACH Hairsalon & cafe | 千葉県船橋市習志野台',
  description: '船橋市習志野台の美容室・カフェ。カット、カラー、トリートメント、ヘアケア商品取り扱い。N.（エヌドット）正規取り扱い店。',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${cormorant.variable} ${noto.variable}`}>
      <body className="font-sans antialiased">
        <CartProvider>
          {children}
          <FloatingBooking />
        </CartProvider>
      </body>
    </html>
  )
}
