import Reveal from './Reveal'

export default function AppCTA() {
  return (
    <section id="app" className="py-8 md:py-10 bg-shore text-cream">
      <div className="max-w-xl mx-auto px-6 text-center">
        <Reveal>
          <p className="text-[10px] tracking-[0.5em] text-sand-400 mb-6">APP</p>
        </Reveal>
        <Reveal delay={120}>
          <h2 className="font-serif text-4xl md:text-5xl font-light italic mb-6">
            BEACH App
          </h2>
        </Reveal>
        <Reveal delay={220}>
          <p className="text-[13px] leading-8 text-sand-300 mb-10">
            ご予約・ポイント管理はアプリで完結します。<br />
            会員限定のポイント特典もご用意しています。
          </p>
        </Reveal>
        <Reveal delay={320}>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="#"
              className="inline-flex items-center justify-center gap-2.5 bg-cream text-shore px-7 py-3 text-[11px] tracking-[0.2em] hover:bg-sand-100 transition-colors duration-300"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              App Store
            </a>
            <a
              href="#"
              className="inline-flex items-center justify-center gap-2.5 bg-cream text-shore px-7 py-3 text-[11px] tracking-[0.2em] hover:bg-sand-100 transition-colors duration-300"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                <path d="M3.18 23.76c.28.15.6.19.93.08l12.89-7.45-2.83-2.83-11 10.2zm16.7-13.4L16.59 8l-2.18 2.18 2.83 2.83 2.44-1.41c.6-.35.95-.96.95-1.6s-.35-1.3-.95-1.64zM2.44.24C2.17.52 2 .94 2 1.48v21.04c0 .54.17.96.44 1.24l.07.07 11.78-11.78v-.28L2.51.17l-.07.07zm8.68 11.12L2.44 19.92v-7.56z" />
              </svg>
              Google Play
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
