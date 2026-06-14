import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const from = req.nextUrl.searchParams.get('from') ?? 'checkout'
  const state = crypto.randomUUID()
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3001'
  const redirectUri = `${baseUrl}/api/auth/line/callback`

  const url = new URL('https://access.line.me/oauth2/v2.1/authorize')
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', process.env.NEXT_PUBLIC_LINE_LOGIN_CHANNEL_ID!)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('state', state)
  url.searchParams.set('scope', 'profile')

  const res = NextResponse.redirect(url.toString())
  res.cookies.set('line_oauth_state', state, { httpOnly: true, maxAge: 300, sameSite: 'lax', path: '/' })
  res.cookies.set('line_return_to', from,  { httpOnly: true, maxAge: 300, sameSite: 'lax', path: '/' })
  return res
}
