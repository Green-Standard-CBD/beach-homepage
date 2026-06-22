'use client'

import { useEffect, useState, useCallback } from 'react'
import AdminTopNav from './AdminTopNav'

type OrderItem = { name: string; variant?: string | null; size?: string | null; quantity: number; price: number }
type Member = { name: string; email: string; phone: string } | null
type Order = {
  id: string
  created_at: string
  status: string
  items: OrderItem[]
  subtotal: number
  shipping: number
  total: number
  guest_name: string | null
  guest_email: string | null
  guest_phone: string | null
  postal_code: string | null
  prefecture: string | null
  city: string | null
  address_line1: string | null
  address_line2: string | null
  member_id: string | null
  members: Member
}

type Tab = 'paid' | 'shipped'

const TABS: { key: Tab; label: string }[] = [
  { key: 'paid',    label: '未出荷' },
  { key: 'shipped', label: '出荷済み' },
]

export default function OrdersManager() {
  const [tab, setTab] = useState<Tab>('paid')
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/orders?status=${tab}`)
    const data = await res.json()
    setOrders(data.orders ?? [])
    setLoading(false)
  }, [tab])

  useEffect(() => { load() }, [load])

  const markShipped = async (id: string) => {
    setUpdating(id)
    await fetch('/api/admin/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'shipped' }),
    })
    setUpdating(null)
    load()
  }

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const printSlip = (o: Order) => {
    const name = o.guest_name ?? o.members?.name ?? '—'
    const addr = [o.postal_code ? `〒${o.postal_code}` : '', o.prefecture, o.city, o.address_line1, o.address_line2].filter(Boolean).join(' ')
    const phone = o.guest_phone ?? o.members?.phone ?? '—'
    const itemRows = o.items.map(i =>
      `<tr><td style="padding:6px 0;border-bottom:1px solid #eee;">${i.name}${i.variant ? `（${i.variant}）` : i.size ? `（${i.size}）` : ''}</td><td style="padding:6px 0;border-bottom:1px solid #eee;text-align:center;">${i.quantity}</td><td style="padding:6px 0;border-bottom:1px solid #eee;text-align:right;">¥${(i.price * i.quantity).toLocaleString()}</td></tr>`
    ).join('')
    const w = window.open('', '_blank', 'width=600,height=800')
    if (!w) return
    w.document.write(`<html><head><title>納品書 #${shortId(o.id)}</title><style>body{font-family:'Hiragino Sans',sans-serif;padding:40px;color:#333;font-size:13px;}h1{font-size:18px;font-weight:normal;letter-spacing:4px;margin-bottom:4px;}table{width:100%;border-collapse:collapse;margin-top:16px;}th{text-align:left;font-size:11px;color:#888;padding-bottom:8px;border-bottom:2px solid #333;}td{font-size:13px;}@media print{button{display:none;}}</style></head><body>
      <h1>BEACH Hair Rescue</h1><p style="font-size:11px;color:#888;margin:0 0 32px;">納品書</p>
      <div style="display:flex;justify-content:space-between;margin-bottom:24px;">
        <div><p style="font-size:11px;color:#888;margin:0 0 4px;">お届け先</p><p style="margin:0;font-size:15px;font-weight:bold;">${name} 様</p><p style="margin:4px 0 0;color:#555;">${addr}</p><p style="margin:4px 0 0;color:#555;">${phone}</p></div>
        <div style="text-align:right;"><p style="font-size:11px;color:#888;margin:0 0 4px;">注文番号</p><p style="font-size:15px;font-weight:bold;margin:0;">#${shortId(o.id)}</p><p style="font-size:11px;color:#888;margin:4px 0 0;">${new Date(o.created_at).toLocaleDateString('ja-JP')}</p></div>
      </div>
      <table><thead><tr><th>商品</th><th style="text-align:center;">数量</th><th style="text-align:right;">金額</th></tr></thead><tbody>${itemRows}</tbody></table>
      <div style="text-align:right;margin-top:16px;"><p>小計 ¥${o.subtotal.toLocaleString()}</p><p>送料 ${o.shipping === 0 ? '無料' : `¥${o.shipping.toLocaleString()}`}</p><p style="font-size:16px;font-weight:bold;">合計 ¥${o.total.toLocaleString()}</p></div>
      <div style="margin-top:40px;text-align:center;"><button onclick="window.print()" style="padding:10px 32px;background:#333;color:#fff;border:none;cursor:pointer;font-size:13px;">印刷する</button></div>
    </body></html>`)
    w.document.close()
  }

  const getName  = (o: Order) => o.guest_name  ?? o.members?.name  ?? '—'
  const getEmail = (o: Order) => o.guest_email ?? o.members?.email ?? '—'
  const getPhone = (o: Order) => o.guest_phone ?? o.members?.phone ?? '—'
  const getSource = (o: Order) => o.guest_name ? 'HP' : 'アプリ'
  const shortId  = (id: string) => id.slice(0, 8).toUpperCase()

  const formatDate = (s: string) => {
    const d = new Date(s)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
    const timeStr = `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
    if (diffDays === 0) return `今日 ${timeStr}`
    if (diffDays === 1) return `昨日 ${timeStr}`
    return `${d.getMonth()+1}/${d.getDate()} ${timeStr}`
  }

  const getAddress = (o: Order) =>
    [o.postal_code ? `〒${o.postal_code}` : '', o.prefecture, o.city, o.address_line1, o.address_line2]
      .filter(Boolean).join(' ')

  return (
    <div className="flex flex-col h-screen bg-[#f5f0ea]">
      <AdminTopNav />

      <div className="flex-1 overflow-auto">
        {/* タブバー */}
        <div className="bg-white border-b border-sand-200 px-6">
          <div className="flex gap-0 max-w-6xl mx-auto">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-6 py-3.5 text-[11px] tracking-[0.2em] border-b-2 transition-colors ${
                  tab === t.key
                    ? 'border-[#2A2520] text-[#2A2520] font-medium'
                    : 'border-transparent text-[#2A2520]/50 hover:text-[#2A2520]/80'
                }`}
              >
                {t.label}
                {tab === t.key && !loading && (
                  <span className="ml-1.5 text-[10px] text-[#2A2520]/40">（{orders.length}件）</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-6">

          {loading ? (
            <div className="text-center py-20 text-[11px] tracking-[0.3em] text-[#2A2520]/40">読み込み中...</div>
          ) : orders.length === 0 ? (
            <div className="text-center py-20 text-[11px] tracking-[0.3em] text-[#2A2520]/40">
              {tab === 'paid' ? '未出荷の注文はありません' : '出荷済みの注文はありません'}
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map(order => {
                const isOpen = expanded.has(order.id)
                const mainItem = order.items[0]
                const extraCount = order.items.length - 1

                return (
                  <div key={order.id} className="bg-white border border-sand-200 shadow-sm">

                    {/* 注文ヘッダー */}
                    <div className={`flex items-center gap-3 px-4 py-2 border-b text-[10px] tracking-[0.15em] ${
                      getSource(order) === 'アプリ'
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-800/60'
                        : 'bg-[#f9f6f2] border-sand-100 text-[#2A2520]/50'
                    }`}>
                      <span>注文日：{formatDate(order.created_at)}</span>
                      <span>|</span>
                      <span>合計：¥{order.total.toLocaleString()}</span>
                      <span>|</span>
                      <span>注文番号：{shortId(order.id)}</span>
                      <span className={`ml-1 px-1.5 py-0.5 rounded text-[9px] ${
                        getSource(order) === 'HP'
                          ? 'bg-blue-50 text-blue-500'
                          : 'bg-green-50 text-green-600'
                      }`}>
                        {getSource(order)}
                      </span>
                    </div>

                    {/* 注文本体 */}
                    <div className="flex gap-4 p-4">

                      {/* 商品情報 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex gap-3 items-start">
                          {/* 商品テキスト */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#2A2520] leading-snug">
                              {mainItem?.name}
                              {(mainItem?.variant || mainItem?.size) && (
                                <span className="text-[#2A2520]/50 font-normal">（{mainItem.variant ?? mainItem.size}）</span>
                              )}
                            </p>
                            {extraCount > 0 && (
                              <p className="text-xs text-[#2A2520]/50 mt-0.5">他 {extraCount} 点</p>
                            )}
                            <p className="text-xs text-[#2A2520]/50 mt-1">数量：{mainItem?.quantity}</p>
                            <p className="text-sm font-medium text-[#2A2520] mt-1">
                              ¥{((mainItem?.price ?? 0) * (mainItem?.quantity ?? 1)).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        {/* より多くの情報 */}
                        <button
                          onClick={() => toggleExpand(order.id)}
                          className="mt-3 text-[11px] text-blue-600 hover:text-blue-800 tracking-wide"
                        >
                          {isOpen ? '▲ 情報を隠す' : '▼ より多くの情報を表示'}
                        </button>

                        {/* 展開：詳細情報 */}
                        {isOpen && (
                          <div className="mt-3 pt-3 border-t border-sand-100 space-y-4 text-xs text-[#2A2520]/80">

                            {/* 全商品リスト */}
                            {order.items.length > 1 && (
                              <div>
                                <p className="text-[10px] tracking-[0.25em] text-[#2A2520]/40 mb-1.5">全商品</p>
                                <div className="space-y-1">
                                  {order.items.map((item, i) => (
                                    <div key={i} className="flex justify-between">
                                      <span>
                                        {item.name}
                                        {(item.variant || item.size) && <span className="text-[#2A2520]/50">（{item.variant ?? item.size}）</span>}
                                        {' '}× {item.quantity}
                                      </span>
                                      <span className="ml-4 flex-shrink-0">¥{(item.price * item.quantity).toLocaleString()}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* 金額内訳 */}
                            <div>
                              <p className="text-[10px] tracking-[0.25em] text-[#2A2520]/40 mb-1.5">金額内訳</p>
                              <div className="space-y-0.5">
                                <div className="flex justify-between"><span>小計</span><span>¥{order.subtotal.toLocaleString()}</span></div>
                                <div className="flex justify-between"><span>送料</span><span>{order.shipping === 0 ? '無料' : `¥${order.shipping.toLocaleString()}`}</span></div>
                                <div className="flex justify-between font-medium text-[#2A2520]"><span>合計</span><span>¥{order.total.toLocaleString()}</span></div>
                              </div>
                            </div>

                            {/* 注文ID */}
                            <div>
                              <p className="text-[10px] tracking-[0.25em] text-[#2A2520]/40 mb-1">注文ID</p>
                              <p className="font-mono text-[11px] text-[#2A2520]/60 break-all">{order.id}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 発送先 */}
                      <div className="w-52 flex-shrink-0 text-xs text-[#2A2520]/70 leading-[1.8]">
                        <p className="text-[10px] tracking-[0.25em] text-[#2A2520]/40 mb-1">お届け先</p>
                        <p className="font-medium text-[#2A2520] text-sm">{getName(order)}</p>
                        <p className="text-[#2A2520]/60 mt-0.5">{getAddress(order) || '—'}</p>
                        <p className="mt-1 text-[#2A2520]/50">{getPhone(order)}</p>
                        <p className="text-[#2A2520]/50 break-all">{getEmail(order)}</p>
                      </div>

                      {/* アクション */}
                      <div className="w-36 flex-shrink-0 flex flex-col gap-2 text-[11px]">
                        {tab === 'paid' && (
                          <button
                            onClick={() => markShipped(order.id)}
                            disabled={updating === order.id}
                            className="w-full bg-[#2A2520] text-cream tracking-[0.15em] py-2.5 px-3 hover:opacity-80 transition-opacity disabled:opacity-40 text-center"
                          >
                            {updating === order.id ? '処理中...' : '発送済みにする'}
                          </button>
                        )}
                        {tab === 'shipped' && (
                          <span className="text-[11px] tracking-[0.15em] text-green-600 text-center py-2">✓ 出荷済み</span>
                        )}
                        <button
                          onClick={() => {
                            const addr = getAddress(order)
                            const text = `${getName(order)}\n${addr}\n${getPhone(order)}`
                            navigator.clipboard.writeText(text)
                          }}
                          className="w-full border border-sand-300 text-[#2A2520]/70 tracking-[0.1em] py-2 px-3 hover:border-[#2A2520] hover:text-[#2A2520] transition-colors text-center"
                        >
                          住所をコピー
                        </button>
                        <button
                          onClick={() => printSlip(order)}
                          className="w-full border border-sand-300 text-[#2A2520]/70 tracking-[0.1em] py-2 px-3 hover:border-[#2A2520] hover:text-[#2A2520] transition-colors text-center"
                        >
                          納品書を印刷
                        </button>
                      </div>
                    </div>

                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
