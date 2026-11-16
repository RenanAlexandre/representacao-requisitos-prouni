import {
  type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes,
  useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState,
} from 'react'
import { createPortal } from 'react-dom'
import { FaXmark, FaChevronDown, FaMagnifyingGlass, FaCheck } from 'react-icons/fa6'
import { cn } from '../../lib/cn'

/* ==================================================================
 * Kit de UI do GenDocs.
 *
 * As classes abaixo foram transcritas dos HTMLs salvos da plataforma
 * (`Gendocs htmls e referencias/`). Onde o original usa um utilitário
 * exclusivo do Tailwind v4 (`border-1`, `outline-1` em <tr>), a versão
 * equivalente do v3 está aplicada — o resultado visual é o mesmo.
 * ================================================================== */

/** Botão azul cheio: "Novo +", "Salvar", "Aplicar". */
export function GdButton({
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        'flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-gd-blue py-2 font-semibold text-white transition-all',
        'hover:brightness-95 focus:outline-none focus-visible:ring-1 focus-visible:ring-gd-blue disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
    >
      {children}
    </button>
  )
}

/** Botão contornado azul: "Importar Lista", "Filtro", "Editar dados". */
export function GdOutlineButton({
  className,
  children,
  tone = 'blue',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'blue' | 'red' }) {
  return (
    <button
      {...props}
      className={cn(
        'flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg border-2 bg-transparent py-2 font-semibold transition-all',
        'focus:outline-none focus-visible:ring-1 focus-visible:ring-gd-blue disabled:pointer-events-none disabled:opacity-50',
        tone === 'blue'
          ? 'border-gd-blue text-gd-blue hover:bg-gd-blue hover:text-white'
          : 'border-gd-red text-gd-red hover:bg-gd-red hover:text-white',
        className,
      )}
    >
      {children}
    </button>
  )
}

/** Link-botão sublinhado: "Editar documentos", "Editar SLAs". */
export function GdLinkButton({
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        'flex h-10 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md px-4 py-2 text-base font-medium text-gd-blue underline underline-offset-[3px] transition-all hover:brightness-110',
        className,
      )}
    >
      {children}
    </button>
  )
}

/** Ícone-botão redondo das colunas de Ações. */
export function GdIconButton({
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        'flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-gd-gray-100 bg-gd-gray-50 p-0 text-gd-blue transition-all hover:bg-gd-white-blue [&_svg]:size-[1.125rem]',
        className,
      )}
    >
      {children}
    </button>
  )
}

/** Campo de busca cinza de topo de lista. */
export function GdSearch({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        'flex h-12 w-full rounded-md border border-gd-gray-100 bg-gd-gray-50 px-3 py-1 pl-5 pr-10 text-base text-black/80 shadow-none ring-1 ring-transparent transition-all',
        'hover:border-gd-blue-100 focus-visible:border-gd-blue-100 focus-visible:shadow-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gd-blue',
        'md:text-sm 2xl:px-5',
        className,
      )}
    />
  )
}

/* ------------------------------------------------------------------ */
/* KPI                                                                 */
/* ------------------------------------------------------------------ */

export type KpiTom = 'azul' | 'branco' | 'cinza' | 'laranja' | 'info' | 'verde'

const KPI_TOM: Record<KpiTom, string> = {
  azul: 'bg-gd-white-blue text-gd-blue-200',
  branco: 'border border-gray-200 bg-white text-gray-500',
  cinza: 'bg-gray-100 text-gray-500',
  laranja: 'bg-gd-white-orange text-gd-orange',
  info: 'bg-gd-white-blue text-gd-blue-100',
  verde: 'bg-gd-white-green text-gd-green-100',
}

export function GdKpi({
  icon,
  label,
  valor,
  sufixo,
  tom,
}: {
  icon: ReactNode
  label: string
  valor: string | number
  sufixo?: string
  tom: KpiTom
}) {
  return (
    <div
      className={cn(
        'flex h-14 w-full items-center justify-between rounded-lg px-5 py-2 text-xs transition-all 2xl:text-base',
        KPI_TOM[tom],
      )}
    >
      <div className="flex w-full items-center gap-3 transition-all [&_svg]:size-5 [&_svg]:shrink-0 2xl:[&_svg]:size-6">
        {icon}
        <b>{label}</b>
      </div>
      <div className="flex h-full w-auto items-center gap-2 border-l-2 pl-4 transition-all">
        <b className="text-2xl">{valor}</b>
        {sufixo && <b>{sufixo}</b>}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Card de menu (grade 2 colunas dentro do módulo)                     */
/* ------------------------------------------------------------------ */

export function GdMenuCard({
  icon,
  label,
  chevron,
  onClick,
}: {
  icon: ReactNode
  label: string
  chevron: ReactNode
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      className="flex h-24 w-full cursor-pointer items-center gap-4 rounded-xl border border-gd-gray-100 bg-white p-4 px-12 text-lg font-semibold text-gd-blue shadow-gd-menu-card transition-all hover:bg-gd-blue hover:text-white hover:shadow-xl"
    >
      {icon}
      {label}
      <span className="ml-auto">{chevron}</span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Modal (Radix Dialog no original — aqui em HTML puro)                */
/* ------------------------------------------------------------------ */

export function GdModal({
  aberto,
  onFechar,
  titulo,
  children,
  largura = 'max-w-lg',
}: {
  aberto: boolean
  onFechar: () => void
  titulo: string
  children: ReactNode
  largura?: string
}) {
  useEffect(() => {
    if (!aberto) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onFechar()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [aberto, onFechar])

  if (!aberto) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onFechar} />
      <div className={cn('relative z-10 w-full rounded-lg bg-white p-8 shadow-2xl', largura)}>
        <div className="mb-6 flex items-start justify-between">
          <b className="text-2xl text-gd-blue">{titulo}</b>
          <button
            onClick={onFechar}
            aria-label="Fechar"
            className="cursor-pointer text-gray-400 transition-colors hover:text-gray-600"
          >
            <FaXmark className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

/** Campo de formulário dos modais: rótulo em cima, input contornado. */
export function GdField({
  label,
  children,
  className,
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex w-full flex-col gap-1.5 transition-all', className)}>
      <p className="font-semibold text-black/80">{label}</p>
      {children}
    </div>
  )
}

export function GdInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        'flex h-11 w-full rounded-md border border-gd-gray-100 bg-transparent px-4 py-1 text-base text-black/80 ring-1 ring-transparent transition-all',
        'placeholder:text-gd-gray-100 hover:border-gd-blue-100 focus-visible:border-gd-blue-100 focus-visible:shadow-md focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gd-blue',
        className,
      )}
    />
  )
}

/** Campo "flutuante": rótulo pequeno recortando a borda (tela de Layout do E-mail). */
export function GdFloatField({
  label,
  children,
  className,
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('relative flex w-full flex-col transition-all', className)}>
      <label className="absolute -top-2.5 left-4 z-10 flex items-center gap-2 bg-white px-1 text-xs font-medium text-gray-500">
        {label}
      </label>
      <div className="relative flex items-center">{children}</div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Paginação (rodapé das listas)                                       */
/* ------------------------------------------------------------------ */

export function GdPaginacao({
  porPagina,
  onPorPagina,
  pagina,
  totalPaginas,
  onPagina,
}: {
  porPagina: number
  onPorPagina: (n: number) => void
  pagina: number
  totalPaginas: number
  onPagina: (n: number) => void
}) {
  const btn =
    'flex size-8 cursor-pointer items-center justify-center rounded-md bg-white p-0 text-gray-700 transition-all disabled:opacity-30 [&_svg]:size-4'
  return (
    <div className="mt-5 flex w-full items-center justify-between text-gray-700 transition-all">
      <div className="flex items-center gap-2 transition-all">
        Itens por página:
        <select
          value={porPagina}
          onChange={(e) => {
            onPorPagina(Number(e.target.value))
            onPagina(1)
          }}
          className="rounded border p-1 focus:outline-none"
        >
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
        </select>
      </div>

      <div className="flex w-fit items-center gap-4 transition-all">
        <div className="flex items-center gap-2 transition-all">
          Página:
          <input
            type="text"
            value={pagina}
            onChange={(e) => {
              const n = Number(e.target.value.replace(/\D/g, ''))
              if (n >= 1 && n <= totalPaginas) onPagina(n)
            }}
            className="size-8 rounded-md border border-gd-gray-100 bg-transparent text-center text-base text-black/80 transition-all focus-visible:outline-none 2xl:p-0"
          />
          -<span>{totalPaginas}</span>
        </div>

        <div className="flex w-fit items-center gap-4 transition-all">
          <div className="flex items-center transition-all">
            <button className={btn} disabled={pagina === 1} onClick={() => onPagina(1)} aria-label="Primeira página">
              «
            </button>
            <button
              className={cn(btn, 'border shadow-sm')}
              disabled={pagina === 1}
              onClick={() => onPagina(pagina - 1)}
              aria-label="Página anterior"
            >
              ‹
            </button>
          </div>
          <div className="flex items-center transition-all">
            <button
              className={cn(btn, 'border shadow-sm')}
              disabled={pagina >= totalPaginas}
              onClick={() => onPagina(pagina + 1)}
              aria-label="Próxima página"
            >
              ›
            </button>
            <button
              className={btn}
              disabled={pagina >= totalPaginas}
              onClick={() => onPagina(totalPaginas)}
              aria-label="Última página"
            >
              »
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Filtro de coluna — lista pesquisável                                */
/* ------------------------------------------------------------------ */

function semAcento(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

/**
 * O filtro que mora no cabeçalho de cada coluna da consulta.
 *
 * Era um `<select>` nativo, e o nativo não tem busca: numa coluna como "Nome
 * do Participante" a lista cresce com a base e sobra rolar no escuro atrás do
 * nome certo. Aqui a lista abre com campo de pesquisa e altura fixa.
 *
 * O painel vai para um PORTAL com posição fixa de propósito: a tabela mora
 * dentro de um contêiner `overflow-auto`, e um painel absoluto dentro do `th`
 * seria cortado na borda do contêiner — o clássico dropdown que aparece pela
 * metade. Fixo no body, ele passa por cima; em troca precisa ser reposicionado
 * quando a página ou a tabela rolam, que é o que o listener abaixo faz.
 */
/** Altura do painel aberto — decide também se ele abre para cima ou para baixo. */
const ALTURA_FILTRO = 320

export function GdFiltroColuna({
  valor,
  opcoes,
  onChange,
  rotulo,
}: {
  /** String vazia = sem filtro ("Todos"). */
  valor: string
  opcoes: string[]
  onChange: (valor: string) => void
  /** Nome da coluna, usado no placeholder da busca e na acessibilidade. */
  rotulo: string
}) {
  const [aberto, setAberto] = useState(false)
  const [busca, setBusca] = useState('')
  const [caixa, setCaixa] = useState<{ left: number; top: number; width: number } | null>(null)
  const gatilho = useRef<HTMLButtonElement>(null)
  const painel = useRef<HTMLDivElement>(null)

  const posicionar = useCallback(() => {
    const r = gatilho.current?.getBoundingClientRect()
    if (!r) return
    const abaixo = window.innerHeight - r.bottom
    /* Abre para cima só quando não cabe embaixo E cabe melhor em cima. */
    const acima = abaixo < ALTURA_FILTRO && r.top > abaixo
    setCaixa({
      left: Math.max(8, Math.min(r.left, window.innerWidth - Math.max(r.width, 260) - 8)),
      top: acima ? Math.max(8, r.top - ALTURA_FILTRO - 4) : r.bottom + 4,
      width: Math.max(r.width, 260),
    })
  }, [])

  useLayoutEffect(() => {
    if (!aberto) return
    posicionar()
    /* `true` para pegar a rolagem de qualquer ancestral — a tabela rola na
       horizontal dentro do próprio contêiner, e sem isso o painel ficaria
       parado enquanto a coluna anda. */
    window.addEventListener('scroll', posicionar, true)
    window.addEventListener('resize', posicionar)
    return () => {
      window.removeEventListener('scroll', posicionar, true)
      window.removeEventListener('resize', posicionar)
    }
  }, [aberto, posicionar])

  useEffect(() => {
    if (!aberto) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setAberto(false)
    }
    /* Fecha ao clicar fora — mas sem cortina por cima da tela, senão abrir o
       filtro da coluna vizinha exigiria dois cliques. */
    function onDown(e: PointerEvent) {
      const alvo = e.target as Node
      if (gatilho.current?.contains(alvo) || painel.current?.contains(alvo)) return
      setAberto(false)
    }
    window.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown, true)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown, true)
    }
  }, [aberto])

  const filtradas = useMemo(() => {
    const q = semAcento(busca.trim())
    if (!q) return opcoes
    const termos = q.split(/\s+/)
    return opcoes.filter((o) => {
      const alvo = semAcento(o)
      return termos.every((t) => alvo.includes(t))
    })
  }, [busca, opcoes])

  function escolher(v: string) {
    onChange(v)
    setAberto(false)
    setBusca('')
  }

  return (
    <>
      <button
        ref={gatilho}
        type="button"
        aria-label={`Filtrar por ${rotulo}`}
        aria-expanded={aberto}
        onClick={() => setAberto((v) => !v)}
        className={cn(
          'mt-2 flex w-full cursor-pointer items-center justify-between gap-2 rounded-md border px-2 py-1 text-left text-sm font-normal transition-colors',
          valor
            ? 'border-gd-blue bg-gd-white-blue text-gd-blue-200'
            : 'border-gray-200 bg-white text-gray-500 hover:border-gd-blue-100',
          aberto && 'border-gd-blue-100 ring-1 ring-gd-blue',
        )}
      >
        <span className="truncate">{valor || 'Todos'}</span>
        <FaChevronDown className={cn('size-3 shrink-0 transition-transform', aberto && 'rotate-180')} />
      </button>

      {aberto &&
        caixa &&
        createPortal(
          <div
            ref={painel}
            style={{ left: caixa.left, top: caixa.top, width: caixa.width, maxHeight: ALTURA_FILTRO }}
            className="fixed z-[60] flex flex-col overflow-hidden rounded-lg border border-gd-gray-100 bg-white text-sm shadow-2xl"
          >
            <div className="border-b border-gd-gray-100 p-2">
              <div className="relative">
                <FaMagnifyingGlass className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-gd-gray-100" />
                <input
                  autoFocus
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder={`Pesquisar em ${rotulo.toLowerCase()}…`}
                  className="w-full rounded-md border border-gd-gray-100 py-1.5 pl-8 pr-2 text-sm text-black/80 outline-none transition-colors focus:border-gd-blue-100"
                />
              </div>
            </div>

            <ul className="min-h-0 flex-1 overflow-y-auto py-1">
              <li>
                <button
                  type="button"
                  onClick={() => escolher('')}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors hover:bg-gd-white-blue',
                    !valor && 'font-semibold text-gd-blue-200',
                  )}
                >
                  Todos
                  {!valor && <FaCheck className="size-3 shrink-0 text-gd-blue" />}
                </button>
              </li>

              {filtradas.length === 0 && (
                <li className="px-3 py-6 text-center text-gd-gray-400">Nenhum valor com esse termo</li>
              )}

              {filtradas.map((o) => (
                <li key={o}>
                  <button
                    type="button"
                    onClick={() => escolher(o)}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors hover:bg-gd-white-blue',
                      o === valor ? 'bg-gd-white-blue font-semibold text-gd-blue-200' : 'text-gray-700',
                    )}
                  >
                    <span className="truncate">{o}</span>
                    {o === valor && <FaCheck className="size-3 shrink-0 text-gd-blue" />}
                  </button>
                </li>
              ))}
            </ul>

            <p className="border-t border-gd-gray-100 px-3 py-1.5 text-xs text-gd-gray-400">
              {filtradas.length} valor(es) nesta coluna
            </p>
          </div>,
          document.body,
        )}
    </>
  )
}
