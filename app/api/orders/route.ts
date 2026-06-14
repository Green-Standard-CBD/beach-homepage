import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      items, subtotal, shipping, total,
      guest_name, guest_email, guest_phone,
      postal_code, prefecture, city, address_line1, address_line2,
    } = body

    if (!items?.length || !total || !guest_name || !guest_email || !address_line1) {
      return NextResponse.json({ error: 'Invalid order data' }, { status: 400 })
    }

    // メールまたは電話番号で会員を照合
    let member: { id: string; grade: string; points: number; year_amount: number; year_visits: number } | null = null
    if (guest_email) {
      const { data } = await supabaseAdmin
        .from('members')
        .select('id, grade, points, year_amount, year_visits')
        .eq('email', guest_email)
        .single()
      member = data ?? null
    }
    if (!member && guest_phone) {
      const normalized = guest_phone.replace(/[-\s]/g, '')
      const { data } = await supabaseAdmin
        .from('members')
        .select('id, grade, points, year_amount, year_visits')
        .eq('phone', normalized)
        .single()
      member = data ?? null
    }

    const { data, error } = await supabaseAdmin.from('orders').insert({
      member_id: member?.id ?? null,
      items,
      subtotal,
      shipping,
      total,
      status: 'paid',
      guest_name,
      guest_email,
      guest_phone: guest_phone || null,
      postal_code: postal_code || null,
      prefecture: prefecture || null,
      city: city || null,
      address_line1,
      address_line2: address_line2 || null,
    }).select('id').single()

    if (error) {
      console.error('Order insert error:', error)
      return NextResponse.json({ error: 'Failed to save order' }, { status: 500 })
    }

    // 会員のポイント付与（非同期・失敗してもレスポンスはブロックしない）
    if (member) {
      awardPoints({ member, subtotal })
        .catch(err => console.error('Point award error:', err))
    }

    // LINE通知（sho向け）
    notifySho({
      orderId: data.id,
      guestName: guest_name,
      items,
      total,
    }).catch(err => console.error('LINE notify error:', err))

    // メール送信はawaitしない（レスポンスをブロックしない）
    sendOrderConfirmation({
      orderId: data.id,
      guestName: guest_name,
      guestEmail: guest_email,
      items,
      subtotal,
      shipping,
      total,
    }).catch(err => console.error('Order confirmation email error:', err))

    return NextResponse.json({ ok: true, orderId: data.id })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

const POINT_RATES: Record<string, number> = {
  BRONZE: 0.03,
  SILVER: 0.05,
  GOLD: 0.07,
  PLATINUM: 0.09,
  DIAMOND: 0.12,
}

async function awardPoints({
  member, subtotal,
}: {
  member: { id: string; grade: string; points: number; year_amount: number; year_visits: number }
  subtotal: number
}) {
  const rate = POINT_RATES[member.grade] ?? 0.03
  const pts = Math.floor(subtotal * rate)
  const newYearAmount = (member.year_amount ?? 0) + subtotal
  const newYearVisits = (member.year_visits ?? 0) + 1

  let newGrade = member.grade
  if (member.grade === 'BRONZE' && newYearVisits >= 3) {
    newGrade = 'SILVER'
  } else if (member.grade === 'SILVER' && newYearAmount >= 70000) {
    newGrade = 'GOLD'
  } else if (member.grade === 'GOLD' && newYearAmount >= 130000) {
    newGrade = 'PLATINUM'
  } else if (member.grade === 'PLATINUM' && newYearAmount >= 200000) {
    newGrade = 'DIAMOND'
  }

  await supabaseAdmin.from('members').update({
    points: (member.points ?? 0) + pts,
    year_amount: newYearAmount,
    year_visits: newYearVisits,
    grade: newGrade,
  }).eq('id', member.id)

  await supabaseAdmin.from('point_history').insert({
    member_id: member.id,
    label: `ショップ購入（¥${subtotal.toLocaleString()}）`,
    points: pts,
  })
}

async function sendOrderConfirmation({
  orderId, guestName, guestEmail, items, subtotal, shipping, total,
}: {
  orderId: string
  guestName: string
  guestEmail: string
  items: { name: string; variant: string | null; quantity: number; price: number }[]
  subtotal: number
  shipping: number
  total: number
}) {
  const toAddress = process.env.RESEND_TEST_MODE === 'true'
    ? 'beach.project.jp@gmail.com'
    : guestEmail

  const shortId = orderId.slice(0, 8).toUpperCase()

  const itemRows = items.map(i =>
    `<tr>
      <td style="padding:8px 0;border-bottom:1px solid #e0d8cc;font-size:13px;color:#3a4040;">${i.name}${i.variant ? ` (${i.variant})` : ''}</td>
      <td style="padding:8px 0;border-bottom:1px solid #e0d8cc;font-size:13px;color:#3a4040;text-align:center;">${i.quantity}</td>
      <td style="padding:8px 0;border-bottom:1px solid #e0d8cc;font-size:13px;color:#3a4040;text-align:right;">¥${(i.price * i.quantity).toLocaleString()}</td>
    </tr>`
  ).join('')

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'BEACH Hairsalon & cafe <onboarding@resend.dev>',
      to: toAddress,
      subject: `【BEACH Hairsalon & cafe】ご注文確認 #${shortId}`,
      html: `
        <div style="font-family:'Noto Sans JP',sans-serif;max-width:560px;margin:0 auto;padding:40px 20px;background:#fdfaf6;">
          <h2 style="font-size:20px;font-weight:300;letter-spacing:4px;color:#3a4040;margin-bottom:4px;">BEACH Hairsalon & cafe</h2>
          <p style="font-size:11px;letter-spacing:3px;color:#8a7e70;margin-bottom:32px;">ORDER CONFIRMATION</p>

          <p style="font-size:13px;color:#5a6e6e;margin-bottom:8px;">${guestName} 様</p>
          <p style="font-size:13px;color:#5a6e6e;line-height:2;margin-bottom:32px;">
            ご注文いただきありがとうございます。<br>
            以下の内容でご注文を承りました。
          </p>

          <p style="font-size:10px;letter-spacing:3px;color:#8a7e70;margin-bottom:8px;">注文番号</p>
          <p style="font-size:16px;letter-spacing:4px;color:#3a4040;font-weight:bold;margin-bottom:32px;">#${shortId}</p>

          <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
            <thead>
              <tr>
                <th style="font-size:10px;letter-spacing:2px;color:#8a7e70;text-align:left;padding-bottom:8px;border-bottom:1px solid #c8bfb0;">商品</th>
                <th style="font-size:10px;letter-spacing:2px;color:#8a7e70;text-align:center;padding-bottom:8px;border-bottom:1px solid #c8bfb0;">数量</th>
                <th style="font-size:10px;letter-spacing:2px;color:#8a7e70;text-align:right;padding-bottom:8px;border-bottom:1px solid #c8bfb0;">金額</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
          </table>

          <div style="text-align:right;margin-bottom:32px;">
            <p style="font-size:12px;color:#8a7e70;margin-bottom:4px;">小計 ¥${subtotal.toLocaleString()}</p>
            <p style="font-size:12px;color:#8a7e70;margin-bottom:8px;">送料 ${shipping === 0 ? '無料' : `¥${shipping.toLocaleString()}`}</p>
            <p style="font-size:16px;color:#3a4040;font-weight:bold;letter-spacing:2px;">合計 ¥${total.toLocaleString()}</p>
          </div>

          <p style="font-size:11px;color:#8a7e70;line-height:2;border-top:1px solid #e0d8cc;padding-top:24px;">
            ご不明な点はお気軽にお問い合わせください。<br>
            BEACH Hairsalon & cafe
          </p>
        </div>
      `,
    }),
  })
}

async function notifySho({
  orderId, guestName, items, total,
}: {
  orderId: string
  guestName: string
  items: { name: string; variant: string | null; quantity: number; price: number }[]
  total: number
}) {
  const token = process.env.LINE_MESSAGING_TOKEN
  const shoId = process.env.SHO_LINE_USER_ID
  if (!token || !shoId) return

  const shortId = orderId.slice(0, 8).toUpperCase()
  const itemLines = items.map(i =>
    `・${i.name}${i.variant ? `（${i.variant}）` : ''} × ${i.quantity}`
  ).join('\n')

  const text =
    `🛍️ ホームページから注文が入りました\n\n` +
    `注文番号：#${shortId}\n` +
    `お名前：${guestName}\n` +
    `商品：\n${itemLines}\n` +
    `合計：¥${total.toLocaleString()}`

  await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ to: shoId, messages: [{ type: 'text', text }] }),
  })
}
