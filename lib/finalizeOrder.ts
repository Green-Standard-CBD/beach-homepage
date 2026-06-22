import { createClient } from '@supabase/supabase-js'
import { escapeHtml } from './html'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// app/api/orders（クライアント起動）とapp/api/webhooks/stripe（Stripeからの自動起動）の
// 両方から呼ばれる、注文確定の共通ロジック。決済済みのpayment_intentを正として
// orders作成・ポイント付与・メール送信・sho通知を一括で行う。
// beach-appのsupabase/functions/_shared/finalizeOrder.tsと同じ設計（claimed_atによる
// 原子的クレーム機構）を踏襲している。

const POINT_RATES: Record<string, number> = {
  BRONZE: 0.03, SILVER: 0.05, GOLD: 0.07, PLATINUM: 0.09, DIAMOND: 0.12,
}

type OrderItem = { id: string; name: string; price: number; quantity: number; variant: string | null }

type PendingOrder = {
  payment_intent: string
  member_id: string | null
  items: OrderItem[]
  subtotal: number
  shipping: number
  total: number
  guest_name: string | null
  guest_email: string | null
  guest_phone: string | null
  postal_code: string | null
  prefecture: string | null
  city: string | null
  address_line1: string | null
  address_line2: string | null
}

export type FinalizeResult =
  | { ok: true; orderId: string; pointsAdded: boolean; status: 200 }
  | { ok: false; error: string; status: number }

/** StripeのPaymentIntentが実在し、決済成功済みかをサーバー側で検証する */
async function fetchPaymentIntent(paymentIntentId: string): Promise<{ status: string; amount: number } | null> {
  const res = await fetch(`https://api.stripe.com/v1/payment_intents/${paymentIntentId}`, {
    headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
  })
  if (!res.ok) return null
  return res.json()
}

export async function finalizeOrder(paymentIntentId: string): Promise<FinalizeResult> {
  // 冪等性：既にこのpayment_intentで注文が作成済みなら、その注文を返して終わる
  const { data: existingOrder } = await supabaseAdmin
    .from('orders')
    .select('id')
    .eq('payment_intent', paymentIntentId)
    .maybeSingle()
  if (existingOrder) {
    return { ok: true, orderId: existingOrder.id, pointsAdded: false, status: 200 }
  }

  // pending_ordersを原子的に「claim」する（beach-appのconfirm-orderと同じ方式）
  const { data: claimedRows, error: claimError } = await supabaseAdmin
    .from('pending_orders')
    .update({ claimed_at: new Date().toISOString() })
    .eq('payment_intent', paymentIntentId)
    .is('claimed_at', null)
    .select('*')
  if (claimError) throw new Error(`pending_orders claim failed: ${claimError.message}`)

  if (!claimedRows || claimedRows.length === 0) {
    return { ok: false, error: 'pending order not found or already being processed', status: 409 }
  }
  const order = claimedRows[0] as PendingOrder

  async function unclaim(): Promise<void> {
    await supabaseAdmin.from('pending_orders').update({ claimed_at: null }).eq('payment_intent', paymentIntentId)
  }

  const intent = await fetchPaymentIntent(paymentIntentId)
  if (!intent || intent.status !== 'succeeded') {
    await unclaim()
    return { ok: false, error: 'payment not succeeded', status: 402 }
  }
  if (intent.amount !== order.total) {
    await unclaim()
    return { ok: false, error: 'amount mismatch', status: 402 }
  }

  // メールまたは電話番号で会員を照合
  let member: { id: string; grade: string; points: number; year_amount: number; year_visits: number } | null = null
  if (order.guest_email) {
    const { data } = await supabaseAdmin
      .from('members')
      .select('id, grade, points, year_amount, year_visits')
      .eq('email', order.guest_email)
      .single()
    member = data ?? null
  }
  if (!member && order.guest_phone) {
    const { data } = await supabaseAdmin
      .from('members')
      .select('id, grade, points, year_amount, year_visits')
      .eq('phone', order.guest_phone)
      .single()
    member = data ?? null
  }

  const { data: insertedOrder, error: insertError } = await supabaseAdmin.from('orders').insert({
    member_id: member?.id ?? null,
    items: order.items,
    subtotal: order.subtotal,
    shipping: order.shipping,
    total: order.total,
    status: 'paid',
    payment_intent: paymentIntentId,
    guest_name: order.guest_name,
    guest_email: order.guest_email,
    guest_phone: order.guest_phone,
    postal_code: order.postal_code,
    prefecture: order.prefecture,
    city: order.city,
    address_line1: order.address_line1,
    address_line2: order.address_line2,
  }).select('id').single()

  if (insertError) {
    if (insertError.code === '23505') {
      const { data: raceOrder } = await supabaseAdmin.from('orders').select('id').eq('payment_intent', paymentIntentId).single()
      if (raceOrder) {
        return { ok: true, orderId: raceOrder.id, pointsAdded: false, status: 200 }
      }
    }
    await unclaim()
    throw new Error(`order insert failed: ${insertError.message}`)
  }

  let pointsAdded = false
  try {
    await supabaseAdmin.from('pending_orders').delete().eq('payment_intent', paymentIntentId)

    if (member) {
      try {
        const rate = POINT_RATES[member.grade] ?? 0.03
        const pts = Math.floor(order.subtotal * rate)
        const newYearAmount = (member.year_amount ?? 0) + order.subtotal
        const newYearVisits = (member.year_visits ?? 0) + 1
        let newGrade = member.grade
        if (member.grade === 'BRONZE' && newYearVisits >= 3) newGrade = 'SILVER'
        else if (member.grade === 'SILVER' && newYearAmount >= 70000) newGrade = 'GOLD'
        else if (member.grade === 'GOLD' && newYearAmount >= 130000) newGrade = 'PLATINUM'
        else if (member.grade === 'PLATINUM' && newYearAmount >= 200000) newGrade = 'DIAMOND'

        await supabaseAdmin.from('members').update({
          points: (member.points ?? 0) + pts,
          year_amount: newYearAmount,
          year_visits: newYearVisits,
          grade: newGrade,
        }).eq('id', member.id)

        await supabaseAdmin.from('point_history').insert({
          member_id: member.id,
          label: `ショップ購入（¥${order.subtotal.toLocaleString()}）`,
          points: pts,
        })
        pointsAdded = pts > 0
      } catch (err) {
        await alertSho(`⚠️ ポイント付与に失敗しました\n\n注文ID：${insertedOrder.id}\n会員ID：${member.id}\nエラー：${err instanceof Error ? err.message : String(err)}\n\n手動確認してください。`)
      }
    }

    notifySho({ orderId: insertedOrder.id, guestName: order.guest_name ?? '不明', items: order.items, total: order.total })
      .catch(err => console.error('LINE notify error:', err))

    if (order.guest_email) {
      sendOrderConfirmation({
        orderId: insertedOrder.id,
        guestName: order.guest_name ?? '',
        guestEmail: order.guest_email,
        items: order.items,
        subtotal: order.subtotal,
        shipping: order.shipping,
        total: order.total,
      }).catch(err => console.error('Order confirmation email error:', err))
    }
  } catch (postProcessErr) {
    await alertSho(
      `⚠️ 注文確定後処理でエラー\n\n注文ID：${insertedOrder.id}\npayment_intent：${paymentIntentId}\n` +
      `エラー：${postProcessErr instanceof Error ? postProcessErr.message : String(postProcessErr)}\n\n手動確認してください。`
    )
  }

  return { ok: true, orderId: insertedOrder.id, pointsAdded, status: 200 }
}

async function sendOrderConfirmation({
  orderId, guestName, guestEmail, items, subtotal, shipping, total,
}: {
  orderId: string
  guestName: string
  guestEmail: string
  items: OrderItem[]
  subtotal: number
  shipping: number
  total: number
}) {
  const toAddress = process.env.RESEND_TEST_MODE === 'true' ? 'beach.project.jp@gmail.com' : guestEmail
  const shortId = orderId.slice(0, 8).toUpperCase()

  const itemRows = items.map(i =>
    `<tr>
      <td style="padding:8px 0;border-bottom:1px solid #e0d8cc;font-size:13px;color:#3a4040;">${escapeHtml(i.name)}${i.variant ? ` (${escapeHtml(i.variant)})` : ''}</td>
      <td style="padding:8px 0;border-bottom:1px solid #e0d8cc;font-size:13px;color:#3a4040;text-align:center;">${Number(i.quantity)}</td>
      <td style="padding:8px 0;border-bottom:1px solid #e0d8cc;font-size:13px;color:#3a4040;text-align:right;">¥${(i.price * i.quantity).toLocaleString()}</td>
    </tr>`
  ).join('')

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'BEACH Hairsalon & cafe <onboarding@resend.dev>',
      to: toAddress,
      subject: `【BEACH Hairsalon & cafe】ご注文確認 #${shortId}`,
      html: `
        <div style="font-family:'Noto Sans JP',sans-serif;max-width:560px;margin:0 auto;padding:40px 20px;background:#fdfaf6;">
          <h2 style="font-size:20px;font-weight:300;letter-spacing:4px;color:#3a4040;margin-bottom:4px;">BEACH Hairsalon & cafe</h2>
          <p style="font-size:11px;letter-spacing:3px;color:#8a7e70;margin-bottom:32px;">ORDER CONFIRMATION</p>
          <p style="font-size:13px;color:#5a6e6e;margin-bottom:8px;">${escapeHtml(guestName)} 様</p>
          <p style="font-size:13px;color:#5a6e6e;line-height:2;margin-bottom:32px;">ご注文いただきありがとうございます。<br>以下の内容でご注文を承りました。</p>
          <p style="font-size:10px;letter-spacing:3px;color:#8a7e70;margin-bottom:8px;">注文番号</p>
          <p style="font-size:16px;letter-spacing:4px;color:#3a4040;font-weight:bold;margin-bottom:32px;">#${shortId}</p>
          <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
            <thead><tr>
              <th style="font-size:10px;letter-spacing:2px;color:#8a7e70;text-align:left;padding-bottom:8px;border-bottom:1px solid #c8bfb0;">商品</th>
              <th style="font-size:10px;letter-spacing:2px;color:#8a7e70;text-align:center;padding-bottom:8px;border-bottom:1px solid #c8bfb0;">数量</th>
              <th style="font-size:10px;letter-spacing:2px;color:#8a7e70;text-align:right;padding-bottom:8px;border-bottom:1px solid #c8bfb0;">金額</th>
            </tr></thead>
            <tbody>${itemRows}</tbody>
          </table>
          <div style="text-align:right;margin-bottom:32px;">
            <p style="font-size:12px;color:#8a7e70;margin-bottom:4px;">小計 ¥${subtotal.toLocaleString()}</p>
            <p style="font-size:12px;color:#8a7e70;margin-bottom:8px;">送料 ${shipping === 0 ? '無料' : `¥${shipping.toLocaleString()}`}</p>
            <p style="font-size:16px;color:#3a4040;font-weight:bold;letter-spacing:2px;">合計 ¥${total.toLocaleString()}</p>
          </div>
          <p style="font-size:11px;color:#8a7e70;line-height:2;border-top:1px solid #e0d8cc;padding-top:24px;">ご不明な点はお気軽にお問い合わせください。<br>BEACH Hairsalon & cafe</p>
        </div>
      `,
    }),
  })
}

async function notifySho({
  orderId, guestName, items, total,
}: { orderId: string; guestName: string; items: OrderItem[]; total: number }) {
  const token = process.env.LINE_MESSAGING_TOKEN
  const shoId = process.env.SHO_LINE_USER_ID
  if (!token || !shoId) return

  const shortId = orderId.slice(0, 8).toUpperCase()
  const itemLines = items.map(i => `・${i.name}${i.variant ? `（${i.variant}）` : ''} × ${i.quantity}`).join('\n')
  const text =
    `🛍️ ホームページから注文が入りました\n\n注文番号：#${shortId}\nお名前：${guestName}\n商品：\n${itemLines}\n合計：¥${total.toLocaleString()}`

  await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: shoId, messages: [{ type: 'text', text }] }),
  })
}

/** 注文確定後の後処理失敗・Webhook救済失敗時の緊急アラート用 */
export async function alertSho(text: string) {
  const token = process.env.LINE_MESSAGING_TOKEN
  const shoId = process.env.SHO_LINE_USER_ID
  if (!token || !shoId) return
  await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: shoId, messages: [{ type: 'text', text }] }),
  })
}
