import Reservation from '@/components/Reservation'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'

export const metadata = {
  title: 'ご予約',
  description: '船橋市習志野台のBEACH Hairsalon & cafeへのご予約はこちら。カット・カラー・パーマ・ヘッドスパなど各種メニューをオンラインでご予約いただけます。',
  openGraph: {
    title: 'ご予約 | BEACH Hairsalon & cafe',
    description: '船橋市習志野台のBEACH Hairsalon & cafeへのご予約はこちら。各種メニューをオンラインでご予約いただけます。',
  },
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
