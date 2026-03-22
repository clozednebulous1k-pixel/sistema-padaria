'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [isVisible, setIsVisible] = useState(true)
  const [key, setKey] = useState(0)
  const isFirstPathEffect = useRef(true)

  useEffect(() => {
    // Evita piscar e “área morta” na primeira carga; só anima em mudanças de rota.
    if (isFirstPathEffect.current) {
      isFirstPathEffect.current = false
      return
    }

    setIsVisible(false)
    const timer = setTimeout(() => {
      setIsVisible(true)
      setKey((prev) => prev + 1)
    }, 50)

    return () => clearTimeout(timer)
  }, [pathname])

  return (
    <div
      key={key}
      className={isVisible ? 'page-transition' : 'opacity-0 pointer-events-none'}
    >
      {/* Com pointer-events-none no pai, filhos com auto continuam recebendo cliques (CSS) */}
      <div className="pointer-events-auto">{children}</div>
    </div>
  )
}
