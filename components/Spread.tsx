'use client'
import { motion } from 'framer-motion'
import Image from 'next/image'

export default function Spread() {
  return (
    <div className="overflow-hidden bg-shore">
      <motion.div
        initial={{ clipPath: 'inset(0 32% 0 32%)' }}
        whileInView={{ clipPath: 'inset(0 0% 0 0%)' }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 1.6, ease: [0.76, 0, 0.24, 1] }}
        className="relative w-full aspect-[21/9]"
      >
        <Image
          src="https://images.unsplash.com/photo-1504801861699-85070797b8f8?w=1920&q=90&auto=format&fit=crop"
          alt=""
          fill
          className="object-cover opacity-70"
          sizes="100vw"
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.8 }}
            className="text-[10px] tracking-[0.6em] mb-4 opacity-60"
          >
            BEACH Hairsalon &amp; cafe
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 1.0 }}
            className="font-serif text-2xl md:text-4xl font-light italic tracking-wider"
          >
            日差しのなかで、心ゆくまで。
          </motion.p>
        </div>
      </motion.div>
    </div>
  )
}
