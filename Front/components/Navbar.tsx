'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { useAuth } from './AuthProvider'
import { useTheme } from './ThemeProvider'
import BackupButton from './BackupButton'

function GearIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12 3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97 0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1 0 .33.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66Z" />
    </svg>
  )
}

export default function Navbar() {
  const [menuAberto, setMenuAberto] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickFora = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuAberto(false)
      }
    }
    document.addEventListener('click', handleClickFora)
    return () => document.removeEventListener('click', handleClickFora)
  }, [])
  const pathname = usePathname()
  const { usuario, logout, isAuthenticated, loading } = useAuth()
  
  // Não mostrar navbar na página de login ou se não estiver autenticado (e não estiver carregando)
  if (pathname === '/login') {
    return null
  }

  // Se ainda está carregando, não mostrar navbar
  if (loading) {
    return null
  }

  // Exige login: sem token não mostra o restante do sistema
  if (!isAuthenticated) {
    return null
  }

  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/'
    }
    return pathname?.startsWith(path)
  }

  const rawAdmin = usuario?.is_admin as boolean | string | number | undefined
  const isAdmin = rawAdmin === true || rawAdmin === 'true' || rawAdmin === 1
  const { darkMode, toggleDarkMode } = useTheme()

  return (
    <nav className="sticky top-0 z-50 bg-white dark:bg-gray-900 shadow-md border-b border-gray-200 dark:border-gray-700">
      <div className="container mx-auto px-4">
        {/* Primeira linha: Logo, Título, Usuário e Sair */}
        <div className="flex items-center justify-between h-12 border-b border-gray-200 dark:border-gray-700">
          <Link href="/" className="flex items-center space-x-2">
            <div className="relative w-8 h-8 flex items-center justify-center">
              <Image
                src="/logo.png"
                alt="Belfort Pães e Doces"
                width={32}
                height={32}
                className="object-contain"
                priority
                unoptimized
              />
            </div>
            <span className="text-base font-bold text-gray-900 dark:text-gray-100 hidden sm:block">Belfort Pães e Doces</span>
          </Link>

          {/* Modo Noturno, Backup, Usuário e Sair */}
          {usuario && (
            <div className="flex items-center gap-2">
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                title={darkMode ? 'Modo claro' : 'Modo noturno'}
              >
                {darkMode ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>
                )}
              </button>
              <BackupButton />
              <span className="text-xs text-gray-700 dark:text-gray-300 hidden sm:block">
                {usuario.nome}
              </span>
              <button
                onClick={logout}
                className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Sair
              </button>
            </div>
          )}

        </div>
        {/* Segunda linha: Links de navegação centralizados */}
        <div className="flex justify-center py-2 bg-white dark:bg-gray-900 shadow-sm">
          <div className="flex flex-wrap justify-center gap-1">
            <Link
              href="/"
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                isActive('/') && pathname === '/'
                  ? 'bg-primary-500 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Início
            </Link>
            <Link
              href="/produtos"
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                isActive('/produtos')
                  ? 'bg-primary-500 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Produtos
            </Link>
            <Link
              href="/empresas"
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                isActive('/empresas')
                  ? 'bg-primary-500 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Cadastro Empresas
            </Link>
            <Link
              href="/roteiros"
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                isActive('/roteiros') && !pathname?.startsWith('/roteiros/historico') && pathname !== '/roteiros/filtrar'
                  ? 'bg-primary-500 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Roteiros de Entregas
            </Link>
            <Link
              href="/roteiros/filtrar"
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                pathname === '/roteiros/filtrar'
                  ? 'bg-primary-500 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Relatórios
            </Link>
            <Link
              href="/lancamentos"
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                isActive('/lancamentos')
                  ? 'bg-primary-500 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Lançamentos
            </Link>
            <Link
              href="/massas"
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                isActive('/massas')
                  ? 'bg-primary-500 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Listas de Massas
            </Link>
            <div className="relative" ref={menuRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuAberto(!menuAberto)
                }}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-1.5 ${
                  isActive('/usuarios') || isActive('/lixeira') || isActive('/auditoria') || isActive('/roteiros/historico')
                    ? 'bg-primary-500 text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                title="Configurações"
              >
                <GearIcon className="w-4 h-4" />
                Configurações
              </button>
              {menuAberto && (
                <div className="absolute left-0 mt-1 w-44 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                  <Link
                    href="/usuarios"
                    onClick={() => setMenuAberto(false)}
                    className={`block px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 ${isActive('/usuarios') ? 'text-primary-600 dark:text-primary-400 font-semibold bg-primary-50 dark:bg-primary-900/30' : 'text-gray-700 dark:text-gray-300'}`}
                  >
                    Usuários
                  </Link>
                  <Link
                    href="/roteiros/historico"
                    onClick={() => setMenuAberto(false)}
                    className={`block px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 ${isActive('/roteiros/historico') ? 'text-primary-600 dark:text-primary-400 font-semibold bg-primary-50 dark:bg-primary-900/30' : 'text-gray-700 dark:text-gray-300'}`}
                  >
                    Histórico
                  </Link>
                  {isAdmin && (
                    <>
                      <Link
                        href="/lixeira"
                        onClick={() => setMenuAberto(false)}
                        className={`block px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 ${isActive('/lixeira') ? 'text-primary-600 dark:text-primary-400 font-semibold bg-primary-50 dark:bg-primary-900/30' : 'text-gray-700 dark:text-gray-300'}`}
                      >
                        Restauração
                      </Link>
                      <Link
                        href="/auditoria"
                        onClick={() => setMenuAberto(false)}
                        className={`block px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 ${isActive('/auditoria') ? 'text-primary-600 dark:text-primary-400 font-semibold bg-primary-50 dark:bg-primary-900/30' : 'text-gray-700 dark:text-gray-300'}`}
                      >
                        Monitoramento
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
