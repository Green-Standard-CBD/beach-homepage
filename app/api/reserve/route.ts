import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getClientIp } from '@/lib/redis'
import { escapeHtml } from '@/lib/html'

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(req: NextRequest) {
  const okRate = await checkRateLimit(`reserve:${getClientIp(req)}`, 20, 60 * 60)
  if (!okRate) {
    return NextResponse.json({ error: 'リクエストが多すぎます。しばらく時間をおいてお試しください' }, { status: 429 })
  }

  const { name, phone, email, menu_id, menu_name, date, time, block_minutes, stylist_id } = await req.json()

  if (!name || !phone || !menu_id || !date || !time) {
    return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 })
  }

  // 同じ電話番号の会員を検索、なければゲスト会員を作成
  let member_id: string

  const { data: existing } = await adminClient
    .from('members')
    .select('id, line_id')
    .eq('phone', phone)
    .single()

  if (existing) {
    member_id = existing.id
    // 注意：電話番号一致だけで既存会員のemailを上書きしない（本人確認なしのアカウント乗っ取り経路になるため、
    // beach_security_full_audit_v1.md A-8で指摘済み）。emailの変更は別途認証済みのマイページ等から行う想定。
  } else {
    const { data: newMember, error: memberErr } = await adminClient
      .from('members')
      .insert({ name, phone, ...(email ? { email } : {}), grade: 'BRONZE' })
      .select('id')
      .single()

    if (memberErr || !newMember) {
      return NextResponse.json({ error: '会員情報の登録に失敗しました' }, { status: 500 })
    }
    member_id = newMember.id
  }

  // 念のため直前に空き確認
  const { data: available } = await adminClient.rpc('is_slot_available', {
    p_date: date,
    p_time: time,
    p_block_minutes: block_minutes,
  })

  if (available === false) {
    return NextResponse.json({ error: 'その時間はすでに埋まっています' }, { status: 409 })
  }

  const { error } = await adminClient.from('reservations').insert({
    member_id,
    menu_id,
    menu_name,
    date,
    time,
    block_minutes,
    status: 'confirmed',
    ...(stylist_id ? { stylist_id } : {}),
  })

  if (error) {
    return NextResponse.json({ error: '予約の登録に失敗しました' }, { status: 500 })
  }

  // 会員への通知：LINE連携済み → LINEメッセージ、未連携 → メール
  const memberLineId = existing?.line_id ?? null
  const lineToken = process.env.LINE_MESSAGING_TOKEN
  let notifiedByLine = false

  if (memberLineId && lineToken) {
    const stylistLabel = stylist_id === 'fujino' ? '藤野 翔' : '指名なし'
    const dateLabel = formatDate(date)
    const lineText = `【予約完了のお知らせ】\n\n${name} 様\nご予約ありがとうございます。\n\n📅 ${dateLabel} ${time}〜\nメニュー：${menu_name}\nスタイリスト：${stylistLabel}\n所要時間：約${block_minutes}分\n\nご不明な点はお気軽にご連絡ください。\nBEACH Hairsalon & cafe`
    try {
      const lineRes = await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${lineToken}` },
        body: JSON.stringify({ to: memberLineId, messages: [{ type: 'text', text: lineText }] }),
      })
      if (lineRes.ok) notifiedByLine = true
    } catch {}
  }

  if (!notifiedByLine && (email || process.env.RESEND_TEST_MODE === 'true')) {
    sendReservationEmail({ name, email, menu_name, date, time, block_minutes, stylist_id })
      .catch(() => {})
  }

  // sho に LINE 通知
  const shoId = process.env.SHO_LINE_USER_ID
  if (lineToken && shoId) {
    const stylistLabel = stylist_id === 'fujino' ? '藤野翔' : '指名なし'
    const text = `📋 ホームページより新規予約を受け付けました\n\n${formatDate(date)} ${time}〜\n${menu_name}\nスタイリスト：${stylistLabel}\nお名前：${name}（${phone}）`
    await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${lineToken}` },
      body: JSON.stringify({ to: shoId, messages: [{ type: 'text', text }] }),
    }).catch(() => {})
  }

  // HP予約が実際に成立し、お客様・sho双方への通知処理が終わったこのタイミングでのみ、
  // LINE bot側の予約flowState（rsv_flow）をクリアする。「ホームページで予約する」
  // ボタン押下時点ではクリアしない（誤タップしてすぐ戻った場合にLINE予約フローを
  // 継続できるようにするため）。失敗しても予約完了自体は失敗扱いにせず、ログのみ残す。
  // 通知処理より後に置くことで、LINE bot側APIが遅い場合でも顧客通知・sho通知が
  // 待たされないようにしている。
  if (memberLineId) {
    try {
      const clearRes = await fetch('https://beach-line-bot.vercel.app/api/clear-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` },
        body: JSON.stringify({ userId: memberLineId }),
      })
      if (!clearRes.ok) console.error('clear-flow request failed:', clearRes.status)
    } catch (e) {
      console.error('clear-flow request error:', e)
    }
  }

  return NextResponse.json({ ok: true })
}

const DOW = ['日', '月', '火', '水', '木', '金', '土']
function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getMonth() + 1}月${d.getDate()}日（${DOW[d.getDay()]}）`
}

async function sendReservationEmail({
  name, email, menu_name, date, time, block_minutes, stylist_id,
}: {
  name: string; email: string; menu_name: string
  date: string; time: string; block_minutes: number; stylist_id?: string | null
}) {
  const toAddress = process.env.RESEND_TEST_MODE === 'true' ? 'beach.project.jp@gmail.com' : (email || 'beach.project.jp@gmail.com')
  const stylistLabel = stylist_id === 'fujino' ? '藤野 翔' : '指名なし'
  const dateLabel = formatDate(date)

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'BEACH Hairsalon & cafe <onboarding@resend.dev>',
      to: toAddress,
      subject: `【BEACH Hairsalon & cafe】予約完了のお知らせ`,
      html: `
        <div style="font-family:'Noto Sans JP',sans-serif;max-width:560px;margin:0 auto;padding:40px 20px;background:#fdfaf6;">
          <h2 style="font-size:20px;font-weight:300;letter-spacing:4px;color:#3a4040;margin-bottom:4px;">BEACH Hairsalon & cafe</h2>
          <p style="font-size:11px;letter-spacing:3px;color:#8a7e70;margin-bottom:32px;">予約完了のお知らせ</p>

          <p style="font-size:13px;color:#5a6e6e;margin-bottom:8px;">${escapeHtml(name)} 様</p>
          <p style="font-size:13px;color:#5a6e6e;line-height:2;margin-bottom:32px;">
            ご予約ありがとうございます。<br>
            以下の内容でご予約を承りました。
          </p>

          <table style="width:100%;border-collapse:collapse;margin-bottom:32px;">
            ${[
              ['来店日時', `${escapeHtml(dateLabel)}　${escapeHtml(time)}〜（約${Number(block_minutes)}分）`],
              ['メニュー', escapeHtml(menu_name)],
              ['スタイリスト', escapeHtml(stylistLabel)],
              ['ご予約者', `${escapeHtml(name)} 様`],
            ].map(([label, value]) => `
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #e0d8cc;font-size:11px;letter-spacing:2px;color:#8a7e70;width:100px;">${label}</td>
                <td style="padding:10px 0;border-bottom:1px solid #e0d8cc;font-size:13px;color:#3a4040;">${value}</td>
              </tr>`).join('')}
          </table>

          <div style="background:#f5f0e8;padding:16px;margin-bottom:32px;">
            <p style="font-size:11px;color:#8a7e70;line-height:2;margin:0;">
              【キャンセルについて】<br>
              ご予約日の前日23:59までのキャンセルはお受けしております。<br>
              当日のキャンセルはキャンセル料が発生する場合がございます。
            </p>
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
