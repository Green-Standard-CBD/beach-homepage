import Image from 'next/image'

export default function Owner() {
  return (
    <section id="owner" className="bg-white py-24 lg:py-32">
      <div className="max-w-5xl mx-auto px-6">
        <p className="text-[10px] tracking-[0.5em] text-sand-400 mb-16 text-center">OWNER</p>

        <div className="flex flex-col md:flex-row gap-12 lg:gap-20 items-center">
          {/* 写真 */}
          <div className="relative w-64 h-80 md:w-72 md:h-96 flex-shrink-0 overflow-hidden mb-20">
            <Image
              src="/images/owner.png"
              alt="藤野翔"
              fill
              className="object-cover grayscale"
              sizes="288px"
            />
          </div>

          {/* テキスト */}
          <div className="flex-1">
            <h3 className="font-serif text-4xl font-light text-shore mb-1">藤野 翔</h3>
            <p className="text-[11px] tracking-[0.3em] text-sand-400 mb-10">FUJINO SHO — OWNER STYLIST</p>

            <p className="text-sm leading-9 text-sand-500 mb-6">
              美容師として20年以上のキャリアを積み、<br />
              千葉県船橋市にBEACH Hair Rescueをオープン。
            </p>
            <p className="text-sm leading-9 text-sand-500 mb-6">
              「お客様一人ひとりが持つ個性を大切に、<br />
              その人らしい美しさを一緒に引き出したい」<br />
              という想いを胸に、毎日のスタイリングに向き合っています。
            </p>
            <p className="text-sm leading-9 text-sand-500">
              頭皮環境の改善から最旬スタイルまで、<br />
              なんでもお気軽にご相談ください。
            </p>

            <div className="mt-12 pt-8 border-t border-sand-200">
              <p className="text-[10px] tracking-[0.3em] text-sand-400 mb-4">QUALIFICATION</p>
              <p className="text-xs text-sand-500 leading-7">
                美容師免許 / 薄毛・スカルプケアスペシャリスト / 髪質改善アドバイザー
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
