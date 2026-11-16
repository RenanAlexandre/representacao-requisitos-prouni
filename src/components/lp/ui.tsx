import {
  type ReactNode, type InputHTMLAttributes,
  useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState,
} from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Search, Check } from 'lucide-react'
import { cn } from '../../lib/cn'

/* ==================================================================
 * Kit de UI da landing page de captação.
 *
 * Classes transcritas dos HTMLs salvos em
 * `landing page html e referencias/` (EvoluiTec). A única troca
 * deliberada é a cor: o roxo virou `lp-primary` e o verde `lp-green`.
 * ================================================================== */

/** Linha do formulário: empilha no celular, duas colunas no desktop. */
export function Linha({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col justify-between gap-2 md:flex-row', className)}>{children}</div>
  )
}

/**
 * Campo: rótulo + controle. Ocupa sempre 100% do espaço que recebe — para
 * estreitá-lo, envolva-o num wrapper com a largura desejada (passar `w-*`
 * aqui perderia para o `w-full`, que a ordem do CSS do Tailwind faz vencer).
 */
export function Campo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="w-full space-y-2">
      <label className="flex select-none items-center gap-2 text-sm font-medium leading-none">{label}</label>
      {children}
    </div>
  )
}

/** Moldura branca de borda fininha que envolve inputs e selects. */
function Moldura({ children }: { children: ReactNode }) {
  return (
    <div className="flex w-full flex-row items-center justify-between gap-1 rounded-md border border-[#eeeeee] bg-white px-1 transition-all focus-within:border-lp-primary focus-within:ring-1 focus-within:ring-lp-primary/40">
      {children}
    </div>
  )
}

export function Entrada({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Moldura>
      <div className="flex flex-1 flex-row items-center justify-start gap-2">
        <input
          {...props}
          className={cn(
            'h-12 w-full border-none bg-white p-1 text-sm text-black placeholder:text-sm placeholder:text-gray-500 focus:border-0 focus:outline-none focus:ring-0',
            className,
          )}
        />
      </div>
    </Moldura>
  )
}

/* ------------------------------------------------------------------ */
/* Lista suspensa pesquisável                                          */
/* ------------------------------------------------------------------ */

/** Altura do painel aberto — define também se ele abre para cima ou para baixo. */
const ALTURA_LISTA = 320

function semAcento(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

/**
 * O menu suspenso do formulário.
 *
 * Era um `<select>` nativo, e o nativo não busca. Nesta landing isso doía em
 * dois campos em particular: município de naturalidade, que lista as cidades
 * de uma UF inteira, e curso pretendido, com 83 opções. Rolar atrás do nome é
 * a parte mais lenta do preenchimento — agora se digita.
 *
 * O painel vai para um portal com posição fixa: alguns destes campos abrem
 * dentro de um modal (inserir familiar, no Portal) ou perto do fim do card,
 * onde um painel absoluto apareceria cortado. Em troca ele precisa ser
 * reposicionado enquanto a página rola.
 */
export function Selecao({
  value,
  onChange,
  placeholder,
  opcoes,
  disabled,
  buscaPlaceholder = 'Digite para filtrar…',
}: {
  value: string
  /** Recebe o valor escolhido. */
  onChange: (valor: string) => void
  placeholder: string
  opcoes: string[]
  disabled?: boolean
  buscaPlaceholder?: string
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
    const acima = abaixo < ALTURA_LISTA && r.top > abaixo
    setCaixa({
      left: r.left,
      top: acima ? Math.max(8, r.top - ALTURA_LISTA - 4) : r.bottom + 4,
      width: r.width,
    })
  }, [])

  useLayoutEffect(() => {
    if (!aberto) return
    posicionar()
    window.addEventListener('scroll', posicionar, true)
    window.addEventListener('resize', posicionar)
    return () => {
      window.removeEventListener('scroll', posicionar, true)
      window.removeEventListener('resize', posicionar)
    }
  }, [aberto, posicionar])

  useEffect(() => {
    if (!aberto) {
      /* Fechou, a busca some: reabrir com o filtro de antes esconderia opções
         sem dizer por quê. */
      setBusca('')
      return
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setAberto(false)
    }
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

  const vazio = !value

  return (
    <>
      <Moldura>
        <button
          ref={gatilho}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={aberto}
          onClick={() => !disabled && setAberto((v) => !v)}
          className={cn(
            'flex h-12 w-full items-center justify-between gap-2 border-none bg-white p-1 text-left text-sm',
            'focus:border-0 focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50',
            vazio ? 'text-gray-500' : 'text-black',
          )}
        >
          <span className="truncate">{value || placeholder}</span>
          <ChevronDown
            className={cn('mr-1 size-4 shrink-0 text-gray-500 transition-transform', aberto && 'rotate-180')}
          />
        </button>
      </Moldura>

      {aberto &&
        caixa &&
        createPortal(
          <div
            ref={painel}
            style={{ left: caixa.left, top: caixa.top, width: caixa.width, maxHeight: ALTURA_LISTA }}
            className="fixed z-[100] flex flex-col overflow-hidden rounded-md border border-gray-200 bg-white shadow-2xl"
          >
            <div className="border-b border-gray-100 p-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                <input
                  autoFocus
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder={buscaPlaceholder}
                  className="w-full rounded-md border border-gray-200 py-2 pl-8 pr-2 text-sm outline-none transition-colors focus:border-lp-primary"
                />
              </div>
            </div>

            <ul className="min-h-0 flex-1 overflow-y-auto py-1" role="listbox">
              {filtradas.length === 0 && (
                <li className="px-3 py-6 text-center text-sm text-gray-400">Nenhuma opção com esse termo</li>
              )}
              {filtradas.map((o) => (
                <li key={o}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={o === value}
                    onClick={() => {
                      onChange(o)
                      setAberto(false)
                    }}
                    className={cn(
                      'flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-lp-primary/10',
                      o === value ? 'bg-lp-primary/10 font-semibold text-lp-primary-dark' : 'text-gray-700',
                    )}
                  >
                    <span>{o}</span>
                    {o === value && <Check className="size-4 shrink-0 text-lp-primary" />}
                  </button>
                </li>
              ))}
            </ul>

            {opcoes.length > 8 && (
              <p className="border-t border-gray-100 px-3 py-1.5 text-xs text-gray-400">
                {filtradas.length} de {opcoes.length} opções
              </p>
            )}
          </div>,
          document.body,
        )}
    </>
  )
}

/** Subtítulo que separa os blocos dentro de uma etapa. */
export function Subtitulo({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 pt-1">
      <span className="text-sm font-bold uppercase tracking-wide text-lp-primary md:text-base">{children}</span>
      <span className="h-px flex-1 bg-gray-200" />
    </div>
  )
}

/** Caixa de seleção dos aceites. */
export function Aceite({
  checado,
  onChange,
  children,
}: {
  checado: boolean
  onChange: (v: boolean) => void
  children: ReactNode
}) {
  return (
    <label className="flex cursor-pointer flex-row items-start gap-2">
      <input
        type="checkbox"
        checked={checado}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 shrink-0 cursor-pointer rounded-[4px] border border-gray-300 accent-lp-primary"
      />
      <span className="select-none text-sm leading-snug">{children}</span>
    </label>
  )
}

/* ------------------------------------------------------------------ */
/* Botões do rodapé do card                                            */
/* ------------------------------------------------------------------ */

export function BotaoVoltar({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-lp-primary bg-white p-5 py-2 text-lg font-bold text-lp-primary shadow-sm transition-all hover:scale-[1.01] hover:bg-lp-primary/5"
    >
      Voltar
    </button>
  )
}

export function BotaoProximo({
  onClick,
  desabilitado,
  label = 'Próximo',
}: {
  onClick: () => void
  desabilitado: boolean
  label?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={desabilitado}
      className={cn(
        'ml-auto inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md p-5 py-2 text-lg font-bold text-white shadow-sm transition-all',
        desabilitado ? 'cursor-not-allowed bg-lp-primary/40' : 'bg-lp-primary hover:scale-[1.01] hover:bg-lp-primary-dark',
      )}
    >
      {label}
    </button>
  )
}

export function BotaoEnviar({
  onClick,
  desabilitado,
  enviando,
}: {
  onClick: () => void
  desabilitado: boolean
  enviando?: boolean
}) {
  return (
    <button
      type="submit"
      onClick={onClick}
      disabled={desabilitado}
      className={cn(
        'ml-auto inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-md p-5 py-2 text-lg font-bold text-white shadow-sm transition-all',
        desabilitado ? 'cursor-not-allowed bg-lp-green/40' : 'cursor-pointer bg-lp-green hover:scale-[1.01] hover:bg-lp-green-dark',
      )}
    >
      {enviando && (
        <span
          aria-hidden="true"
          className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
        />
      )}
      {enviando ? 'Enviando…' : 'Enviar'}
    </button>
  )
}

/**
 * Par Sim/Não. Começa sem resposta de propósito: quem responde precisa dizer,
 * não deixar no padrão — cada resposta muda o que o sistema vai pedir.
 *
 * Nasceu nas declarações do Sisprouni, na landing; o Portal usa o mesmo controle
 * ao inserir um familiar, e por isso ele mora aqui e não na página.
 */
export function SimNao({
  rotulo,
  descricao,
  valor,
  onChange,
  extra,
}: {
  rotulo: string
  descricao: string
  valor: boolean | null
  onChange: (v: boolean) => void
  extra?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-gray-200 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium leading-tight text-gray-800">{rotulo} *</p>
        <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{descricao}</p>
        {extra && <div className="mt-1">{extra}</div>}
      </div>

      <div className="flex shrink-0 gap-2" role="radiogroup" aria-label={rotulo}>
        {([true, false] as const).map((opcao) => (
          <button
            key={String(opcao)}
            type="button"
            role="radio"
            aria-checked={valor === opcao}
            onClick={() => onChange(opcao)}
            className={cn(
              'w-16 rounded-md border px-3 py-2 text-sm font-bold transition-all',
              valor === opcao
                ? opcao
                  ? 'border-lp-primary bg-lp-primary text-white'
                  : 'border-gray-500 bg-gray-500 text-white'
                : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400',
            )}
          >
            {opcao ? 'Sim' : 'Não'}
          </button>
        ))}
      </div>
    </div>
  )
}
