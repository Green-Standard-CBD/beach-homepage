import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit } from '@/lib/redis'
import { signMemberCookie } from '@/lib/memberCookie'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(req: NextRequest) {
  const { phone, code } = await req.json()
  if (!phone || !code) {
    return NextResponse.json({ error: '電話番号と認証コードが必要です' }, { status: 400 })
  }

  const normalized = phone.replace(/[-\s]/g, '')

  // レート制限：同一電話番号10回/15分（OTP総当たり対策）
  const okRate = await checkRateLimit(`sms-verify:${normalized}`, 10, 15 * 60)
  if (!okRate) {
    return NextResponse.json({ error: '試行回数が多すぎます。しばらく時間をおいてお試しください' }, { status: 429 })
  }

  // OTPを照合
  const { data: otp, error: otpError } = await admin
    .from('phone_otps')
    .select('code, expires_at')
    .eq('phone', normalized)
    .single()

  const testCode = process.env.SMS_TEST_CODE
  const isTestCode = testCode && String(code).trim() === testCode

  if (!isTestCode) {
    if (otpError || !otp) {
      return NextResponse.json({ error: '認証コードが見つかりません。再度SMSを送信してください。' }, { status: 400 })
    }

    if (new Date(otp.expires_at) < new Date()) {
      await admin.from('phone_otps').delete().eq('phone', normalized)
      return NextResponse.json({ error: '認証コードの有効期限が切れています。再度SMSを送信してください。' }, { status: 400 })
    }

    if (otp.code !== String(code).trim()) {
      return NextResponse.json({ error: '認証コードが正しくありません。' }, { status: 400 })
    }
  }

  // 使用済みコードを削除
  await admin.from('phone_otps').delete().eq('phone', normalized)

  // membersテーブルを照合（OTP検証済みの本人のみがここに到達するため、
  // 住所等のPIIもここで一緒に返してよい。member-lookup APIは廃止した）
  const { data: member } = await admin
    .from('members')
    .select('id, name, phone, email, postal_code, prefecture, city, address_line1, address_line2')
    .eq('phone', normalized)
    .single()

  const memberData = member
    ? {
        id: member.id, name: member.name, phone: member.phone, email: member.email ?? '',
        postal_code: member.postal_code ?? '', prefecture: member.prefecture ?? '',
        city: member.city ?? '', address_line1: member.address_line1 ?? '', address_line2: member.address_line2 ?? '',
      }
    : { id: null, name: '', phone: normalized, email: '' }

  // セッションcookieをセット
  const res = NextResponse.json({ ok: true, member: memberData })
  res.cookies.set('hp_member', signMemberCookie(memberData), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7, // 7日
    sameSite: 'lax',
    path: '/',
  })
  return res
}
