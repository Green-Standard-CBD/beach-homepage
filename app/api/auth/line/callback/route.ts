import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const savedState = req.cookies.get('line_oauth_state')?.value

  if (!code || !state || state !== savedState) {
    const returnTo = req.cookies.get('line_return_to')?.value ?? 'checkout'
    const dest = returnTo === 'reservation' ? '/reservation?error=line_auth_failed'
      : returnTo === 'mypage' ? '/mypage?error=line_auth_failed'
      : '/checkout?error=line_auth_failed'
    const res = NextResponse.redirect(new URL(dest, req.url))
    res.cookies.delete('line_oauth_state')
    res.cookies.delete('line_return_to')
    return res
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3001'
  const redirectUri = `${baseUrl}/api/auth/line/callback`

  // LINEのアクセストークンを取得
  const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: process.env.NEXT_PUBLIC_LINE_LOGIN_CHANNEL_ID!,
      client_secret: process.env.LINE_LOGIN_CHANNEL_SECRET!,
    }),
  })

  const tokenData = await tokenRes.json()
  if (!tokenData.access_token) {
    const returnTo = req.cookies.get('line_return_to')?.value ?? 'checkout'
    const dest = returnTo === 'reservation' ? '/reservation?error=line_auth_failed'
      : returnTo === 'mypage' ? '/mypage?error=line_auth_failed'
      : '/checkout?error=line_token_failed'
    const res = NextResponse.redirect(new URL(dest, req.url))
    res.cookies.delete('line_oauth_state')
    res.cookies.delete('line_return_to')
    return res
  }

  // LINEプロフィール取得
  const profileRes = await fetch('https://api.line.me/v2/profile', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  })
  const profile = await profileRes.json()
  const lineId: string = profile.userId ?? ''
  const displayName: string = profile.displayName ?? ''

  // membersテーブルでline_idを照合
  const { data: member } = await supabaseAdmin
    .from('members')
    .select('id, name, email, phone, postal_code, prefecture, city, address_line1, address_line2')
    .eq('line_id', lineId)
    .single()

  const memberData = JSON.stringify({
    lineId,
    name: member?.name ?? displayName,
    email: member?.email ?? '',
    phone: member?.phone ?? '',
    postal_code: member?.postal_code ?? '',
    prefecture: member?.prefecture ?? '',
    city: member?.city ?? '',
    address_line1: member?.address_line1 ?? '',
    address_line2: member?.address_line2 ?? '',
    is_member: !!member,
  })

  const returnTo = req.cookies.get('line_return_to')?.value ?? 'checkout'

  // マイページは永続セッションとして hp_member cookie をセット
  if (returnTo === 'mypage') {
    if (!member?.id) {
      // LINEは登録済みだがアプリ会員ではない
      const res = NextResponse.redirect(new URL('/mypage?error=not_member', req.url))
      res.cookies.delete('line_oauth_state')
      res.cookies.delete('line_return_to')
      return res
    }
    const res = NextResponse.redirect(new URL('/mypage', req.url))
    res.cookies.delete('line_oauth_state')
    res.cookies.delete('line_return_to')
    res.cookies.set('hp_member', JSON.stringify({ id: member.id, name: member.name ?? displayName, phone: member.phone ?? '', email: member.email ?? '' }), {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 7,
      sameSite: 'lax',
      path: '/',
    })
    return res
  }

  const dest = returnTo === 'reservation' ? '/reservation' : '/checkout?method=line'

  const res = NextResponse.redirect(new URL(dest, req.url))
  res.cookies.delete('line_oauth_state')
  res.cookies.delete('line_return_to')
  res.cookies.set('line_member', memberData, {
    httpOnly: true,
    maxAge: 300,
    sameSite: 'lax',
    path: '/',
  })
  return res
}
