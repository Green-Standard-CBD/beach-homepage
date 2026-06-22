import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomInt } from 'crypto'
import { checkRateLimit, getClientIp } from '@/lib/redis'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(req: NextRequest) {
  const { phone } = await req.json()
  if (!phone) {
    return NextResponse.json({ error: '電話番号を入力してください' }, { status: 400 })
  }

  const normalized = phone.replace(/[-\s]/g, '')
  if (!/^\d{10,11}$/.test(normalized)) {
    return NextResponse.json({ error: '電話番号が正しくありません（ハイフンなし10〜11桁）' }, { status: 400 })
  }

  // レート制限：同一電話番号5回/1時間、同一IP10回/1時間（SMS爆撃対策）
  const ip = getClientIp(req)
  const [phoneOk, ipOk] = await Promise.all([
    checkRateLimit(`sms-send:phone:${normalized}`, 5, 60 * 60),
    checkRateLimit(`sms-send:ip:${ip}`, 10, 60 * 60),
  ])
  if (!phoneOk || !ipOk) {
    return NextResponse.json({ error: 'リクエストが多すぎます。しばらく時間をおいてお試しください' }, { status: 429 })
  }

  // 6桁コード生成（暗号学的乱数）
  const code = String(randomInt(100000, 1000000))
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10分

  // DBに保存（同じ番号は上書き）
  const { error: dbError } = await admin
    .from('phone_otps')
    .upsert({ phone: normalized, code, expires_at: expiresAt })

  if (dbError) {
    console.error('phone_otps upsert error:', dbError)
    return NextResponse.json({ error: 'コード生成に失敗しました' }, { status: 500 })
  }

  // Twilioで送信
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken  = process.env.TWILIO_AUTH_TOKEN
  const fromNumber = process.env.TWILIO_PHONE_NUMBER

  if (accountSid && authToken && fromNumber) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const twilio = require('twilio')
      const client = twilio(accountSid, authToken)
      const e164 = '+81' + normalized.slice(1)
      await client.messages.create({
        body: `【BEACH Hairsalon & cafe】認証コード: ${code}（10分間有効）`,
        from: fromNumber,
        to: e164,
      })
    } catch (err) {
      console.error('Twilio send error:', err)
      return NextResponse.json({ error: 'SMSの送信に失敗しました' }, { status: 500 })
    }
  } else {
    console.warn('[SMS] Twilio未設定 — コード:', code)
  }

  return NextResponse.json({ ok: true })
}
