import Reservation from '@/components/Reservation'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'

export const metadata = {
  title: 'ご予約 | BEACH Hairsalon & cafe',
}

export default function ReservationPage() {
  return (
    <>
      <Nav />
      <main className="pt-24">
        <Reservation />
      </main>
      <Footer />
    </>
  )
}
