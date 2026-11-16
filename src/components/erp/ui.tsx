import { useEffect, useMemo, useState, type ReactNode, type InputHTMLAttributes } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ChevronRight, ChevronLeft, Search, SlidersHorizontal,
  ChevronsLeft, ChevronsRight, X,
} from 'lucide-react'
import { cn } from '../../lib/cn'

/* ==================================================================
 * Kit de UI do ERP UniFatecie.
 *
 * Classes transcritas dos HTMLs salvos em `ERP html e referencias/`.
 * Os tokens (`erp-primary`, `erp-active`, sombras `erp-*`) são os do
 * :root do bundle real.
 * ================================================================== */

export interface Crumb {
  label: string
  to?: string
}

/**
 * Cabeçalho de rota: botão de voltar + trilha + ação à direita.
 * O ERP colapsa os níveis do meio em "..." quando a trilha é longa.
 */
export function RouteHeader({
  crumbs,
  titulo,
  acao,
  voltar = true,
}: {
  crumbs?: Crumb[]
  titulo: string
  acao?: ReactNode
  voltar?: boolean
}) {
  const navigate = useNavigate()
  const lista = crumbs ?? []

  return (
    <div className="-mt-4 mb-10 flex min-h-[60px] w-full items-center justify-between gap-2 transition-all">
      <div className="flex w-full items-center gap-2 transition-all">
        <button
          onClick={() => navigate(-1)}
          aria-label="Voltar"
          className={cn(
            'flex h-12 items-center justify-center overflow-hidden rounded-xl border border-erp-light-gray text-2xl font-semibold shadow-erp-new-button transition-all hover:bg-black/5',
            voltar ? 'mr-6 w-14 opacity-100' : 'mr-0 w-0 border-0 opacity-0',
          )}
        >
          <ChevronLeft className="size-6" />
        </button>

        <div className="flex h-10 w-full items-center gap-2 transition-all">
          {lista.map((c) => (
            <div key={c.label} className="flex items-center gap-2 overflow-hidden truncate">
              {c.to ? (
                <Link
                  to={c.to}
                  className="cursor-pointer overflow-hidden truncate text-3xl font-semibold text-gray-400 transition-all hover:text-erp-primary"
                >
                  {c.label}
                </Link>
              ) : (
                <span className="overflow-hidden truncate text-3xl font-semibold text-gray-400 transition-all">
                  {c.label}
                </span>
              )}
              <ChevronRight className="size-6 shrink-0 text-gray-400" />
            </div>
          ))}
          <div className="overflow-hidden truncate">
            <h1 className="cursor-default overflow-hidden truncate text-3xl font-semibold transition-all">
              {titulo}
            </h1>
          </div>
        </div>
      </div>

      {acao && <div className="ml-auto">{acao}</div>}
    </div>
  )
}

/** Nome do registro exibido acima do card de detalhes. */
export function DetailsHeader({ titulo, laranja }: { titulo: string; laranja?: boolean }) {
  return (
    <div className="mb-8 flex w-full gap-2 overflow-hidden truncate">
      <h1
        className={cn(
          'text-3xl font-semibold opacity-50 transition-all',
          laranja ? 'font-bold text-erp-primary' : 'text-erp-active',
        )}
      >
        {titulo}
      </h1>
    </div>
  )
}

/** Card grande e arredondado que envolve as telas de detalhe. */
export function DetailsContainer({ children }: { children: ReactNode }) {
  return (
    <div className="flex w-full flex-col gap-10 rounded-3xl border border-erp-primary bg-white px-12 py-10 pl-16 pt-16 shadow-erp-details">
      {children}
    </div>
  )
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-3xl font-semibold text-erp-primary transition-all">{children}</h2>
}

export function InnerTitle({ children }: { children: ReactNode }) {
  return <h3 className="text-xl font-semibold text-erp-primary transition-all xl:text-2xl">{children}</h3>
}

export function Divider() {
  return <div className="w-full border-t border-gray-300" />
}

/**
 * Rótulo em negrito + valor recuado — o par usado em todo o ERP.
 * A largura padrão (`w-1/2`) só entra quando `className` não traz uma própria,
 * senão as duas classes competiriam pela ordem do CSS.
 */
export function Field({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  const temLargura = /(^|\s)(sm:|md:|lg:|xl:)?w-/.test(className ?? '')
  return (
    <div className={cn('flex flex-col gap-1', !temLargura && 'w-1/2', className)}>
      <p className="text-lg font-semibold transition-all">{label}</p>
      <div className="flex w-[95%] items-center gap-2 pl-6 text-lg">{value}</div>
    </div>
  )
}

/** Linha de campos lado a lado. */
export function FieldRow({ children }: { children: ReactNode }) {
  return <div className="flex items-center gap-2 transition-all">{children}</div>
}

/* ------------------------------------------------------------------ */
/* Barra de busca / filtro / ações                                      */
/* ------------------------------------------------------------------ */

export function SearchInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative flex w-full flex-col gap-2 transition-all">
      <div className="flex h-14 w-full items-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-4 transition-all focus-within:border-erp-primary md:gap-3">
        <Search className="size-5 shrink-0 text-gray-400" />
        <input
          {...props}
          className={cn(
            'flex-1 bg-transparent text-xl text-gray-900 outline-none transition-all placeholder:text-gray-400',
            className,
          )}
        />
      </div>
    </div>
  )
}

export function FilterButton({ onClick }: { onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="relative flex h-14 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-erp-primary bg-erp-bg px-10 py-2 text-lg font-medium text-erp-primary shadow-sm transition-all duration-150 hover:bg-erp-primary/10"
    >
      <div className="flex items-center gap-4 transition-all">
        Filtrar
        <SlidersHorizontal className="size-4" />
      </div>
    </button>
  )
}

/** Botão "Novo +" laranja do cabeçalho de listagem. */
export function NewButton({ label = 'Novo +', onClick }: { label?: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex h-16 w-full max-w-[190px] cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-erp-primary px-10 py-7 text-xl font-bold text-white shadow-erp-new-button transition-all duration-300 hover:bg-erp-hover"
    >
      {label}
    </button>
  )
}

/** Botão laranja secundário (ex.: "Gerar Excel"). */
export function SolidButton({
  children,
  onClick,
  className,
  disabled,
  title,
}: {
  children: ReactNode
  onClick?: () => void
  className?: string
  disabled?: boolean
  title?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'flex h-16 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md bg-erp-primary px-4 text-lg font-bold text-white shadow transition-all duration-150 hover:bg-erp-hover disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-erp-primary [&_svg]:size-5',
        className,
      )}
    >
      {children}
    </button>
  )
}

/** Botão contornado laranja (ex.: "Abrir acompanhamento", "Editar Ofertas"). */
export function OutlineButton({
  children,
  onClick,
  className,
  disabled,
  title,
}: {
  children: ReactNode
  onClick?: () => void
  className?: string
  disabled?: boolean
  title?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'flex h-9 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-erp-primary bg-transparent px-4 py-2 text-lg font-medium text-erp-primary shadow-md transition-all duration-150 hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent',
        className,
      )}
    >
      {children}
    </button>
  )
}

/**
 * Modal do ERP. O HTML salvo não tem nenhum — as telas de referência são de
 * listagem e detalhe —, então este segue os tokens do casco (laranja, Lato,
 * cantos e sombra do container de detalhes) em vez de inventar um estilo.
 */
export function ErpModal({
  aberto,
  onFechar,
  titulo,
  subtitulo,
  children,
  largura = 'max-w-2xl',
}: {
  aberto: boolean
  onFechar: () => void
  titulo: string
  subtitulo?: ReactNode
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-erp">
      <div className="absolute inset-0 bg-black/60" onClick={onFechar} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className={cn(
          'relative z-10 max-h-full w-full overflow-y-auto rounded-xl bg-white p-8 shadow-2xl',
          largura,
        )}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-2xl font-bold text-gray-800">{titulo}</h2>
            {subtitulo && <p className="mt-1 text-sm text-erp-dark-gray">{subtitulo}</p>}
          </div>
          <button
            onClick={onFechar}
            aria-label="Fechar"
            className="shrink-0 rounded-md p-1 text-erp-dark-gray transition-colors hover:bg-black/5 hover:text-gray-700"
          >
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Tabela                                                              */
/* ------------------------------------------------------------------ */

export function ErpTable({ children }: { children: ReactNode }) {
  return (
    <div className="relative w-full overflow-auto px-2">
      <table className="w-full caption-bottom border-separate border-spacing-y-4 text-base">{children}</table>
    </div>
  )
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return <th className={cn('px-6 py-2.5 align-middle text-xl font-bold', className)}>{children}</th>
}

export function Tr({
  children,
  to,
  onClick,
  ativo,
  className,
}: {
  children: ReactNode
  to?: string
  /** Linha inteira clicável — usada quando ela É o controle, não um link. */
  onClick?: () => void
  ativo?: boolean
  className?: string
}) {
  return (
    <tr
      className={cn(
        'erp-row transition-all',
        (to || onClick) && 'cursor-pointer',
        ativo && 'outline outline-2 -outline-offset-2 outline-erp-primary',
        className,
      )}
      data-to={to}
      onClick={onClick}
    >
      {children}
    </tr>
  )
}

/** Célula: quando há `to`, o conteúdo vira link que preenche a célula inteira. */
export function Td({
  children,
  to,
  className,
}: {
  children: ReactNode
  to?: string
  className?: string
}) {
  const conteudo = <div className="w-full truncate">{children}</div>
  return (
    <td className={cn('overflow-hidden whitespace-nowrap align-middle text-xl', className)}>
      {to ? (
        <Link to={to} className="block size-full px-6 py-4">
          {conteudo}
        </Link>
      ) : (
        <div className="px-6 py-4">{conteudo}</div>
      )}
    </td>
  )
}

export type BadgeTom = 'verde' | 'cinza' | 'laranja' | 'azul'

const BADGE_TOM: Record<BadgeTom, string> = {
  verde: 'text-green-600',
  cinza: 'text-gray-400',
  laranja: 'text-erp-primary',
  azul: 'text-erp-blue',
}

export function StatusBadge({ label, tom }: { label: string; tom: BadgeTom }) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-sm font-medium shadow-none transition-colors',
        BADGE_TOM[tom],
      )}
    >
      {label}
    </div>
  )
}

/** Estado vazio das listagens (o ERP simplesmente não renderiza linhas). */
export function EmptyRow({ colSpan, texto = 'Nenhum registro encontrado.' }: { colSpan: number; texto?: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-6 py-10 text-center text-lg text-gray-400">
        {texto}
      </td>
    </tr>
  )
}

/* ------------------------------------------------------------------ */
/* Paginação                                                           */
/* ------------------------------------------------------------------ */

export function Pagination({
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
  const plano =
    'flex h-6 cursor-pointer items-center justify-center rounded-md bg-transparent px-1 text-lg text-black shadow-none transition-all hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:size-5'
  const elevado =
    'flex h-6 cursor-pointer items-center justify-center rounded-md bg-white px-1 text-lg text-black shadow transition-all hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:size-5'

  return (
    <div className="flex items-center justify-between gap-2 transition-all">
      <div className="flex items-center gap-2 transition-all">
        <span className="text-lg font-medium transition-all">Itens por página:</span>
        <select
          value={porPagina}
          onChange={(e) => {
            onPorPagina(Number(e.target.value))
            onPagina(1)
          }}
          className="flex h-9 w-fit items-center justify-between gap-2 rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm shadow-sm outline-none"
        >
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>

      <div className="flex items-center gap-4 transition-all">
        <span className="text-lg font-medium transition-all">Página:</span>
        <div className="flex items-center gap-2 transition-all">
          <input
            type="text"
            value={pagina}
            onChange={(e) => {
              const n = Number(e.target.value.replace(/\D/g, ''))
              if (n >= 1 && n <= totalPaginas) onPagina(n)
            }}
            className="w-8 rounded-md border border-gray-300 text-center"
          />
          <span className="text-lg font-medium transition-all">-</span>
          <span>{totalPaginas}</span>
        </div>

        <div className="flex items-center justify-center gap-4 transition-all">
          <div className="flex items-center gap-2 transition-all">
            <button className={plano} disabled={pagina <= 1} onClick={() => onPagina(1)} aria-label="Primeira página">
              <ChevronsLeft />
            </button>
            <button
              className={elevado}
              disabled={pagina <= 1}
              onClick={() => onPagina(pagina - 1)}
              aria-label="Página anterior"
            >
              <ChevronLeft />
            </button>
          </div>
          <div className="flex items-center gap-2 transition-all">
            <button
              className={elevado}
              disabled={pagina >= totalPaginas}
              onClick={() => onPagina(pagina + 1)}
              aria-label="Próxima página"
            >
              <ChevronRight />
            </button>
            <button
              className={plano}
              disabled={pagina >= totalPaginas}
              onClick={() => onPagina(totalPaginas)}
              aria-label="Última página"
            >
              <ChevronsRight />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Lista suspensa pesquisável                                          */
/* ------------------------------------------------------------------ */

export interface OpcaoCombo {
  valor: string
  rotulo: string
  /** Segunda linha e texto extra de busca (cidade/UF, código). */
  apoio?: string
}

function semAcento(t: string): string {
  return t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

/**
 * O PAINEL da lista: busca + rolagem + opções. Só o painel, de propósito.
 *
 * Quem abre é o chamador, e o gatilho pode ser qualquer coisa — na ficha do
 * candidato é a LINHA INTEIRA da tabela de filiais, não um campo dentro de uma
 * célula. Deixar o gatilho aqui dentro obrigaria todo mundo a usar o mesmo
 * botão, que é justamente o que não se queria.
 *
 * A lista renderizada é limitada: filtrar mil itens é barato, desenhar mil nós
 * no DOM a cada tecla não é. Quem não achou nos primeiros refina a busca.
 */
export function ErpListaPesquisavel({
  valor,
  opcoes,
  onEscolher,
  placeholder = 'Pesquisar…',
  vazio = 'Nenhum resultado',
  maxVisiveis = 50,
}: {
  valor: string | null
  opcoes: OpcaoCombo[]
  /** `null` limpa a seleção. */
  onEscolher: (valor: string | null) => void
  placeholder?: string
  vazio?: string
  maxVisiveis?: number
}) {
  const [busca, setBusca] = useState('')

  const filtradas = useMemo(() => {
    const q = semAcento(busca.trim())
    if (!q) return opcoes.slice(0, maxVisiveis)
    const termos = q.split(/\s+/)
    const out: OpcaoCombo[] = []
    for (const o of opcoes) {
      const alvo = semAcento(`${o.rotulo} ${o.apoio ?? ''}`)
      if (termos.every((t) => alvo.includes(t))) out.push(o)
      if (out.length >= maxVisiveis) break
    }
    return out
  }, [busca, opcoes, maxVisiveis])

  return (
    <div className="overflow-hidden rounded-md border border-erp-light-gray bg-white shadow-xl">
      <div className="border-b border-erp-white-gray p-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-erp-dark-gray" />
          <input
            autoFocus
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-md border border-erp-light-gray py-1.5 pl-8 pr-3 text-sm outline-none focus:border-erp-primary"
          />
        </div>
      </div>

      <ul className="max-h-80 overflow-y-auto py-1">
        {valor && (
          <li>
            <button
              type="button"
              onClick={() => onEscolher(null)}
              className="block w-full px-3 py-2 text-left text-sm text-erp-dark-gray transition-colors hover:bg-erp-white-gray"
            >
              Limpar seleção
            </button>
          </li>
        )}
        {filtradas.length === 0 && (
          <li className="px-3 py-6 text-center text-sm text-erp-dark-gray">{vazio}</li>
        )}
        {filtradas.map((o) => (
          <li key={o.valor}>
            <button
              type="button"
              onClick={() => onEscolher(o.valor)}
              className={cn(
                'block w-full px-3 py-2 text-left transition-colors hover:bg-erp-white-gray',
                o.valor === valor && 'bg-erp-primary-opacity',
              )}
            >
              <span className="block text-sm text-gray-800">{o.rotulo}</span>
              {o.apoio && <span className="block text-xs text-erp-dark-gray">{o.apoio}</span>}
            </button>
          </li>
        ))}
      </ul>

      {filtradas.length >= maxVisiveis && (
        <p className="border-t border-erp-white-gray px-3 py-1.5 text-xs text-erp-dark-gray">
          Mostrando os {maxVisiveis} primeiros — refine a busca.
        </p>
      )}
    </div>
  )
}
