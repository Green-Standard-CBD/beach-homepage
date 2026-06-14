import Reveal from './Reveal'

export default function Access() {
  return (
    <section id="access" className="py-32 md:py-48 bg-sand-100">
      <div className="max-w-6xl mx-auto px-6">

        <div className="text-center mb-24">
          <Reveal>
            <p className="text-[10px] tracking-[0.5em] text-sand-400 mb-5">LOCATION</p>
          </Reveal>
          <Reveal delay={120}>
            <h2 className="font-serif text-4xl md:text-5xl font-light text-shore italic">Access</h2>
          </Reveal>
        </div>

        <div className="grid md:grid-cols-2 gap-16 md:gap-24 items-start">
          <Reveal delay={100}>
            <dl className="space-y-10">
              <div>
                <dt className="text-[10px] tracking-[0.4em] text-sand-400 mb-3">ADDRESS</dt>
                <dd className="text-sm text-shore leading-8">
                  〒274-0063<br />
                  千葉県船橋市習志野台8-41-13-101
                </dd>
              </div>
              <div>
                <dt className="text-[10px] tracking-[0.4em] text-sand-400 mb-3">HOURS</dt>
                <dd className="text-sm text-shore leading-8">
                  月・火・水・金・土・日　10:00 〜 19:00<br />
                  <span className="text-sand-400">定休日：木曜</span>
                </dd>
              </div>
              <div>
                <dt className="text-[10px] tracking-[0.4em] text-sand-400 mb-3">RESERVATION</dt>
                <dd className="text-sm text-shore leading-8 mb-4">
                  ウェブ予約またはアプリからお申し込みいただけます
                </dd>
                <a
                  href="/reservation"
                  className="inline-block border border-shore text-shore text-[11px] tracking-[0.2em] px-7 py-2.5 hover:bg-shore hover:text-cream transition-colors duration-300"
                >
                  ご予約はこちら
                </a>
              </div>
            </dl>
          </Reveal>

          <Reveal delay={200} direction="fade" className="aspect-video md:aspect-[4/3] overflow-hidden bg-sand-200">
            <iframe
              src="https://maps.google.com/maps?q=千葉県船橋市習志野台8-41-13-101&output=embed&hl=ja&z=16"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="BEACH Hairsalon & cafe アクセス"
            />
          </Reveal>
        </div>

      </div>
    </section>
  )
}
