import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import Navbar from '@/components/Navbar'
import PageTransition from '@/components/PageTransition'
import { AuthProvider } from '@/components/AuthProvider'
import { ThemeProvider } from '@/components/ThemeProvider'
import { NavigationSaveProvider } from '@/components/NavigationSaveProvider'

// Usa fontes do sistema para evitar falha no build Docker (sem acesso a Google Fonts)

export const metadata: Metadata = {
  title: 'Sistema de Controle de Padaria',
  description: 'Sistema completo para controle de produtos e vendas de padaria',
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var s=localStorage.getItem('padaria_modo_noturno');if(s==='true')document.documentElement.classList.add('dark');else document.documentElement.classList.remove('dark');})();`,
          }}
        />
      </head>
      <body className="font-sans bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors">
        <ThemeProvider>
          <AuthProvider>
            <NavigationSaveProvider>
              <Navbar />
              <main className="min-h-screen py-8">
                <PageTransition>
                  {children}
                </PageTransition>
              </main>
            </NavigationSaveProvider>
            <Toaster position="top-right" />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
