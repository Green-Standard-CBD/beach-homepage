'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Logout() {
  const router = useRouter()
  useEffect(() => {
    fetch('/api/auth/member-session', { method: 'DELETE' }).then(() => {
      router.push('/reservation')
    })
  }, [router])
  return null
}
