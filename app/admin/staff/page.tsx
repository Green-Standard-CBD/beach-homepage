'use client'

import { useState, useEffect } from 'react'
import AdminTopNav from '@/components/admin/AdminTopNav'

type Stylist = {
  id: string
  name: string
  is_free: boolean
  active: boolean
  display_order: number
}

export default function StaffPage() {
  const [stylists, setStylists] = useState<Stylist[]>([])
  const [loading, setLoading]   = useState(true)
  const [newName, setNewName]   = useState('')
  const [adding, setAdding]     = useState(false)
  const [editId, setEditId]     = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  async function fetchStylists() {
    const res = await fetch('/api/admin/staff')
    const json = await res.json()
    setStylists(json.stylists ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchStylists() }, [])

  async function addStylist() {
    if (!newName.trim()) return
    setAdding(true)
    await fetch('/api/admin/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), display_order: stylists.filter(s => !s.is_free).length }),
    })
    setNewName('')
    await fetchStylists()
    setAdding(false)
  }

  async function toggleActive(s: Stylist) {
    if (s.is_free) return
    await fetch('/api/admin/staff', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: s.id, active: !s.active }),
    })
    setStylists(prev => prev.map(st => st.id === s.id ? { ...st, active: !st.active } : st))
  }

  async function saveEdit(s: Stylist) {
    if (!editName.trim()) return
    await fetch('/api/admin/staff', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: s.id, name: editName.trim() }),
    })
    setStylists(prev => prev.map(st => st.id === s.id ? { ...st, name: editName.trim() } : st))
    setEditId(null)
  }

  async function deleteStylist(id: string) {
    await fetch('/api/admin/staff', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setStylists(prev => prev.filter(s => s.id !== id))
  }

  return (
    <div className="min-h-screen bg-sand-100">
      <AdminTopNav />
      <div className="bg-[#3a3430] text-cream px-6 py-2.5">
        <span className="text-[11px] tracking-[0.3em] text-cream/70">スタッフ設定</span>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="bg-white rounded border border-sand-200 overflow-hidden">

          {/* スタッフ一覧 */}
          <div className="divide-y divide-sand-100">
            {loading ? (
              <p className="text-sm text-sand-400 text-center py-8">読み込み中...</p>
            ) : stylists.map((s) => (
              <div key={s.id} className="flex items-center gap-4 px-5 py-4">
                <div className="flex-1">
                  {editId === s.id ? (
                    <input
                      autoFocus
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveEdit(s); if (e.key === 'Escape') setEditId(null) }}
                      className="border border-sand-300 focus:border-shore outline-none px-3 py-1.5 text-sm text-shore w-full rounded"
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-shore font-medium">{s.name}</span>
                      {s.is_free && (
                        <span className="text-[10px] bg-sand-100 text-sand-400 px-2 py-0.5 rounded">固定</span>
                      )}
                      {!s.active && (
                        <span className="text-[10px] bg-sand-100 text-sand-300 px-2 py-0.5 rounded">非表示</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {editId === s.id ? (
                    <>
                      <button onClick={() => saveEdit(s)}
                        className="text-[11px] px-3 py-1.5 bg-shore text-cream rounded hover:bg-shore/80 transition-colors">保存</button>
                      <button onClick={() => setEditId(null)}
                        className="text-[11px] px-3 py-1.5 border border-sand-200 text-sand-500 rounded hover:bg-sand-50 transition-colors">キャンセル</button>
                    </>
                  ) : (
                    <>
                      {!s.is_free && (
                        <>
                          <button onClick={() => { setEditId(s.id); setEditName(s.name) }}
                            className="text-[11px] px-3 py-1.5 border border-sand-200 text-sand-500 rounded hover:border-shore hover:text-shore transition-colors">編集</button>
                          <button onClick={() => toggleActive(s)}
                            className="text-[11px] px-3 py-1.5 border border-sand-200 text-sand-500 rounded hover:bg-sand-50 transition-colors">
                            {s.active ? '非表示' : '表示'}
                          </button>
                          <button onClick={() => deleteStylist(s.id)}
                            className="text-[11px] px-3 py-1.5 text-red-400 hover:text-red-600 transition-colors">削除</button>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* 新規追加 */}
          <div className="border-t border-sand-200 p-5 bg-sand-50">
            <p className="text-[11px] tracking-[0.2em] text-sand-400 mb-3">スタッフを追加</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addStylist() }}
                placeholder="スタッフ名"
                className="flex-1 border border-sand-200 focus:border-shore outline-none px-3 py-2 text-sm text-shore bg-white rounded"
              />
              <button onClick={addStylist} disabled={adding || !newName.trim()}
                className="px-5 py-2 bg-shore text-cream text-[11px] tracking-[0.15em] rounded hover:bg-shore/80 disabled:opacity-40 transition-all">
                {adding ? '追加中...' : '追加'}
              </button>
            </div>
          </div>
        </div>

        {/* Supabase設定メモ */}
        <div className="mt-6 bg-sand-50 border border-sand-200 rounded p-4 text-xs text-sand-400 space-y-1">
          <p className="font-medium text-sand-500">Supabase テーブル設定が必要です</p>
          <p>スタッフ追加機能を使うには、Supabaseで <code className="bg-sand-100 px-1 rounded">stylists</code> テーブルを作成してください。</p>
          <pre className="bg-sand-100 rounded p-2 mt-2 text-[11px] overflow-x-auto whitespace-pre">{`CREATE TABLE stylists (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  display_order int DEFAULT 0,
  is_free boolean DEFAULT false,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
INSERT INTO stylists (name, display_order, is_free) VALUES
  ('藤野 翔', 0, false),
  ('フリー', 99, true);`}</pre>
        </div>
      </div>
    </div>
  )
}
