'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

type SaveHandler = {
  save: () => Promise<void>
  isDirty: () => boolean
}

const NavigationSaveContext = createContext<{
  registerSaveHandler: (h: SaveHandler) => () => void
  flushBeforeNavigate: () => Promise<void>
} | null>(null)

export function NavigationSaveProvider({ children }: { children: React.ReactNode }) {
  const handlerRef = useRef<SaveHandler | null>(null)

  const registerSaveHandler = useCallback((h: SaveHandler) => {
    handlerRef.current = h
    return () => {
      if (handlerRef.current === h) handlerRef.current = null
    }
  }, [])

  const flushBeforeNavigate = useCallback(async () => {
    const h = handlerRef.current
    if (!h || !h.isDirty()) return
    try {
      await h.save()
    } catch (e) {
      console.error(e)
      // Validação do formulário: o toast específico já foi exibido na página.
      if (e instanceof Error && e.message === 'VALIDATION') {
        throw e
      }
      toast.error(
        'Não foi possível salvar as alterações. Confira os dados e tente de novo.'
      )
      throw e
    }
  }, [])

  return (
    <NavigationSaveContext.Provider value={{ registerSaveHandler, flushBeforeNavigate }}>
      {children}
    </NavigationSaveContext.Provider>
  )
}

export function useNavigationSave() {
  const ctx = useContext(NavigationSaveContext)
  if (!ctx) {
    throw new Error('useNavigationSave deve ser usado dentro de NavigationSaveProvider')
  }
  return ctx
}

/**
 * Registra salvamento ao trocar de aba na navbar. Use refs internos para não
 * re-registrar a cada render.
 */
export function useRegisterNavigationSave(
  save: () => Promise<void>,
  isDirty: () => boolean
) {
  const { registerSaveHandler } = useNavigationSave()
  const saveRef = useRef(save)
  const dirtyRef = useRef(isDirty)
  saveRef.current = save
  dirtyRef.current = isDirty

  useEffect(() => {
    return registerSaveHandler({
      save: () => saveRef.current(),
      isDirty: () => dirtyRef.current(),
    })
  }, [registerSaveHandler])
}

type SaveAwareLinkProps = {
  href: string
  className?: string
  children: React.ReactNode
  onClick?: () => void
}

/**
 * Link que, antes de navegar (clique normal), tenta salvar trabalho pendiente
 * registrado na página atual. Ctrl/clique do meio mantém comportamento padrão.
 */
export function SaveAwareLink({ href, className, children, onClick }: SaveAwareLinkProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { flushBeforeNavigate } = useNavigationSave()

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
      return
    }
    e.preventDefault()
    onClick?.()
    if (href === pathname) return

    const timeoutMs = 25_000
    void (async () => {
      try {
        await Promise.race([
          flushBeforeNavigate(),
          new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('NAV_FLUSH_TIMEOUT')), timeoutMs)
          }),
        ])
      } catch (err) {
        if (err instanceof Error && err.message === 'NAV_FLUSH_TIMEOUT') {
          toast.error(
            'Salvamento automático demorou demais. Indo para a próxima página — salve manualmente se precisar.',
            { duration: 5000 }
          )
          router.push(href)
          return
        }
        return
      }
      router.push(href)
    })()
  }

  return (
    <Link href={href} className={className} onClick={handleClick}>
      {children}
    </Link>
  )
}
