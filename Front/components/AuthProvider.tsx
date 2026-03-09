'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { authApi, Usuario } from '@/lib/api'

interface AuthContextType {
  usuario: Usuario | null
  loading: boolean
  login: (email: string, senha: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    verificarAutenticacao()
  }, [])

  useEffect(() => {
    if (pathname === '/login') return
    if (!loading) {
      const token = localStorage.getItem('token')
      if (!token) router.replace('/login')
    }
  }, [pathname, loading, router])

  const verificarAutenticacao = async () => {
    if (pathname === '/login') {
      setLoading(false)
      return
    }

    try {
      const token = localStorage.getItem('token')
      const usuarioSalvo = localStorage.getItem('usuario')

      if (!token) {
        setLoading(false)
        setUsuario(null)
        router.replace('/login')
        return
      }

      if (usuarioSalvo) {
        try {
          setUsuario(JSON.parse(usuarioSalvo))
        } catch {
          // ignore
        }
      }

      const response = await authApi.me()
      if (response.success) {
        const rawAdmin = response.data.is_admin as boolean | string | number | undefined
        const usuarioData = {
          ...response.data,
          is_admin: rawAdmin === true || rawAdmin === 'true' || rawAdmin === 1
        }
        setUsuario(usuarioData)
        localStorage.setItem('usuario', JSON.stringify(usuarioData))
      } else {
        localStorage.removeItem('token')
        localStorage.removeItem('usuario')
        setUsuario(null)
        router.replace('/login')
      }
    } catch {
      localStorage.removeItem('token')
      localStorage.removeItem('usuario')
      setUsuario(null)
      router.replace('/login')
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, senha: string) => {
    const response = await authApi.login({ email, senha })
    if (response.success) {
      // Garantir que is_admin seja boolean
      const usuarioData = {
        ...response.data.usuario,
        is_admin: (() => { const r = response.data.usuario.is_admin as boolean | string | number | undefined; return r === true || r === 'true' || r === 1 })()
      }
      console.log('Login - Usuário recebido:', usuarioData)
      localStorage.setItem('token', response.data.token)
      localStorage.setItem('usuario', JSON.stringify(usuarioData))
      // Atualizar estado imediatamente
      setUsuario(usuarioData)
      // Aguardar um pouco para garantir que o estado foi atualizado antes de redirecionar
      await new Promise(resolve => setTimeout(resolve, 50))
      router.push('/')
    } else {
      throw new Error('Login falhou')
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    setUsuario(null)
    // Usar replace para não adicionar ao histórico e evitar verificações desnecessárias
    router.replace('/login')
  }

  const value = {
    usuario,
    loading,
    login,
    logout,
    isAuthenticated: !!usuario,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

