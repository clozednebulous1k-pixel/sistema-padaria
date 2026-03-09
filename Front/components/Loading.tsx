'use client'

export default function Loading() {
  return (
    <div
      className="fixed inset-0 bg-white bg-opacity-90 z-50 flex items-center justify-center"
      data-nextjs-scroll-focus-boundary
      role="status"
      aria-live="polite"
      aria-label="Carregando"
    >
      <div className="text-center">
        <div className="relative w-20 h-20 mx-auto mb-4">
          <div className="absolute inset-0 border-4 border-primary-200 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-transparent border-t-primary-500 rounded-full animate-spin"></div>
        </div>
        <p className="text-gray-600 font-semibold text-lg">Carregando...</p>
      </div>
    </div>
  )
}
