import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchHotpepperEmails } from '@/lib/hotpepper-gmail'
import { markHpSyncDone } from '@/lib/redis'

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function notifySho(text: string) {
  const token = process.env.LINE_MESSAGING_TOKEN
  const shoId = process.env.SHO_LINE_USER_ID
  if (!token || !shoId) return
  await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ to: shoId, messages: [{ type: 'text', text }] }),
  }).catch(() => {})
}

export async function GET(request: Request) {
  // Vercel cronからの呼び出し検証
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const emails = await fetchHotpepperEmails()
    const results = { inserted: 0, cancelled: 0, skipped: 0, errors: 0 }

    for (const email of emails) {
      if (email.type === 'new') {
        const { error } = await adminClient.from('reservations').insert({
          member_id: null,
          guest_name: email.guestName,
          menu_name: email.menuName,
          date: email.date,
          time: email.time,
          block_minutes: email.blockMinutes,
          status: 'confirmed',
          stylist_id: email.stylistId,
          source: 'hotpepper',
          hp_reservation_id: email.reservationId,
        })

        if (error) {
          if (error.code === '23505') {
            results.skipped++
          } else {
            console.error('Insert error:', error)
            results.errors++
          }
        } else {
          results.inserted++
          await notifySho(
            `📋 ホットペッパーより予約が入りました\n\n${email.date.replace(/-/g, '/')} ${email.time}〜\n${email.menuName}\nお名前：${email.guestName} 様\n予約番号：${email.reservationId}`
          )
        }
      } else {
        // キャンセル
        const { error, data: cancelledRows } = await adminClient
          .from('reservations')
          .update({ status: 'cancelled' })
          .eq('hp_reservation_id', email.reservationId)
          .neq('status', 'cancelled')
          .select('id')

        if (error) {
          results.errors++
        } else if (cancelledRows && cancelledRows.length > 0) {
          results.cancelled++
          await notifySho(
            `❌ ホットペッパー予約がキャンセルされました\n\n予約番号：${email.reservationId}\nお名前：${email.guestName} 様`
          )
        } else {
          results.skipped++
        }
      }
    }

    // どのトリガー経由でも実行時刻を記録（admin自動同期の重複防止）
    await markHpSyncDone().catch(() => {})
    return NextResponse.json({ ok: true, ...results })
  } catch (err) {
    console.error('Hotpepper sync error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
