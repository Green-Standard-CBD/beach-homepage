export default function Footer() {
  return (
    <footer className="bg-shore text-cream py-14 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-8">
          <div>
            <p className="font-serif text-2xl tracking-[0.35em] font-light mb-1">BEACH</p>
            <p className="font-serif italic text-sand-400 text-sm tracking-wider">Hairsalon &amp; cafe</p>
          </div>
          <div className="text-center md:text-right">
            <p className="text-xs text-sand-400 leading-7">
              〒274-0063 千葉県船橋市習志野台8-41-13-101<br />
              定休日：木曜
            </p>
          </div>
        </div>
        <div className="border-t border-white/10 mt-10 pt-8 text-center">
          <p className="text-[11px] text-sand-500">© 2026 BEACH Hairsalon &amp; cafe. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
