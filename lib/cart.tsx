'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type CartItem = {
  id: string
  name: string
  price: number
  image_url: string | null
  variant: string | null
  quantity: number
}

type CartContextType = {
  items: CartItem[]
  hydrated: boolean
  addItem: (item: Omit<CartItem, 'quantity'>) => void
  removeItem: (id: string, variant: string | null) => void
  updateQty: (id: string, variant: string | null, qty: number) => void
  clear: () => void
  total: number
  shipping: number
  grandTotal: number
  count: number
}

const CartContext = createContext<CartContextType | null>(null)

const STORAGE_KEY = 'beach_cart'
const SHIPPING_FEE = 800
const FREE_SHIPPING_THRESHOLD = 10000

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setItems(JSON.parse(stored))
    } catch { /* ignore */ }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items, hydrated])

  const addItem = (item: Omit<CartItem, 'quantity'>) => {
    setItems(prev => {
      const existing = prev.find(i => i.id === item.id && i.variant === item.variant)
      if (existing) {
        return prev.map(i =>
          i.id === item.id && i.variant === item.variant
            ? { ...i, quantity: i.quantity + 1 }
            : i
        )
      }
      return [...prev, { ...item, quantity: 1 }]
    })
  }

  const removeItem = (id: string, variant: string | null) => {
    setItems(prev => prev.filter(i => !(i.id === id && i.variant === variant)))
  }

  const updateQty = (id: string, variant: string | null, qty: number) => {
    if (qty <= 0) { removeItem(id, variant); return }
    setItems(prev => prev.map(i => i.id === id && i.variant === variant ? { ...i, quantity: qty } : i))
  }

  const clear = () => {
    setItems([])
    localStorage.removeItem(STORAGE_KEY)
  }

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const shipping = total === 0 ? 0 : total >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE
  const grandTotal = total + shipping
  const count = items.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <CartContext.Provider value={{ items, hydrated, addItem, removeItem, updateQty, clear, total, shipping, grandTotal, count }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
