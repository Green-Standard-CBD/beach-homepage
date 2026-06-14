import Image from 'next/image'
import Link from 'next/link'
import Reveal from './Reveal'

const brands = [
  {
    tag: 'N.',
    name: 'エヌドット',
    desc: 'スタイリング・シャンプー・トリートメントを展開。洗練されたパッケージと確かな品質で、全国に多くのファンを持つサロン専売ブランド。',
    img: 'https://images.unsplash.com/photo-1760895535234-2c39c57cf187?w=600&q=85&auto=format&fit=crop',
  },
  {
    tag: 'NOTE by N.',
    name: 'ノート バイ エヌドット',
    desc: 'アミノ酸系シャンプー・トリートメント。髪と頭皮にやさしい成分で、毎日のヘアケアをよりリッチに。',
    img: 'https://images.unsplash.com/photo-1760862652442-e8ff7ebdd2f8?w=600&q=85&auto=format&fit=crop',
  },
  {
    tag: 'APUSEL',
    name: 'アプルセル',
    desc: 'スキャルプケアに特化したシャンプー・トリートメント。頭皮環境を整え、健やかな美髪をサポートします。',
    img: 'https://images.unsplash.com/photo-1760895535234-2c39c57cf187?w=600&q=85&auto=format&fit=crop',
  },
]

export default function Products() {
  return (
    <section id="products" className="pt-20 md:pt-28 pb-32 bg-cream">
      <div className="max-w-6xl mx-auto px-6">

        <div className="text-center mb-24">
          <Reveal>
            <p className="text-[10px] tracking-[0.5em] text-sand-400 mb-5">SHOP</p>
          </Reveal>
          <Reveal delay={120}>
            <h2 className="font-serif text-4xl md:text-5xl font-light text-shore italic">Products</h2>
          </Reveal>
          <Reveal delay={200}>
            <p className="text-[11px] text-sand-400 mt-4 tracking-[0.2em]">取り扱いブランド</p>
          </Reveal>
        </div>

        <div className="grid md:grid-cols-3 gap-12 mb-16">
          {brands.map((brand, i) => (
            <Reveal key={brand.tag} delay={i * 100}>
              <div className="group">
                <div className="relative aspect-[5/4] overflow-hidden bg-sand-100 mb-6">
                  <Image
                    src={brand.img}
                    alt={brand.tag}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
                <p className="text-[10px] tracking-[0.35em] text-sand-400 mb-2">{brand.tag}</p>
                <h3 className="font-serif text-lg font-light text-shore mb-4">{brand.name}</h3>
                <p className="text-xs leading-7 text-sand-500">{brand.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal>
          <div className="text-center py-8 bg-sand-100">
            <p className="text-[10px] tracking-[0.4em] text-sand-400 mb-4">ONLINE SHOP</p>
            <h3 className="font-serif text-2xl font-light text-shore italic mb-4">
              オンラインでもご購入いただけます
            </h3>
            <p className="text-sm text-sand-500 mb-8 tracking-wide">
              ヘアケア商品やBEACHオリジナルグッズをウェブからご購入いただけます。
            </p>
            <Link
              href="/shop"
              className="inline-block border border-shore text-shore text-[11px] tracking-[0.25em] px-10 py-3 hover:bg-shore hover:text-cream transition-colors duration-300"
            >
              ショップを見る
            </Link>
          </div>
        </Reveal>

      </div>
    </section>
  )
}
