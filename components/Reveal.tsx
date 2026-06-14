'use client'
import { motion } from 'framer-motion'

type Props = {
  children: React.ReactNode
  delay?: number
  direction?: 'up' | 'fade'
  className?: string
}

export default function Reveal({ children, delay = 0, direction = 'up', className = '' }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: direction === 'up' ? 40 : 0 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.9, delay: delay / 1000, ease: [0.4, 0, 0.2, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
