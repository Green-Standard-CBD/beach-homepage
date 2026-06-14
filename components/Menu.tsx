import Reveal from './Reveal'

const categories = [
  {
    title: 'TREATMENT COURSE',
    items: [
      { name: 'カット＋トリートメント', price: '¥5,500' },
      { name: 'カラー＋トリートメント', price: '¥7,500' },
      { name: 'ヘナorマニキュア＋トリートメント', price: '¥8,500' },
      { name: 'カット＋ヘアマニキュアorヘナカラー', price: '¥8,500' },
      { name: 'カット＋カラー＋トリートメント', price: '¥11,500' },
      { name: 'カット＋パーマ＋トリートメント', price: '¥12,500' },
      { name: 'カット＋デジタルパーマ＋トリートメント', price: '¥14,800' },
      { name: 'カット＋縮毛矯正＋トリートメント', price: '¥17,800' },
      { name: '＋プレミアムアップグレード', price: '¥2,500' },
    ],
  },
  {
    title: 'HEAD SPA COURSE',
    items: [
      { name: 'カット＋ヘッドスパ (20分)', price: '¥8,500' },
      { name: 'カラー＋ヘッドスパ', price: '¥8,500' },
      { name: 'ヘナorマニキュア＋ヘッドスパ', price: '¥9,500' },
      { name: 'カット＋カラー＋ヘッドスパ (20分)', price: '¥12,500' },
      { name: 'カット＋パーマ＋ヘッドスパ (20分)', price: '¥13,500' },
      { name: 'カット＋デジタルパーマ＋ヘッドスパ (20分)', price: '¥15,800' },
      { name: 'カット＋縮毛矯正＋ヘッドスパ (20分)', price: '¥18,800' },
      { name: '＋ヘッドスパアップグレード (30分)', price: '¥1,000' },
      { name: '＋プレミアムアップグレード (60分)', price: '¥5,000' },
    ],
  },
  {
    title: 'CUT',
    items: [
      { name: 'カット', price: '¥4,500' },
      { name: 'スクールカット', price: '¥4,000' },
      { name: 'フェイスラインカット', price: '¥1,500(会員) / ¥2,500' },
      { name: '前髪カット', price: '¥700' },
    ],
  },
  {
    title: 'COLOR',
    items: [
      { name: 'フルカラー', price: '¥6,300' },
      { name: 'テクニカルカラー', price: '¥3,800〜6,800' },
      { name: 'ヘナ（植物性カラー）', price: '¥7,300〜' },
      { name: 'ヘアマニキュア', price: '¥7,300〜' },
      { name: 'ブリーチ', price: '¥9,000' },
      { name: 'ダブルブリーチ', price: '¥18,000' },
    ],
  },
  {
    title: 'PERM',
    items: [
      { name: 'スタンダードパーマ', price: '¥7,300〜' },
      { name: 'デジタルパーマ', price: '¥9,500〜' },
      { name: '特殊パーマ', price: '¥24,000〜' },
    ],
  },
  {
    title: 'STRAIGHT',
    items: [
      { name: '縮毛矯正', price: '¥12,500〜' },
      { name: '髪質改善トリートメント', price: '¥15,800' },
    ],
  },
  {
    title: 'TREATMENT',
    items: [
      { name: 'トリートメント (ライト)', price: '¥4,500' },
      { name: 'プレミアムトリートメント', price: '¥7,000' },
    ],
  },
  {
    title: 'HEAD SPA',
    items: [
      { name: 'ヘッドスパ (20分)', price: '¥5,000' },
      { name: 'ヘッドスパ (30分)', price: '¥6,000' },
      { name: 'ヘッドスパ (60分)', price: '¥9,000' },
    ],
  },
]

export default function Menu() {
  return (
    <section id="menu" className="py-32 md:py-48 bg-sand-100">
      <div className="max-w-5xl mx-auto px-6">

        <div className="text-center mb-24">
          <Reveal>
            <p className="text-[10px] tracking-[0.5em] text-sand-400 mb-5">SERVICE</p>
          </Reveal>
          <Reveal delay={120}>
            <h2 className="font-serif text-4xl md:text-5xl font-light text-shore italic">Menu</h2>
          </Reveal>
        </div>

        <div className="grid md:grid-cols-2 gap-16">
          {categories.map((cat, i) => (
            <Reveal key={cat.title} delay={i * 80}>
              <h3 className="text-[10px] tracking-[0.35em] text-sand-400 mb-6 pb-4 border-b border-sand-200">
                {cat.title}
              </h3>
              <ul className="space-y-6">
                {cat.items.map((item) => (
                  <li key={item.name} className="flex justify-between items-baseline gap-4">
                    <span className="text-sm text-shore whitespace-nowrap">{item.name}</span>
                    <span className="font-serif text-base text-sand-500 whitespace-nowrap flex-shrink-0">{item.price}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>

        <Reveal delay={200}>
          <p className="text-center text-[11px] text-sand-400 mt-16 tracking-wider leading-7">
            ※ 表示価格はすべて税込みです。<br />
            ※ 長さ・量・状態により変動する場合があります。
          </p>
        </Reveal>

      </div>
    </section>
  )
}
