import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import ProductDetail from '@/components/ProductDetail'
import type { Product } from '@/app/shop/page'
import { PLANT_PRODUCTS } from '@/lib/plantProducts'

async function getProduct(id: string): Promise<Product | null> {
  if (id.startsWith('plant-')) {
    return PLANT_PRODUCTS.find(p => p.id === id) ?? null
  }
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data } = await supabase
    .from('products')
    .select('id, name, category, price, description, details, images, variants, sizes, ingredients, stock')
    .eq('id', id)
    .eq('is_active', true)
    .single()
  return (data as Product) ?? null
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const product = await getProduct(id)
  if (!product) notFound()

  return (
    <>
      <Nav />
      <main className="min-h-screen bg-cream pt-24">
        <ProductDetail product={product} />
      </main>
      <Footer />
    </>
  )
}
