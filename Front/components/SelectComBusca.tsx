'use client'

import { useState, useRef, useEffect } from 'react'

export interface Option<T = string | number> {
  value: T
  label: string
}

interface SelectComBuscaProps<T = string | number> {
  options: Option<T>[]
  value: T
  onChange: (value: T) => void
  placeholder?: string
  className?: string
  id?: string
  disabled?: boolean
  /** Para modo escuro */
  dark?: boolean
  /** Callback extra ao focar (ex.: recarregar dados) */
  onFocusExtra?: () => void
}

export function SelectComBusca<T extends string | number>({
  options,
  value,
  onChange,
  placeholder = 'Digite para buscar...',
  className = '',
  id,
  disabled = false,
  dark = false,
  onFocusExtra,
}: SelectComBuscaProps<T>) {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  const sortedOptions = options
    .slice()
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR', { sensitivity: 'base' }))

  const selectedOption = sortedOptions.find((o) => o.value === value)
  const displayValue = selectedOption ? selectedOption.label : ''
  const term = (filter || (open ? filter : displayValue)).trim().toLowerCase()
  const filtered = term
    ? sortedOptions.filter((o) => o.label.toLowerCase().includes(term))
    : sortedOptions

  useEffect(() => {
    if (!open) setFilter('')
  }, [open])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const inputBg = dark ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100'
  const dropdownBg = dark ? 'bg-gray-800 border-gray-600' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600'
  const itemHover = dark ? 'hover:bg-gray-600' : 'hover:bg-gray-100 dark:hover:bg-gray-700'

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          id={id}
          type="text"
          value={open ? filter : displayValue}
          onChange={(e) => {
            setFilter(e.target.value)
            if (!open) setOpen(true)
          }}
          onFocus={() => {
            setOpen(true)
            if (onFocusExtra) {
              onFocusExtra()
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setOpen(false)
              setFilter('')
            }
            if (e.key === 'Enter' && filtered.length === 1) {
              e.preventDefault()
              onChange(filtered[0].value as T)
              setOpen(false)
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full px-3 py-1.5 pr-8 text-sm border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${inputBg} ${className}`}
          autoComplete="off"
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </div>
      {open && (
        <ul
          className={`absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-lg border shadow-lg py-1 ${dropdownBg}`}
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">Nenhum resultado</li>
          ) : (
            filtered.map((opt) => (
              <li
                key={String(opt.value)}
                role="option"
                aria-selected={opt.value === value}
                onClick={() => {
                  onChange(opt.value as T)
                  setOpen(false)
                }}
                className={`px-3 py-2 text-sm cursor-pointer ${itemHover} ${opt.value === value ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300' : ''}`}
              >
                {opt.label}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
