import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import ShopContent from '@/components/ShopContent'

export const metadata: Metadata = {
  title: 'オンラインショップ',
  description: 'BEACH Hairsalon & cafeのオンラインショップ。N.（エヌドット）・APUSEL・NOTEなどプロ仕様のヘアケア商品を取り扱い。スタイリング・シャンプー・トリートメントを全国配送。',
  openGraph: {
    title: 'オンラインショップ | BEACH Hairsalon & cafe',
    description: 'N.（エヌドット）・APUSEL・NOTEなどプロ仕様のヘアケア商品。スタイリング・シャンプー・トリートメントを全国配送。',
  },
}

export type Variant = {
  label: string
  price: number
  stock: number
  description?: string
  ingredients?: string
  images?: string[]
}

export type Product = {
  id: string
  name: string
  category: string
  price: number
  description: string | null
  details: string | null
  images: string[] | null
  variants: Variant[] | null
  sizes: string[] | null
  ingredients: string | null
  stock: number
}

async function getProducts(): Promise<Product[]> {
  // service role key を使用: products_select_admin ポリシーが anon では members テーブルを
  // 参照できず permission denied になるため（RLS スプリント後の副作用）
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data, error } = await supabase
    .from('products')
    .select('id, name, category, price, description, details, images, variants, sizes, ingredients, stock')
    .eq('is_active', true)
    .order('category')
  if (error) console.error('[shop] products fetch error:', error)
  return (data as Product[]) ?? []
}

export default async function ShopPage() {
  const products = await getProducts()

  return (
    <>
      <Nav />
      <main className="min-h-screen bg-cream pt-24">

        <div className="py-20 text-center border-b border-sand-100">
          <p className="text-[10px] tracking-[0.5em] text-sand-400 mb-5">BEACH HAIR RESCUE</p>
          <h1 className="font-serif text-5xl md:text-6xl font-light text-shore italic">Shop</h1>
          <p className="text-[11px] text-sand-400 mt-4 tracking-[0.2em]">サロン専売品・オリジナルグッズ・プランツ</p>
        </div>

        <ShopContent products={products} />

        <div className="bg-sand-100 py-10 text-center">
          <p className="text-[11px] tracking-[0.3em] text-sand-500">
            全国送料一律 ¥800　／　¥10,000以上のご購入で送料無料
          </p>
        </div>

      </main>
      <Footer />
    </>
  )
}
