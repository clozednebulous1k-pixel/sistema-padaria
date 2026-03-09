'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [isVisible, setIsVisible] = useState(true)
  const [key, setKey] = useState(0)

  useEffect(() => {
    setIsVisible(false)
    const timer = setTimeout(() => {
      setIsVisible(true)
      setKey(prev => prev + 1)
    }, 50)

    return () => clearTimeout(timer)
  }, [pathname])

  return (
    <div key={key} className={isVisible ? 'page-transition' : 'opacity-0'}>
      {children}
    </div>
  )
}
