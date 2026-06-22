import { NextResponse } from 'next/server'

export async function POST() {
  const res = NextResponse.json({ ok: true })
  // admin_authはhttpOnlyのためdocument.cookie側からは削除できない。
  // サーバー側でmaxAge:0を返し確実に失効させる。
  res.cookies.set('admin_auth', '', { httpOnly: true, maxAge: 0, path: '/' })
  return res
}
