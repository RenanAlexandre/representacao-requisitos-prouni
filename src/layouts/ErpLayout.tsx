import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { PanelLeftClose, PanelLeftOpen, ChevronDown, LogOut } from 'lucide-react'
import { cn } from '../lib/cn'
import { ERP_MENU, localizar } from '../data/erpMenu'
import { GlobalBar } from '../components/GlobalBar'

/**
 * Casco do ERP UniFatecie (System by Inova) — transcrito dos HTMLs salvos em
 * `ERP html e referencias/`.
 *
 * A sidebar tem dois estados, como no original: um trilho de 80px só com
 * ícones e a versão expandida de 280px com rótulos e sub-itens. O botão de
 * fixar acompanha a borda. As cores vêm dos tokens `--primary`, `--hover` e
 * `--active` do bundle real.
 */
const LARGURA_ABERTA = 280
const LARGURA_FECHADA = 80

export function ErpLayout() {
  const location = useLocation()
  const [aberta, setAberta] = useState(true)

  const { grupo, item } = localizar(location.pathname)
  const grupoAtivo = grupo?.label
  const subAtivo = item?.to

  const [expandido, setExpandido] = useState<string | null>(grupoAtivo ?? 'Processos Seletivos')
  useEffect(() => {
    if (grupoAtivo) setExpandido(grupoAtivo)
  }, [grupoAtivo])

  const largura = aberta ? LARGURA_ABERTA : LARGURA_FECHADA

  return (
    <div className="h-screen overflow-hidden bg-erp-bg font-erp text-erp-black">
      <GlobalBar />

      {/* Botão de fixar/desafixar o menu */}
      <button
        onClick={() => setAberta((v) => !v)}
        title={aberta ? 'Recolher menu' : 'Expandir menu'}
        className="fixed z-20 rounded-lg bg-gray-100 p-2 text-gray-500 transition-all duration-300 ease-in-out hover:text-gray-700"
        style={{ left: largura + 8, top: 58 }}
      >
        {aberta ? <PanelLeftClose className="size-5" /> : <PanelLeftOpen className="size-5" />}
      </button>

      {/* Sidebar */}
      <aside
        className="fixed top-10 z-10 flex h-[calc(100vh-2.5rem)] select-none flex-col items-center overflow-hidden border-r border-gray-200 bg-erp-bg transition-all duration-300 ease-in-out"
        style={{ width: largura, padding: 16 }}
      >
        {/* Logo — expandida mostra o lockup; recolhida, só a marca. */}
        <div className="flex w-full items-center justify-start">
          <div className={cn('overflow-hidden', aberta ? 'w-[190px]' : 'w-10')}>
            <img
              src="/UniFatecie-EAD-cursos-1.png"
              alt="UniFatecie"
              className="h-11 w-auto max-w-none object-contain object-left"
            />
          </div>
        </div>

        <ul className="no-scroll-bar mt-12 flex max-h-[75%] w-full flex-col overflow-y-auto">
          {ERP_MENU.map((group) => {
            const Icon = group.icon
            const ativo = group.label === grupoAtivo
            const abertoGrupo = aberta && expandido === group.label && !!group.items?.length

            return (
              <li key={group.label} className="w-full">
                <div className="mb-2">
                  <div
                    onClick={() => group.items?.length && setExpandido(abertoGrupo ? null : group.label)}
                    className={cn(
                      'parent group flex cursor-pointer items-center rounded-xl p-3 transition-colors duration-150',
                      aberta ? 'justify-between px-3' : 'justify-center px-3',
                      ativo
                        ? 'bg-erp-primary text-white'
                        : 'text-erp-primary hover:bg-erp-hover hover:text-white',
                    )}
                  >
                    <span className="flex min-w-0 items-center">
                      <span className="flex h-5 w-7 shrink-0 items-center justify-center">
                        <Icon className="size-[22px]" />
                      </span>
                      {aberta && (
                        <span className="ml-2.5 truncate text-lg font-semibold">{group.label}</span>
                      )}
                    </span>
                    {aberta && group.items?.length ? (
                      <ChevronDown
                        className={cn('size-5 shrink-0 transition-transform', abertoGrupo && 'rotate-180')}
                      />
                    ) : null}
                  </div>

                  {abertoGrupo && (
                    <ul className="mt-1 space-y-1 pl-6 pr-1">
                      {group.items!.map((it) => (
                        <li key={it.to}>
                          <Link
                            to={it.to}
                            className={cn(
                              'block truncate rounded-xl px-4 py-2.5 text-base transition-colors',
                              it.to === subAtivo
                                ? 'bg-erp-active font-semibold text-white'
                                : 'text-erp-black/70 hover:bg-erp-primary/10 hover:text-erp-primary',
                            )}
                          >
                            {it.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            )
          })}
        </ul>

        <div
          className="mb-6 mt-auto h-px bg-erp-active transition-all duration-300"
          style={{ width: aberta ? 220 : 32 }}
        />

        {/* Card do usuário + assinatura */}
        <div className="flex w-full flex-col items-center justify-between gap-4">
          <div
            className={cn(
              'flex items-center rounded-2xl border border-solid border-erp-hover bg-white shadow-erp-user-card transition-all duration-300',
              aberta ? 'h-20 w-full gap-4 px-6' : 'size-14 justify-center',
            )}
          >
            {aberta ? (
              <div className="flex min-w-0 flex-col gap-0.5">
                <p className="truncate text-sm font-semibold text-erp-primary">Renan Ribeiro</p>
                <Link to="/" className="flex items-center gap-2">
                  <span className="cursor-pointer text-sm text-erp-primary underline">Sair do Sistema</span>
                  <LogOut className="size-4 text-erp-primary" />
                </Link>
              </div>
            ) : (
              <Link to="/" className="flex size-full items-center justify-center" title="Sair do Sistema">
                <LogOut className="size-5 text-erp-primary" />
              </Link>
            )}
          </div>

          <div className="flex h-[60px] flex-col items-center justify-center gap-0.5">
            {aberta && (
              <p className="text-xs text-gray-400">
                System by <span className="font-bold text-erp-primary">inova</span>
              </p>
            )}
            <p className="text-[11px] text-gray-400">v1.0.1</p>
          </div>
        </div>
      </aside>

      {/* Conteúdo */}
      <main
        className="h-[calc(100vh-2.5rem)] overflow-y-auto bg-erp-bg p-8 transition-all duration-300 ease-in-out"
        style={{ marginLeft: largura, width: `calc(100vw - ${largura + 20}px)` }}
      >
        <Outlet />
      </main>
    </div>
  )
}
