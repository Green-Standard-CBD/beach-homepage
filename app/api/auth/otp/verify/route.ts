import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit } from '@/lib/redis'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { email, code } = await req.json()
  if (!email || !code) {
    return NextResponse.json({ error: '入力が不正です' }, { status: 400 })
  }

  // レート制限：同一メール10回/15分（OTP総当たり対策）
  const okRate = await checkRateLimit(`otp-verify:${email}`, 10, 15 * 60)
  if (!okRate) {
    return NextResponse.json({ error: '試行回数が多すぎます。しばらく時間をおいてお試しください' }, { status: 429 })
  }

  const { data, error } = await supabaseAdmin
    .from('email_verifications')
    .select('id, expires_at, used')
    .eq('email', email)
    .eq('code', code)
    .eq('used', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: '認証コードが正しくありません' }, { status: 400 })
  }

  if (new Date(data.expires_at) < new Date()) {
    return NextResponse.json({ error: '認証コードの有効期限が切れています。再送信してください。' }, { status: 400 })
  }

  // 使用済みにする
  await supabaseAdmin
    .from('email_verifications')
    .update({ used: true })
    .eq('id', data.id)

  return NextResponse.json({ ok: true })
}
