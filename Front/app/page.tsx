'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import Link from 'next/link'
import Loading from '@/components/Loading'

export default function Home() {
  const router = useRouter()
  const { isAuthenticated, loading } = useAuth()

  useEffect(() => {
    // Se não estiver carregando e não estiver autenticado, redirecionar para login
    if (!loading && !isAuthenticated) {
      router.push('/login')
    }
  }, [loading, isAuthenticated, router])

  // Mostrar loading enquanto verifica autenticação
  if (loading) {
    return <Loading />
  }

  // Se não estiver autenticado, não mostrar nada (será redirecionado)
  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="container mx-auto px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-gray-100 mb-4">
             Sistema de Controle de Padaria
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Gerencie produtos e roteiros de produção de forma simples e eficiente
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mt-12">
          <Link
            href="/produtos"
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 hover:shadow-xl dark:hover:bg-gray-700 transition-all border border-transparent dark:border-gray-700 group"
          >
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Produtos</h2>
            <p className="text-gray-600 dark:text-gray-300">
              Gerencie seu catálogo de produtos, preços e descrições
            </p>
          </Link>

          <Link
            href="/roteiros"
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 hover:shadow-xl dark:hover:bg-gray-700 transition-all border border-transparent dark:border-gray-700 group"
          >
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Roteiros</h2>
            <p className="text-gray-600 dark:text-gray-300">
              Crie e gerencie roteiros de produção para seus clientes
            </p>
          </Link>

          <Link
            href="/motoristas"
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 hover:shadow-xl dark:hover:bg-gray-700 transition-all border border-transparent dark:border-gray-700 group"
          >
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Roteiros de Motoristas</h2>
            <p className="text-gray-600 dark:text-gray-300">
              Gerencie roteiros de entrega vinculados aos motoristas
            </p>
          </Link>

          <Link
            href="/massas"
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 hover:shadow-xl dark:hover:bg-gray-700 transition-all border border-transparent dark:border-gray-700 group"
          >
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Roteiros de Entregas</h2>
            <p className="text-gray-600 dark:text-gray-300">
              Gerencie receitas de massa para cada tipo de pão
            </p>
          </Link>
        </div>
      </div>
    </div>
  )
}
