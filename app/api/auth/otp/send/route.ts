import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomInt } from 'crypto'
import { checkRateLimit, getClientIp } from '@/lib/redis'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { email } = await req.json()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'メールアドレスが正しくありません' }, { status: 400 })
  }

  // レート制限：同一メール5回/1時間、同一IP10回/1時間
  const ip = getClientIp(req)
  const [emailOk, ipOk] = await Promise.all([
    checkRateLimit(`otp-send:email:${email}`, 5, 60 * 60),
    checkRateLimit(`otp-send:ip:${ip}`, 10, 60 * 60),
  ])
  if (!emailOk || !ipOk) {
    return NextResponse.json({ error: 'リクエストが多すぎます。しばらく時間をおいてお試しください' }, { status: 429 })
  }

  // 8桁ランダムコード生成（暗号学的乱数）
  const code = String(randomInt(10000000, 100000000))

  // 既存の未使用コードを無効化
  await supabaseAdmin
    .from('email_verifications')
    .update({ used: true })
    .eq('email', email)
    .eq('used', false)

  // 新しいコードを保存
  const { error: insertError } = await supabaseAdmin
    .from('email_verifications')
    .insert({ email, code })

  if (insertError) {
    console.error('OTP insert error:', insertError)
    return NextResponse.json({ error: '認証コードの生成に失敗しました' }, { status: 500 })
  }

  // ドメイン未取得のためテスト中は登録メールに送信（ドメイン取得後: to:emailに戻す・fromをカスタムドメインに変更）
  const toAddress = process.env.RESEND_TEST_MODE === 'true'
    ? 'beach.project.jp@gmail.com'
    : email

  // Resend でメール送信
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'BEACH Hairsalon & cafe <onboarding@resend.dev>',
      to: toAddress,
      subject: 'BEACH Hairsalon & cafe 認証コード',
      html: `
        <div style="font-family: 'Noto Sans JP', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
          <h2 style="font-size: 20px; font-weight: 300; letter-spacing: 4px; color: #3a4040; margin-bottom: 8px;">BEACH Hairsalon & cafe</h2>
          <p style="font-size: 11px; letter-spacing: 3px; color: #8a7e70; margin-bottom: 40px;">ご購入確認</p>
          <p style="font-size: 13px; color: #5a6e6e; margin-bottom: 24px;">以下の認証コードを入力してください。</p>
          <div style="background: #fdfaf6; border: 1px solid #e0d8cc; padding: 24px; text-align: center; margin-bottom: 24px;">
            <span style="font-size: 36px; font-weight: bold; letter-spacing: 12px; color: #3a4040;">${code}</span>
          </div>
          <p style="font-size: 11px; color: #8a7e70; line-height: 1.8;">このコードは10分間有効です。<br>身に覚えがない場合はこのメールを無視してください。</p>
        </div>
      `,
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    console.error('Resend error:', err)
    return NextResponse.json({ error: 'メールの送信に失敗しました' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
