import { createClient } from '@supabase/supabase-js'
import { PLANT_PRODUCTS } from './plantProducts'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SHIPPING_FEE = 800
const FREE_SHIPPING_THRESHOLD = 10000

export type PricedItem = { id: string; quantity: number }
export type OrderPricing = { subtotal: number; shipping: number; total: number }

/** カート内容から、DB上の実価格を使ってサーバー側で金額を再計算する（クライアント申告額は信用しない）。
 *  app/api/checkout（PaymentIntent作成時）とapp/api/orders（注文確定時）の両方から呼ぶことで、
 *  「送料を商品代として申告してポイントを水増しする」ような不一致も防ぐ。 */
export async function computeOrderPricing(items: PricedItem[]): Promise<OrderPricing | null> {
  if (!Array.isArray(items) || items.length === 0) return null

  const dbIds = items.filter((i) => !String(i.id).startsWith('plant-')).map((i) => i.id)
  const priceById = new Map<string, number>()

  for (const p of PLANT_PRODUCTS) {
    priceById.set(p.id, p.price)
  }

  if (dbIds.length > 0) {
    const { data: products, error } = await supabaseAdmin
      .from('products')
      .select('id, price')
      .in('id', dbIds)
      .eq('is_active', true)
    if (error) return null
    for (const p of products ?? []) {
      priceById.set(p.id, p.price as number)
    }
  }

  let subtotal = 0
  for (const item of items) {
    const price = priceById.get(item.id)
    const qty = Number(item.quantity)
    if (price === undefined || !Number.isFinite(qty) || qty <= 0) return null
    subtotal += price * qty
  }

  const shipping = subtotal === 0 ? 0 : subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE
  return { subtotal, shipping, total: subtotal + shipping }
}
