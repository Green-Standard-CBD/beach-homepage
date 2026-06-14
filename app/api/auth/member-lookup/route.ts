import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { phone } = await req.json()
  if (!phone) {
    return NextResponse.json({ error: '電話番号が必要です' }, { status: 400 })
  }

  const normalized = phone.replace(/[-\s]/g, '')

  const { data: member } = await supabaseAdmin
    .from('members')
    .select('id, name, email, phone, postal_code, prefecture, city, address_line1, address_line2')
    .eq('phone', normalized)
    .single()

  if (!member) {
    return NextResponse.json({ error: 'この電話番号で登録されたBEACHメンバーが見つかりません。先に会員登録をお願いします。' }, { status: 404 })
  }

  return NextResponse.json({ ok: true, member })
}
