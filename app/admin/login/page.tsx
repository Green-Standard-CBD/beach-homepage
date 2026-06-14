'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    setLoading(false)
    if (res.ok) {
      router.push('/admin/reservations')
    } else {
      const json = await res.json()
      setError(json.error)
      setPassword('')
    }
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="w-full max-w-sm px-8">
        <div className="text-center mb-12">
          <p className="font-serif text-3xl tracking-[0.3em] font-semibold text-shore mb-2">BEACH</p>
          <p className="text-[10px] tracking-[0.4em] text-sand-400">ADMIN</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[10px] tracking-[0.3em] text-sand-400 mb-2">パスワード</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              className="w-full border border-sand-200 focus:border-shore outline-none px-4 py-3 text-sm text-shore bg-cream transition-colors"
            />
          </div>
          {error && <p className="text-xs text-red-500 text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-3.5 bg-shore text-cream text-[11px] tracking-[0.4em] hover:bg-shore/80 disabled:opacity-40 transition-all"
          >
            {loading ? '確認中...' : 'ログイン'}
          </button>
        </form>
      </div>
    </div>
  )
}
