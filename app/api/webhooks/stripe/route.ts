import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { finalizeOrder, alertSho } from '@/lib/finalizeOrder'

// /api/orders はクライアント（ブラウザ）が決済成功後に自発的に呼ぶ前提だが、決済成功直後に
// タブを閉じる・通信が切れる等でクライアントが二度と/api/ordersを呼ばないケースでは、
// 注文が永久に作られない穴があった（B-2/B-3の残課題）。このWebhookはStripe側から
// payment_intent.succeededイベントを受け取り、/api/ordersが呼ばれていない決済を
// 自動で救済する安全網。beach-app側のsupabase/functions/stripe-webhookと同じ設計。
//
// 必須環境変数：STRIPE_WEBHOOK_SECRET（Stripeダッシュボード→Webhooks→該当エンドポイントの
// 「署名シークレット」。STRIPE_SECRET_KEYとは別物）

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? ''
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? ''

export async function POST(req: NextRequest) {
  if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
    console.error('stripe-webhook: env not set')
    return NextResponse.json({ error: 'env not set' }, { status: 500 })
  }

  // apiVersionは指定しない（SDKに組み込みのデフォルトを使う。Webhook署名検証自体は
  // APIバージョンに依存しないため問題ない）
  const stripe = new Stripe(STRIPE_SECRET_KEY)

  // 署名検証には生のリクエストボディが必要（JSON.parse前のテキストを使う）
  const rawBody = await req.text()
  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'missing stripe-signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET)
  } catch (e) {
    console.error('stripe-webhook: signature verification failed', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 })
  }

  if (event.type !== 'payment_intent.succeeded') {
    return NextResponse.json({ ok: true, ignored: event.type })
  }

  const paymentIntent = event.data.object as Stripe.PaymentIntent

  try {
    const result = await finalizeOrder(paymentIntent.id)

    if (!result.ok) {
      if (result.status !== 409) {
        await alertSho(
          `⚠️ Stripe Webhookで注文の自動救済に失敗しました\n\npayment_intent：${paymentIntent.id}\n` +
          `理由：${result.error}\n\n決済は成功しています。手動で注文作成が必要か確認してください。`
        )
      }
      // Stripeへは200を返す（4xx/5xxを返すとリトライされ続けるため。アラート済みなので
      // ここでの再試行は無意味）
      return NextResponse.json({ ok: false, error: result.error })
    }

    return NextResponse.json({ ok: true, orderId: result.orderId })
  } catch (err) {
    console.error('stripe-webhook: finalizeOrder threw', err)
    await alertSho(
      `⚠️ Stripe Webhook処理で例外が発生しました\n\npayment_intent：${paymentIntent.id}\n` +
      `エラー：${err instanceof Error ? err.message : String(err)}\n\n決済は成功しています。手動確認してください。`
    )
    // 一時的なDB障害等の可能性もあるためStripeのリトライに任せる
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}
