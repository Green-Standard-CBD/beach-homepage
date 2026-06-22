import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (pathname === '/admin/login') return NextResponse.next()
  if (pathname === '/api/admin/login' || pathname === '/api/admin/logout') return NextResponse.next()

  const token = req.cookies.get('admin_auth')?.value
  const expected = process.env.ADMIN_TOKEN
  const isAuthed = !!token && !!expected && token === expected

  if (!isAuthed) {
    // /api/admin/* は各routeのisAuthedチェックの多層防御として、ここではJSON 401を返す
    // （HTMLログイン画面へのredirectはAPI呼び出し側にとって扱いにくいため分岐する）
    if (pathname.startsWith('/api/admin/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const url = req.nextUrl.clone()
    url.pathname = '/admin/login'
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = { matcher: ['/admin/:path*', '/api/admin/:path*'] }
