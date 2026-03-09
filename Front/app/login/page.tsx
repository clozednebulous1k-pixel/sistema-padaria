'use client'

import { useState } from 'react'
import { useAuth } from '@/components/AuthProvider'
import toast from 'react-hot-toast'
import Image from 'next/image'

export default function LoginPage() {
  const { login } = useAuth()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !senha) {
      toast.error('Preencha email e senha')
      return
    }

    try {
      setLoading(true)
      await login(email, senha)
      toast.success('Login realizado com sucesso!')
    } catch (error: any) {
      const mensagem = error?.response?.data?.message || 'Erro ao fazer login'
      toast.error(mensagem)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 h-screen h-[100dvh] flex items-center justify-center overflow-hidden px-4 sm:px-6">
      {/* Fundo: cobre toda a tela */}
      <div
        className="absolute inset-0 bg-no-repeat bg-center z-0"
        style={{
          backgroundImage: 'url(/fundo-login.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div className="absolute inset-0 bg-black/30 z-0" aria-hidden />
      <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-md">
      {/* Faixa superior */}
      <header className="text-center mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-lg">
          Belfort Pães e Doces
        </h1>
        <p className="mt-2 text-sm sm:text-base text-amber-100/90 font-medium max-w-xs mx-auto drop-shadow-md">
          Sistema de Controle de Padaria
        </p>
      </header>

      <div className="relative w-full">
        {/* Card com animação de entrada e vidro */}
        <div
          className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-3xl shadow-2xl p-6 md:p-8 border-2 border-primary-200/80 dark:border-gray-600 opacity-0 animate-fade-in-up ring-2 ring-primary-100 dark:ring-gray-600/50"
          style={{ boxShadow: '0 25px 50px -12px rgba(85, 7, 1, 0.15)' }}
        >
          {/* Logo com leve animação */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="absolute -inset-2 rounded-2xl bg-primary-500/10 blur-lg" />
              <div className="relative rounded-2xl p-2 bg-white/50 dark:bg-gray-800/50 ring-2 ring-primary-500/20">
                <Image
                  src="/logo.png"
                  alt="Belfort Pães e Doces"
                  width={72}
                  height={72}
                  className="object-contain drop-shadow-sm"
                  priority
                  unoptimized
                />
              </div>
            </div>
          </div>

          <h1 className="text-center text-lg font-semibold text-gray-800 dark:text-gray-100 mb-6">
            Acesse sua conta
          </h1>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-3">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 text-sm border-2 border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 bg-gray-50/50 dark:bg-gray-800/50 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all duration-200 focus:bg-white dark:focus:bg-gray-800"
                  placeholder="Digite seu email"
                />
              </div>

              <div>
                <label htmlFor="senha" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Senha
                </label>
                <input
                  id="senha"
                  name="senha"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full px-4 py-3 text-sm border-2 border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 bg-gray-50/50 dark:bg-gray-800/50 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all duration-200 focus:bg-white dark:focus:bg-gray-800"
                  placeholder="Digite sua senha"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-3.5 px-4 rounded-xl text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30 hover:-translate-y-0.5 active:translate-y-0"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Entrando...
                  </>
                ) : (
                  'Entrar'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Rodapé */}
        <p className="mt-6 text-center text-xs text-white/80 drop-shadow">
          Faça login para acessar o sistema
        </p>
      </div>
      </div>
    </div>
  )
}
