'use client'
import { useEffect, useRef } from 'react'
import PrivateRoomSlider from './PrivateRoomSlider'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

export default function StorySection() {
  const kvVideoRef     = useRef<HTMLDivElement>(null)
  const kvLogoRef      = useRef<HTMLDivElement>(null)
  const kvLogoInnerRef = useRef<HTMLDivElement>(null)
  const kvCardRef      = useRef<HTMLDivElement>(null)
  const bgCardRef      = useRef<HTMLDivElement>(null)
  const wPicCardRef    = useRef<HTMLDivElement>(null)
  const picCardRef     = useRef<HTMLImageElement>(null)
  const hContentsRef   = useRef<HTMLDivElement>(null)
  const hImgWrapRef    = useRef<HTMLDivElement>(null)
  const hTextRef       = useRef<HTMLDivElement>(null)

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)

    const kv    = kvVideoRef.current
    const logo  = kvLogoRef.current
    const inner = kvLogoInnerRef.current
    const card  = kvCardRef.current
    const bg    = bgCardRef.current
    const wPic  = wPicCardRef.current
    const pic   = picCardRef.current
    const hCon  = hContentsRef.current

    if (!kv || !logo || !inner || !card || !bg || !wPic || !pic || !hCon) return

    const ctx = gsap.context(() => {
      const isPc  = window.innerWidth >= 1024
      const isMobile = window.innerWidth < 768
      const logoH = isPc ? inner.offsetHeight : inner.offsetHeight / 2
      const wh    = window.innerHeight


      // ヒーローテキスト入場アニメーション（CSS ではなく GSAP で管理）
      gsap.set(['.hero-line-1', '.hero-line-2', '.hero-line-3', '.hero-line-4'], { y: 24 })
      gsap.to('.hero-line-1', { opacity: 1, y: 0, duration: 1.2, delay: 0.4, ease: 'power2.inOut' })
      gsap.to('.hero-line-2', { opacity: 1, y: 0, duration: 1.2, delay: 0.7, ease: 'power2.inOut' })
      gsap.to('.hero-line-3', { opacity: 1, y: 0, duration: 1.2, delay: 1.0, ease: 'power2.inOut' })
      gsap.to('.hero-line-4', { opacity: 1, y: 0, duration: 1.0, delay: 1.4, ease: 'power2.inOut' })

      // ロゴ: 1画面分スクロールで blur・fade・上昇
      gsap.timeline({
        scrollTrigger: {
          trigger: document.body,
          start: 'top top',
          end: `top+=${wh} top`,
          scrub: true,
        },
      }).to(inner, { yPercent: -150, autoAlpha: 0, filter: 'blur(16px)' })

      // ロゴ: kvCardが近づくまでpin
      ScrollTrigger.create({
        trigger: document.body,
        start: 'top top',
        endTrigger: card,
        end: `top-=${logoH} top`,
        pin: logo,
        pinSpacing: false,
      })

      // ビデオ: homeContentsの中央までpin
      ScrollTrigger.create({
        trigger: document.body,
        start: 'top top',
        endTrigger: hCon,
        end: 'center center',
        pin: kv,
        pinSpacing: false,
      })

      // カード背景: 横方向 clip-path で広がる inset(0 20%) → inset(0 0%)
      gsap.from(bg, {
        clipPath: 'inset(0 20%)',
        scrollTrigger: {
          trigger: card,
          start: 'top bottom',
          end: 'bottom bottom',
          scrub: 2,
        },
      })

      // 写真wrapper: 横方向 clip-path inset(0 10%) → inset(0 0%)
      gsap.from(wPic, {
        clipPath: 'inset(0 10%)',
        scrollTrigger: {
          trigger: card,
          start: 'top bottom',
          end: 'bottom bottom',
          scrub: 2,
        },
      })

      // 写真: パララックス yPercent -20→20, scale 1.3固定
      gsap.fromTo(
        pic,
        { yPercent: -20, scale: 1.3 },
        {
          yPercent: 20,
          scale: 1.3,
          scrollTrigger: {
            trigger: wPic,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
          },
        }
      )

      // homeContents + Menu: 同じScrollTrigger・同じy:200で連動（ギャップを防ぐ）
      const w = window.innerWidth
      const menuEl = document.getElementById('menu')
      const stConfig = {
        trigger: hCon,
        start: 'top bottom',
        end: 'top top',
        scrub: 2,
      }

      // スマホはclip-path省略（GPU負荷が高くカクカクの原因）
      gsap.from(hCon, {
        ...(isMobile ? {} : { clipPath: `inset(${w / 10}px 60px 0 60px)` }),
        y: 200,
        scrollTrigger: stConfig,
      })

      if (menuEl) {
        gsap.from(menuEl, {
          y: 200,
          scrollTrigger: stConfig,
        })
      }

      // 画像 + テキスト: 下から幕が上がる（clip-path）+ y移動の組み合わせ
      const hText = hTextRef.current
      const hImg  = hImgWrapRef.current
      const stIn = {
        trigger: hCon,
        start: 'top 60%',
        toggleActions: 'play none none reverse',
      }
      if (hImg) {
        gsap.from(hImg, {
          clipPath: 'inset(100% 0 0 0)',
          y: 60,
          duration: 1.8,
          ease: 'power3.out',
          scrollTrigger: stIn,
        })
      }
      if (hText) {
        gsap.from(hText, {
          clipPath: 'inset(100% 0 0 0)',
          y: 60,
          duration: 2.5,
          ease: 'power3.out',
          delay: 0.15,
          scrollTrigger: stIn,
        })
      }

      ScrollTrigger.refresh()
    })

    return () => ctx.revert()
  }, [])

  return (
    <div id="concept" className="relative">

      {/* KV Video: absolute z-[-1], GSAPでpin */}
      <div
        ref={kvVideoRef}
        id="kv-video"
        className="absolute top-0 left-0 w-full h-screen"
        style={{ zIndex: -1 }}
      >
        <video
          autoPlay muted loop playsInline
          className="w-full h-full object-cover"
        >
          <source
            src="https://videos.pexels.com/video-files/6073575/6073575-hd_1280_720_25fps.mp4"
            type="video/mp4"
          />
        </video>
        <div className="absolute inset-0 bg-black/35" />
      </div>

      {/* KV Logo: documentフロー h-screen, GSAPでpin & fadeout */}
      <div
        ref={kvLogoRef}
        id="kv-logo"
        className="relative w-full h-screen flex items-center justify-center pointer-events-none"
        style={{ zIndex: 20 }}
      >
        <div ref={kvLogoInnerRef} className="text-center text-white px-6">
          <p className="hero-line-1 font-serif text-[20px] tracking-[0.5em] opacity-70 mb-2">
            千葉県船橋市習志野台
          </p>
          <h1 className="hero-line-2 font-serif text-[7rem] md:text-[15rem] font-semibold tracking-[0.05em] leading-none mb-0 mt-8">
            BEACH
          </h1>
          <p className="hero-line-3 font-serif text-[1.6rem] md:text-[3.5rem] italic font-thin tracking-[0.45em] opacity-75">
            hairsalon &amp; cafe
          </p>
          <div className="hero-line-4 mt-6 flex justify-center opacity-40 animate-bounce">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <path d="M12 5v14M5 12l7 7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>

      {/* KV Card: documentフロー, mt-[38vw] mobile / mt-[min(6vw,90px)] PC */}
      {/* 背景・写真ともに横方向 clip-path で広がるアニメーション */}
      <div
        ref={kvCardRef}
        id="kv-card"
        className="relative flex flex-col w-[calc(100vw-28px)] mt-[38vw] mx-auto lg:flex-row lg:w-[max(72vw,960px)] lg:mt-[min(6vw,90px)] lg:h-[82vh]"
      >
        {/* ベージュ背景 — 横clip-pathで広がる */}
        <div ref={bgCardRef} className="absolute inset-0 bg-sand-100" style={{ zIndex: 0 }} />

        {/* 写真wrapper — 横clip-path + パララックス */}
        <div
          ref={wPicCardRef}
          className="relative w-full aspect-[4/3] overflow-hidden flex-shrink-0 lg:aspect-auto lg:w-[55%] lg:self-stretch"
          style={{ zIndex: 10 }}
        >
          <img
            ref={picCardRef}
            src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=2400&q=95&auto=format&fit=crop"
            alt="浜辺"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ transformOrigin: 'center' }}
          />
        </div>

        {/* コンセプトテキスト */}
        <div className="relative flex flex-col justify-center px-8 py-10 lg:w-[45%] lg:px-10 lg:pt-8 lg:pb-2" style={{ zIndex: 10 }}>
          <p className="text-[10px] tracking-[0.5em] text-sand-400 mb-12 -mt-6">CONCEPT</p>
          <h2 className="font-serif text-2xl font-light text-shore italic leading-snug mb-9">
            みんなが笑顔になれる場所
          </h2>
          <p className="text-[15px] leading-6 text-sand-500">
            波は、そのたびに砂浜の形を変える。<br />
            <br />
            ある時は、光をちりばめた穏やかな波——<br />
            水面がきらきらと揺れ、心まで静かになる。<br />
            ある時は、サーファーが歓喜する力強い波——<br />
            全身で波を受けて、どこまでも遠くへ飛んでいける。<br />
            <br />
            たくさん頑張りたい日も、<br />
            ただゆっくり波に揺られたい日も、<br />
            どちらだっていい。<br />
            <br />
            BEACHは、集まるすべての波を<br />
            穏やかに迎え入れる。<br />
            来るたびに形を変える砂浜のように、<br />
            みんなで笑顔をつくりながら、<br />
            ひとりひとりの夢がかなう浜辺でありたい。
          </p>
        </div>
      </div>

      {/* homeContents: 個室セクション, 横clip + y:100 で登場 */}
      <div
        ref={hContentsRef}
        id="homeContents"
        className="relative bg-sand-100 mt-[max(10vw,80px)] lg:mt-[max(7.5vw,120px)]"
      >
        <div className="flex flex-col md:flex-row min-h-[90vh]">
          {/* 左：画像 */}
          <div ref={hImgWrapRef} className="relative md:w-1/2 aspect-[4/3] md:aspect-auto flex-shrink-0 md:min-h-[85vh] overflow-hidden">
            <PrivateRoomSlider />
          </div>

          {/* 右：テキスト */}
          <div ref={hTextRef} className="flex flex-col justify-center px-10 py-14 md:px-16 md:w-1/2">
            <p className="text-[10px] tracking-[0.4em] text-sand-400 mb-4">PRIVATE ROOM</p>
            <h3 className="font-serif text-4xl font-light text-shore mb-6">個室で、<br />贅沢なひと時を。</h3>
            <p className="text-sm leading-9 text-sand-500 mb-5">
              BEACHは完全個室のプライベートサロン。<br />
              他のお客様を気にせず、あなただけの時間と空間で、<br />
              心ゆくまでくつろいでいただけます。
            </p>
            <p className="text-sm leading-9 text-sand-500">
              騒がしい日常から少し離れて、<br />
              静かで豊かな時間をご用意しています。<br />
              <span className="text-[11px] text-sand-300">※ 画像は準備中のためイメージです</span>
            </p>
          </div>
        </div>
      </div>

    </div>
  )
}
