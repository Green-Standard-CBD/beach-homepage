import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getClientIp } from '@/lib/redis'

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const okRate = await checkRateLimit(`admin-login:${ip}`, 10, 15 * 60)
  if (!okRate) {
    return NextResponse.json({ error: 'ログイン試行回数が多すぎます。しばらく時間をおいてお試しください' }, { status: 429 })
  }

  const { password } = await req.json()

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    await new Promise((r) => setTimeout(r, 600))
    return NextResponse.json({ error: 'パスワードが正しくありません' }, { status: 401 })
  }

  const token = process.env.ADMIN_TOKEN ?? ''
  const res = NextResponse.json({ ok: true })
  res.cookies.set('admin_auth', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })
  return res
}
