import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

function isAuthed(req: NextRequest) {
  const token = req.cookies.get('admin_auth')?.value
  return token && token === process.env.ADMIN_TOKEN
}

export async function PATCH(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, time, block_minutes } = body
  if (!id) return NextResponse.json({ error: '必須項目不足' }, { status: 400 })

  const updates: Record<string, unknown> = {}
  if (time !== undefined) updates.time = time
  if (block_minutes !== undefined) updates.block_minutes = block_minutes

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: '更新項目なし' }, { status: 400 })
  }

  const { error } = await adminClient
    .from('blocked_slots')
    .update(updates)
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: '必須項目不足' }, { status: 400 })

  const { error } = await adminClient
    .from('blocked_slots')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
