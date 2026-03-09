'use client'

import React from 'react'
import FiltrarContent from './FiltrarContent'

function PageLayout({
  children,
  className
}: {
  children: React.ReactNode
  className?: string
}) {
  return React.createElement('div', { className }, children)
}

export default function FiltrarRoteiroPage() {
  return React.createElement(
    PageLayout,
    { className: 'container mx-auto px-4 max-w-5xl' },
    React.createElement(FiltrarContent, null)
  )
}
