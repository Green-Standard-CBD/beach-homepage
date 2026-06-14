import type { Metadata } from 'next'
import ReservationManager from '@/components/admin/ReservationManager'

export const metadata: Metadata = {
  title: '予約管理 | BEACH Admin',
}

export default function AdminReservationsPage() {
  return <ReservationManager />
}
