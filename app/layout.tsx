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

const siteUrl = 'https://beach-hair.vercel.app'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'BEACH Hairsalon & cafe | 千葉県船橋市習志野台の美容室',
    template: '%s | BEACH Hairsalon & cafe',
  },
  description: '千葉県船橋市習志野台の美容室・カフェ。カット・カラー・パーマ・ヘッドスパ・トリートメント。N.（エヌドット）正規取り扱い店。木曜定休、10:00〜19:00営業。オンライン予約受付中。',
  keywords: ['美容室', '美容院', '船橋市', '習志野台', 'BEACH', 'ヘアサロン', 'カット', 'カラー', 'パーマ', 'ヘッドスパ', 'エヌドット', 'N.', '千葉'],
  authors: [{ name: 'BEACH Hairsalon & cafe' }],
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    url: siteUrl,
    siteName: 'BEACH Hairsalon & cafe',
    title: 'BEACH Hairsalon & cafe | 千葉県船橋市習志野台の美容室',
    description: '千葉県船橋市習志野台の美容室・カフェ。カット・カラー・パーマ・ヘッドスパ。N.（エヌドット）正規取り扱い店。オンライン予約受付中。',
    images: [
      {
        url: '/images/salon_1.jpg',
        width: 1200,
        height: 630,
        alt: 'BEACH Hairsalon & cafe',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BEACH Hairsalon & cafe | 千葉県船橋市習志野台の美容室',
    description: '千葉県船橋市習志野台の美容室・カフェ。カット・カラー・パーマ・ヘッドスパ。N.（エヌドット）正規取り扱い店。',
    images: ['/images/salon_1.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'HairSalon',
  name: 'BEACH Hairsalon & cafe',
  url: siteUrl,
  image: `${siteUrl}/images/salon_1.jpg`,
  address: {
    '@type': 'PostalAddress',
    streetAddress: '習志野台8-41-13-101',
    addressLocality: '船橋市',
    addressRegion: '千葉県',
    postalCode: '274-0063',
    addressCountry: 'JP',
  },
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Friday', 'Saturday', 'Sunday'],
      opens: '10:00',
      closes: '19:00',
    },
  ],
  priceRange: '¥¥',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${cormorant.variable} ${noto.variable}`}>
      <body className="font-sans antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <CartProvider>
          {children}
          <FloatingBooking />
        </CartProvider>
      </body>
    </html>
  )
}
