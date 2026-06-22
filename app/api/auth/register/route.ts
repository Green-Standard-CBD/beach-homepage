import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { signMemberCookie } from '@/lib/memberCookie'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { email, name, phone, postal_code, prefecture, city, address_line1, address_line2 } = await req.json()

  if (!email || !name) {
    return NextResponse.json({ error: '名前とメールアドレスは必須です' }, { status: 400 })
  }

  // メールOTP検証済みであることを必須にする（直近30分以内に検証成功した記録があるか）
  // /api/auth/otp/verify が used=true にマークしたレコードのみ有効とみなす
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
  const { data: verification } = await supabaseAdmin
    .from('email_verifications')
    .select('id, created_at')
    .eq('email', email)
    .eq('used', true)
    .gte('created_at', thirtyMinAgo)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!verification) {
    return NextResponse.json({ error: 'メールアドレスの確認が完了していません。認証コードを再送信してください。' }, { status: 403 })
  }

  // メール重複チェック
  const { data: existing } = await supabaseAdmin
    .from('members')
    .select('id')
    .eq('email', email)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'このメールアドレスはすでに会員登録されています。別のメールアドレスをお使いください。', code: 'ALREADY_REGISTERED' }, { status: 409 })
  }

  // 会員番号生成（既存最大値+1）
  const { data: maxRow } = await supabaseAdmin
    .from('members')
    .select('member_number')
    .order('member_number', { ascending: false })
    .limit(1)
    .single()

  const memberNumber = ((maxRow?.member_number as number) ?? 0) + 1

  const { data, error } = await supabaseAdmin
    .from('members')
    .insert({
      email,
      name,
      phone: phone || null,
      postal_code: postal_code || null,
      prefecture: prefecture || null,
      city: city || null,
      address_line1: address_line1 || null,
      address_line2: address_line2 || null,
      member_number: memberNumber,
      points: 0,
      grade: 'BRONZE',
    })
    .select('id, name, email, phone, member_number, points, postal_code, prefecture, city, address_line1, address_line2')
    .single()

  if (error) {
    console.error('Register error:', error.message, error.code)
    if (error.message?.includes('members_phone_key')) {
      return NextResponse.json({ error: 'この電話番号はすでに登録されています' }, { status: 409 })
    }
    return NextResponse.json({ error: '登録に失敗しました' }, { status: 500 })
  }

  const res = NextResponse.json({ ok: true, member: data })
  res.cookies.set('hp_member', signMemberCookie(data), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30, // 30日
    sameSite: 'lax',
    path: '/',
  })
  return res
}
