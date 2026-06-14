'use client'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, Pagination, EffectFade } from 'swiper/modules'
import Image from 'next/image'
import 'swiper/css'
import 'swiper/css/pagination'
import 'swiper/css/effect-fade'

const slides = [
  {
    src: 'https://images.unsplash.com/photo-1630595271375-5073a6c0638b?w=1200&q=90&auto=format&fit=crop',
    alt: '個室サロン',
  },
  {
    src: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1200&q=90&auto=format&fit=crop',
    alt: '施術スペース',
  },
  {
    src: 'https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?w=1200&q=90&auto=format&fit=crop',
    alt: 'ヘッドスパ',
  },
  {
    src: 'https://images.unsplash.com/photo-1600948836101-f9ffda59d250?w=1200&q=90&auto=format&fit=crop',
    alt: 'プライベートルーム',
  },
]

export default function PrivateRoomSlider() {
  return (
    <Swiper
      modules={[Autoplay, Pagination, EffectFade]}
      effect="fade"
      fadeEffect={{ crossFade: true }}
      speed={3500}
      autoplay={{ delay: 7000, disableOnInteraction: false }}
      pagination={{ clickable: true }}
      loop
      className="private-room-swiper h-full w-full"
    >
      {slides.map((slide) => (
        <SwiperSlide key={slide.src} className="relative">
          <Image
            src={slide.src}
            alt={slide.alt}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </SwiperSlide>
      ))}
    </Swiper>
  )
}
