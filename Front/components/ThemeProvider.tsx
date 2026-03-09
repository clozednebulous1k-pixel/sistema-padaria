'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

const STORAGE_KEY = 'padaria_modo_noturno'

interface ThemeContextType {
  darkMode: boolean
  toggleDarkMode: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [darkMode, setDarkMode] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const salvo = localStorage.getItem(STORAGE_KEY)
    const ativo = salvo === 'true'
    setDarkMode(ativo)
    if (ativo) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [])

  const toggleDarkMode = () => {
    const novoValor = !darkMode
    setDarkMode(novoValor)
    localStorage.setItem(STORAGE_KEY, String(novoValor))
    if (novoValor) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    return {
      darkMode: false,
      toggleDarkMode: () => {},
    }
  }
  return context
}
