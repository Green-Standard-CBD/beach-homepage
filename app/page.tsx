import Nav from '@/components/Nav'
import StorySection from '@/components/StorySection'
import Menu from '@/components/Menu'
import Owner from '@/components/Owner'
import Products from '@/components/Products'
import AppCTA from '@/components/AppCTA'
import Access from '@/components/Access'
import Footer from '@/components/Footer'
import ScrollHandler from '@/components/ScrollHandler'

export default function Home() {
  return (
    <>
      <Nav />
      <ScrollHandler />
      <main>
        <StorySection />
        <Menu />
        <Products />
        <AppCTA />
        <Owner />
        <Access />
      </main>
      <Footer />
    </>
  )
}
