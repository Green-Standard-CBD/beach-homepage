import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit, getClientIp } from '@/lib/redis'
import { computeOrderPricing } from '@/lib/orderPricing'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('STRIPE_SECRET_KEY not set')
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
    }

    const okRate = await checkRateLimit(`checkout:${getClientIp(req)}`, 20, 60 * 60)
    if (!okRate) {
      return NextResponse.json({ error: 'リクエストが多すぎます。しばらく時間をおいてお試しください' }, { status: 429 })
    }

    const body = await req.json()
    const {
      items,
      guest_name, guest_email, guest_phone,
      postal_code, prefecture, city, address_line1, address_line2,
    } = body

    if (!guest_name || !guest_email || !address_line1) {
      return NextResponse.json({ error: 'Invalid order data' }, { status: 400 })
    }

    const pricing = await computeOrderPricing(items)
    if (!pricing || pricing.total < 50) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }
    const { subtotal, shipping, total } = pricing

    const res = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        amount: String(total),
        currency: 'jpy',
        'automatic_payment_methods[enabled]': 'true',
      }),
    })

    const data = await res.json()

    if (!res.ok || !data.client_secret || !data.id) {
      console.error('Stripe error:', data)
      return NextResponse.json({ error: 'Failed to create payment intent' }, { status: 500 })
    }

    // 決済成功後にconfirm（/api/orders）が呼ばれなかった場合の救済（Stripe Webhook）のため、
    // 注文内容をここで一時保存しておく。payment_intent.succeededイベント受信時に
    // app/api/webhooks/stripe がこの内容を正として注文を作成できる
    const { error: pendingError } = await supabaseAdmin.from('pending_orders').upsert({
      payment_intent: data.id,
      member_id: null,
      items,
      subtotal,
      shipping,
      total,
      guest_name,
      guest_email,
      guest_phone: guest_phone || null,
      postal_code: postal_code || null,
      prefecture: prefecture || null,
      city: city || null,
      address_line1,
      address_line2: address_line2 || null,
    })
    if (pendingError) {
      console.error('pending_orders insert error:', pendingError)
      // pending保存に失敗してもStripe決済自体は進められる。Webhook救済が効かなくなるだけなので
      // ブロックしない（/api/ordersでの通常確定フローは影響を受けない）
    }

    return NextResponse.json({ clientSecret: data.client_secret, paymentIntentId: data.id, amount: total })
  } catch (err) {
    console.error('Checkout error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
