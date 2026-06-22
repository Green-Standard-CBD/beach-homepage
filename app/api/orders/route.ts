import { NextRequest, NextResponse } from 'next/server'
import { finalizeOrder } from '@/lib/finalizeOrder'

export async function POST(req: NextRequest) {
  try {
    const { payment_intent_id } = await req.json()
    if (!payment_intent_id || typeof payment_intent_id !== 'string') {
      return NextResponse.json({ error: 'payment_intent_id is required' }, { status: 400 })
    }

    // 注文確定の実処理はapp/api/webhooks/stripeと共有（lib/finalizeOrder.ts）。
    // items/guest情報/住所はクライアントから再送させず、/api/checkout時点で
    // pending_ordersに保存しておいた内容を正として使う
    const result = await finalizeOrder(payment_intent_id)

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }
    return NextResponse.json({ ok: true, orderId: result.orderId, pointsAdded: result.pointsAdded })
  } catch (err) {
    console.error('Order finalize error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
