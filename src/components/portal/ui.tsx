import { type ReactNode } from 'react'
import { cn } from '../../lib/cn'

/* ==================================================================
 * Kit de UI do Portal do Candidato.
 *
 * Herda a linguagem da landing page: card branco arredondado com borda
 * fininha, subtítulo em `lp-primary` com a régua ao lado, rótulo pequeno
 * sobre o valor.
 * ================================================================== */

export function Titulo({ children, apoio }: { children: ReactNode; apoio?: ReactNode }) {
  return (
    <header className="mb-6">
      <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">{children}</h1>
      {apoio && <p className="mt-1.5 text-sm leading-relaxed text-gray-500">{apoio}</p>}
    </header>
  )
}

/** Subtítulo com a régua — o mesmo da landing. */
export function Subtitulo({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 pb-3 pt-1">
      <span className="text-sm font-bold uppercase tracking-wide text-lp-primary">{children}</span>
      <span className="h-px flex-1 bg-gray-200" />
    </div>
  )
}

export function Cartao({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-3xl border border-gray-300 bg-white p-5 shadow md:p-6', className)}>
      {children}
    </section>
  )
}

/** Rótulo pequeno sobre o valor. `largura` recebe as classes de coluna. */
export function Dado({ label, valor, largura }: { label: string; valor: ReactNode; largura?: string }) {
  return (
    <div className={cn('min-w-0', largura)}>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-0.5 break-words text-sm font-medium text-gray-900">{valor || '—'}</p>
    </div>
  )
}

export function Grade({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
}

export function Etiqueta({ children, classe }: { children: ReactNode; classe: string }) {
  return (
    <span className={cn('inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-semibold', classe)}>
      {children}
    </span>
  )
}
