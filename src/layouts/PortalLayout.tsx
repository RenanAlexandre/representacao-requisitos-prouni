import { type ComponentType, useCallback, useEffect, useState } from 'react'
import { NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom'
import { FileText, Home, IdCard, LogOut, TriangleAlert, UserRound } from 'lucide-react'
import { cn } from '../lib/cn'
import { GlobalBar } from '../components/GlobalBar'
import { GenDocsMark } from '../components/GenDocsMark'
import { useMudancas } from '../lib/tempo-real'
import {
  SessaoInvalida, lerSessao, mascararCpf, meusDados, sair, type MeusDados,
} from '../lib/api'

/** Contexto que as telas filhas recebem via `useOutletContext`. */
export interface ContextoPortal {
  dados: MeusDados
  /** Rebusca o cadastro — usado depois de mexer no grupo familiar. */
  recarregar: () => void
}

/* ==================================================================
 * Portal do Candidato — mesma estética da landing page.
 *
 * A faixa lateral da landing vira aqui o menu: fica recolhida em 64px
 * mostrando só os ícones e, quando o ponteiro entra, abre para 264px
 * revelando os rótulos por extenso. No celular, onde não há hover,
 * ela vira uma barra horizontal com ícone e rótulo lado a lado.
 * ================================================================== */

interface ItemMenu {
  to: string
  label: string
  /** Lucide e a marca do GenDocs convivem: o que importa é aceitar `className`. */
  icone: ComponentType<{ className?: string }>
}

const ITENS: ItemMenu[] = [
  { to: '/aluno/dados', label: 'Dados cadastrais', icone: IdCard },
  { to: '/aluno/coletas', label: 'Coletas de documentos', icone: GenDocsMark },
  { to: '/aluno/termos', label: 'Contrato e termos', icone: FileText },
]

export function PortalLayout() {
  const navegar = useNavigate()
  const [dados, setDados] = useState<MeusDados | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [tentativa, setTentativa] = useState(0)

  const recarregar = useCallback(() => setTentativa((t) => t + 1), [])

  /* Prazo, progresso e status vêm daqui e aparecem em todas as abas do
     portal — inclusive no Início, que não busca nada por conta própria. */
  useMudancas(['candidato', 'coleta', 'grupo'], recarregar)

  const temSessao = !!lerSessao()

  useEffect(() => {
    if (!temSessao) return
    let cancelado = false
    setErro(null)

    meusDados()
      .then((d) => {
        if (!cancelado) setDados(d)
      })
      .catch((falha: unknown) => {
        if (cancelado) return
        if (falha instanceof SessaoInvalida) {
          navegar('/aluno/entrar', { replace: true })
          return
        }
        setErro(falha instanceof Error ? falha.message : String(falha))
      })

    return () => {
      cancelado = true
    }
  }, [temSessao, tentativa, navegar])

  if (!temSessao) return <Navigate to="/aluno/entrar" replace />

  async function encerrar() {
    await sair()
    navegar('/aluno/entrar', { replace: true })
  }

  return (
    <div className="flex min-h-screen flex-col bg-white font-lp">
      <GlobalBar />

      {/* ---------------- Menu recolhível (desktop) ---------------- */}
      {/* Recolhida em 64px (só os ícones), aberta em 264px (ícone + rótulo).
          O `overflow-hidden` corta os rótulos enquanto ela está estreita. */}
      <nav className="group fixed left-0 top-10 z-20 hidden h-[calc(100vh-2.5rem)] w-16 flex-col overflow-hidden bg-lp-primary text-white transition-[width] duration-300 ease-out hover:w-[264px] md:flex">
        <Avatar dados={dados} />

        <div className="mx-3 h-px shrink-0 bg-white/20" />

        <ul className="flex flex-col gap-1 py-3">
          {ITENS.map((i) => (
            <li key={i.to}>
              <ItemLink item={i} />
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={encerrar}
          title="Sair"
          className="mt-auto flex items-center gap-4 px-4 py-3 text-white/75 transition-colors hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-6 w-8 shrink-0" />
          <span className="whitespace-nowrap text-sm font-medium opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            Sair
          </span>
        </button>

        <p className="whitespace-nowrap px-4 pb-4 text-[11px] leading-tight text-white/50 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          Portal do Candidato
          <br />
          UniFatecie · ProUni
        </p>
      </nav>

      {/* ---------------- Barra do celular ----------------
          Sem hover, a barra vira uma faixa horizontal. O início entra aqui
          como item próprio, já que no desktop ele mora no bloco do candidato. */}
      <nav className="sticky top-10 z-20 flex bg-lp-primary md:hidden">
        {[{ to: '/aluno', label: 'Início', icone: Home }, ...ITENS].map((i) => {
          const Icone = i.icone
          return (
            <NavLink
              key={i.to}
              to={i.to}
              end={i.to === '/aluno'}
              className={({ isActive }) =>
                cn(
                  'flex flex-1 flex-col items-center gap-1 px-1 py-2.5 text-[11px] font-medium leading-tight text-white/70 transition-colors',
                  isActive && 'bg-white/20 text-white',
                )
              }
            >
              <Icone className="h-5 w-7 shrink-0" />
              <span className="text-center">{i.label}</span>
            </NavLink>
          )
        })}
      </nav>

      <main className="flex-1 px-4 py-8 md:py-10 md:pl-[92px] md:pr-8">
        <div className="mx-auto w-full max-w-4xl">
          {erro ? (
            <div className="flex flex-col items-start gap-3 rounded-3xl border border-red-200 bg-red-50 p-6">
              <p className="flex items-center gap-2 font-bold text-red-700">
                <TriangleAlert className="size-5" />
                Não foi possível carregar seus dados
              </p>
              <p className="text-sm text-gray-700">{erro}</p>
              <button
                type="button"
                onClick={recarregar}
                className="rounded-md bg-lp-primary px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-lp-primary-dark"
              >
                Tentar de novo
              </button>
            </div>
          ) : !dados ? (
            <div className="flex flex-col items-center gap-3 py-24 text-gray-500">
              <span
                aria-hidden="true"
                className="size-8 animate-spin rounded-full border-2 border-lp-primary/30 border-t-lp-primary"
              />
              <p className="text-sm">Carregando seus dados…</p>
            </div>
          ) : (
            <Outlet context={{ dados, recarregar } satisfies ContextoPortal} />
          )}
        </div>
      </main>

      <footer className="px-6 py-4 text-center text-xs font-medium text-lp-primary md:pl-[92px] md:text-sm">
        © 2026 UniFatecie · Todos os direitos reservados
      </footer>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Topo: a imagem do candidato                                         */
/* ------------------------------------------------------------------ */

/** Iniciais para o avatar, quando não há foto cadastrada. */
function iniciaisDe(nome: string): string {
  return nome
    .split(' ')
    .filter((p) => p.length > 2)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

/** O bloco do candidato é também o caminho de volta ao início do portal. */
function Avatar({ dados }: { dados: MeusDados | null }) {
  const iniciais = dados ? iniciaisDe(dados.nome) : ''

  return (
    <NavLink
      to="/aluno"
      end
      title="Início do portal"
      className="flex shrink-0 items-center gap-3 px-4 py-5 transition-colors hover:bg-white/10"
    >
      {/* Sem foto cadastrada, o círculo mostra as iniciais sobre o ícone de usuário. */}
      <span className="relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/20 ring-2 ring-white/40">
        {iniciais ? (
          <b className="text-xs font-bold tracking-tight text-white">{iniciais}</b>
        ) : (
          <UserRound className="size-5 text-white" />
        )}
      </span>

      <div className="min-w-0 whitespace-nowrap opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <p className="truncate text-sm font-semibold leading-tight text-white">
          {dados?.nome ?? '—'}
        </p>
        <p className="truncate text-[11px] leading-tight text-white/70">
          {dados ? `CPF ${mascararCpf(dados.cpf)}` : ''}
        </p>
      </div>
    </NavLink>
  )
}

/* ------------------------------------------------------------------ */
/* Item do menu                                                        */
/* ------------------------------------------------------------------ */

function ItemLink({ item }: { item: ItemMenu }) {
  const Icone = item.icone
  return (
    <NavLink
      to={item.to}
      title={item.label}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-4 px-4 py-3 transition-colors',
          isActive ? 'bg-white/20 text-white' : 'text-white/75 hover:bg-white/10 hover:text-white',
        )
      }
    >
      {/* h-6 w-8 alinha o Lucide (24x24) e a marca do GenDocs (larga e baixa)
          na mesma coluna de 32px, que é o que sobra com a barra recolhida. */}
      <Icone className="h-6 w-8 shrink-0" />
      <span className="whitespace-nowrap text-sm font-medium opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        {item.label}
      </span>
    </NavLink>
  )
}
