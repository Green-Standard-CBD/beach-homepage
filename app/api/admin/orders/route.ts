import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { escapeHtml } from '@/lib/html'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function isAuthed(req: NextRequest) {
  const token = req.cookies.get('admin_auth')?.value
  return token && token === process.env.ADMIN_TOKEN
}

export async function GET(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') ?? 'paid'

  const { data, error } = await supabaseAdmin
    .from('orders')
    .select(`
      id, created_at, status, items, subtotal, shipping, total,
      guest_name, guest_email, guest_phone,
      postal_code, prefecture, city, address_line1, address_line2,
      member_id,
      members (name, email, phone)
    `)
    .eq('status', status)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ orders: data })
}

export async function PATCH(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, status } = await req.json()
  if (!id || !status) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('orders')
    .update({ status })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 発送済みにした時だけお客様に通知メールを送る
  if (status === 'shipped') {
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('id, items, total, guest_name, guest_email, members(name, email)')
      .eq('id', id)
      .single()

    if (order) {
      const m = Array.isArray(order.members) ? order.members[0] : order.members as { name: string; email: string } | null
      const name  = order.guest_name ?? m?.name ?? ''
      const email = order.guest_email ?? m?.email ?? ''
      if (email) {
        sendShippingNotification({ orderId: id, name, email, items: order.items, total: order.total })
          .catch(err => console.error('Shipping notify error:', err))
      }
    }
  }

  return NextResponse.json({ ok: true })
}

async function sendShippingNotification({
  orderId, name, email, items, total,
}: {
  orderId: string
  name: string
  email: string
  items: { name: string; variant?: string | null; size?: string | null; quantity: number; price: number }[]
  total: number
}) {
  const toAddress = process.env.RESEND_TEST_MODE === 'true' ? 'beach.project.jp@gmail.com' : email
  const shortId = orderId.slice(0, 8).toUpperCase()

  const itemRows = items.map(i =>
    `<tr>
      <td style="padding:8px 0;border-bottom:1px solid #e0d8cc;font-size:13px;color:#3a4040;">
        ${escapeHtml(i.name)}${i.variant ? ` (${escapeHtml(i.variant)})` : i.size ? ` (${escapeHtml(i.size)})` : ''}
      </td>
      <td style="padding:8px 0;border-bottom:1px solid #e0d8cc;font-size:13px;color:#3a4040;text-align:center;">${Number(i.quantity)}</td>
      <td style="padding:8px 0;border-bottom:1px solid #e0d8cc;font-size:13px;color:#3a4040;text-align:right;">¥${(i.price * i.quantity).toLocaleString()}</td>
    </tr>`
  ).join('')

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'BEACH Hairsalon & cafe <onboarding@resend.dev>',
      to: toAddress,
      subject: `【BEACH Hairsalon & cafe】ご注文を発送しました #${shortId}`,
      html: `
        <div style="font-family:'Noto Sans JP',sans-serif;max-width:560px;margin:0 auto;padding:40px 20px;background:#fdfaf6;">
          <h2 style="font-size:20px;font-weight:300;letter-spacing:4px;color:#3a4040;margin-bottom:4px;">BEACH Hairsalon & cafe</h2>
          <p style="font-size:11px;letter-spacing:3px;color:#8a7e70;margin-bottom:32px;">SHIPPING NOTIFICATION</p>

          <p style="font-size:13px;color:#5a6e6e;margin-bottom:8px;">${escapeHtml(name)} 様</p>
          <p style="font-size:13px;color:#5a6e6e;line-height:2;margin-bottom:32px;">
            ご注文の商品を発送いたしました。<br>
            到着まで今しばらくお待ちください。
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
